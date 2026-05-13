import { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "@/lib/auth";
import { Button, Card, ErrorBox, Heading, Muted } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDate, formatSeconds } from "@/lib/format";
import type { MeetingRow, MeetingStatus } from "@/lib/types";

type Segment = {
  id: number;
  speaker: number;
  start_seconds: number;
  text: string;
};

type FullMeeting = MeetingRow & {
  summary: Record<string, string> | null;
  template_id: string | null;
};

type TemplateMeta = {
  id: string;
  name: string;
  sections: { key: string; label: string }[];
};

const POLL: MeetingStatus[] = ["uploading", "queued", "transcribing", "transcribed", "summarizing"];

export default function MeetingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { supabase, config } = useAuth();
  const [meeting, setMeeting] = useState<FullMeeting | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [template, setTemplate] = useState<TemplateMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !id) return;
    const { data, error } = await supabase
      .from("meetings")
      .select("id, title, status, source, duration_seconds, created_at, error, summary, template_id")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setMeeting(data as FullMeeting);

    const segPromise = supabase
      .from("segments")
      .select("id, speaker, start_seconds, text")
      .eq("meeting_id", id)
      .order("start_seconds", { ascending: true })
      .limit(200);

    const tplPromise = data?.template_id
      ? supabase
          .from("templates")
          .select("id, name, sections")
          .eq("id", data.template_id)
          .single()
      : Promise.resolve({ data: null, error: null });

    const [{ data: segs }, { data: tpl }] = await Promise.all([segPromise, tplPromise]);
    setSegments((segs ?? []) as Segment[]);
    setTemplate((tpl ?? null) as TemplateMeta | null);
  }, [supabase, id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!meeting) return;
    if (!POLL.includes(meeting.status)) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [meeting, load]);

  if (!meeting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
        {error && <ErrorBox>{error}</ErrorBox>}
      </View>
    );
  }

  const inProgress = POLL.includes(meeting.status);
  const summaryEntries = (template?.sections ?? [])
    .map((s) => [s.label, meeting.summary?.[s.key] ?? null] as const)
    .filter(([, value]) => value && value.trim().toLowerCase() !== "none");

  return (
    <>
      <Stack.Screen options={{ title: meeting.title }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Heading>{meeting.title}</Heading>
          <Muted>
            {formatDate(meeting.created_at)} · {formatSeconds(meeting.duration_seconds)}
          </Muted>
        </View>

        {inProgress && (
          <Card>
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              <ActivityIndicator color={colors.ink} />
              <Text style={{ color: colors.ink, fontSize: 14 }}>{processingMessage(meeting.status)}</Text>
            </View>
          </Card>
        )}

        {meeting.status === "failed" && (
          <ErrorBox>Something went wrong: {meeting.error ?? "unknown error"}</ErrorBox>
        )}

        {summaryEntries.length > 0 && (
          <Card>
            <Heading>Summary</Heading>
            {template && <Muted>{template.name}</Muted>}
            {summaryEntries.map(([label, value]) => (
              <View key={label} style={{ gap: 4 }}>
                <Text style={styles.sectionLabel}>{label}</Text>
                <Text style={styles.sectionBody}>{value}</Text>
              </View>
            ))}
          </Card>
        )}

        {segments.length > 0 && (
          <Card>
            <Heading>Transcript</Heading>
            <Muted>First 200 utterances — open on web for the full transcript and to rename speakers.</Muted>
            <View style={{ gap: spacing.sm }}>
              {segments.map((s) => (
                <View key={s.id} style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Text style={[styles.speakerChip, { backgroundColor: speakerColor(s.speaker) }]}>
                    {`Speaker ${s.speaker + 1}`}
                  </Text>
                  <Text style={styles.utterance}>{s.text}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {config && (
          <Button
            label="Open on web"
            variant="secondary"
            onPress={() => Linking.openURL(`${config.webUrl.replace(/\/$/, "")}/meetings/${meeting.id}`)}
          />
        )}
      </ScrollView>
    </>
  );
}

function processingMessage(status: MeetingStatus): string {
  switch (status) {
    case "uploading": return "Audio is still uploading…";
    case "queued": return "Queued for transcription…";
    case "transcribing": return "Transcribing — this usually takes ~10% of the recording length.";
    case "transcribed": return "Transcript ready, generating summary…";
    case "summarizing": return "Generating summary…";
    default: return "Working…";
  }
}

const SPEAKER_COLORS = ["#fef3c7", "#dbeafe", "#dcfce7", "#fee2e2", "#ede9fe", "#fed7aa", "#ccfbf1"];
function speakerColor(speaker: number) {
  return SPEAKER_COLORS[speaker % SPEAKER_COLORS.length];
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.ink, marginTop: 6 },
  sectionBody: { fontSize: 14, color: colors.ink, lineHeight: 21 },
  speakerChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    fontSize: 10,
    fontWeight: "600",
    color: colors.ink,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  utterance: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 19 },
});
