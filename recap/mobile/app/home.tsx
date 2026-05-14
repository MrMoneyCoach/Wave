import { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Button, Muted } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDate, formatSeconds } from "@/lib/format";
import type { MeetingRow } from "@/lib/types";

export default function HomeScreen() {
  const { supabase, session, signOut } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { data, error } = await supabase
      .from("meetings")
      .select("id, title, status, source, duration_seconds, created_at, error")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setError(error.message);
    else setMeetings((data ?? []) as MeetingRow[]);
  }, [supabase]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Re-poll every 4s while there are in-progress rows.
  useEffect(() => {
    if (!meetings) return;
    const inProgress = meetings.some(
      (m) => m.status !== "ready" && m.status !== "failed",
    );
    if (!inProgress) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [meetings, load]);

  if (!session) {
    router.replace("/sign-in");
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Recap",
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={12}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1 }}>
        <View style={styles.headerArea}>
          <Button label="● Record a meeting" onPress={() => router.push("/record")} />
        </View>

        {meetings === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : meetings.length === 0 ? (
          <View style={styles.center}>
            <Muted>No meetings yet. Tap Record to capture your first one.</Muted>
          </View>
        ) : (
          <FlatList
            data={meetings}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/meeting/${item.id}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.sub}>
                    {formatDate(item.created_at)} · {formatSeconds(item.duration_seconds)} · {sourceLabel(item.source)}
                  </Text>
                </View>
                <StatusPill status={item.status} />
              </Pressable>
            )}
          />
        )}
        {error && (
          <View style={{ padding: spacing.lg }}>
            <Muted>{error}</Muted>
          </View>
        )}
      </View>
    </>
  );
}

function sourceLabel(source: MeetingRow["source"]): string {
  switch (source) {
    case "mobile_app": return "Mobile";
    case "desktop_app": return "Desktop";
    case "browser_record": return "Browser";
    case "upload": return "Upload";
    case "meeting_bot": return "Bot";
  }
}

function StatusPill({ status }: { status: MeetingRow["status"] }) {
  const palette: Record<MeetingRow["status"], { bg: string; fg: string; label: string }> = {
    uploading: { bg: "rgba(11,11,12,0.08)", fg: colors.muted, label: "Uploading" },
    queued: { bg: "rgba(11,11,12,0.08)", fg: colors.muted, label: "Queued" },
    transcribing: { bg: colors.amber, fg: colors.amberInk, label: "Transcribing" },
    transcribed: { bg: colors.amber, fg: colors.amberInk, label: "Transcribed" },
    summarizing: { bg: colors.amber, fg: colors.amberInk, label: "Summarizing" },
    ready: { bg: colors.emerald, fg: colors.emeraldInk, label: "Ready" },
    failed: { bg: colors.redSoft, fg: colors.redInk, label: "Failed" },
  };
  const tone = palette[status];
  return (
    <View style={{ backgroundColor: tone.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
      <Text style={{ color: tone.fg, fontSize: 11, fontWeight: "600" }}>{tone.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  title: { color: colors.ink, fontSize: 15, fontWeight: "500" },
  sub: { color: colors.muted, fontSize: 12 },
});
