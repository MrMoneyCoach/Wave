import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { useAuth } from "@/lib/auth";
import { Button, Card, ErrorBox, Field, Heading, Muted } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { createMeeting, startTranscription } from "@/lib/api";
import type { Template } from "@/lib/types";

type Phase = "idle" | "preparing" | "recording" | "paused" | "stopping" | "uploading";

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function RecordScreen() {
  const { supabase, session, config } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const accumulatedRef = useRef(0);

  // Load templates once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("templates")
        .select("id, slug, name, description, is_premium")
        .order("is_premium", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error) setError(error.message);
      else {
        const list = (data ?? []) as Template[];
        setTemplates(list);
        const general = list.find((t) => t.slug === "general") ?? list[0];
        if (general) setTemplateId(general.id);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  async function start() {
    setError(null);
    setPhase("preparing");
    accumulatedRef.current = 0;
    setElapsed(0);

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        throw new Error("Microphone permission was denied. Enable it in Settings to record.");
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      startedAtRef.current = Date.now();
      tickerRef.current = setInterval(() => {
        setElapsed(accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000);
      }, 250);

      setPhase("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  async function pause() {
    const rec = recordingRef.current;
    if (!rec) return;
    await rec.pauseAsync();
    accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    stopTicker();
    setPhase("paused");
  }

  async function resume() {
    const rec = recordingRef.current;
    if (!rec) return;
    await rec.startAsync();
    startedAtRef.current = Date.now();
    tickerRef.current = setInterval(() => {
      setElapsed(accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000);
    }, 250);
    setPhase("recording");
  }

  async function stopAndUpload() {
    const rec = recordingRef.current;
    if (!rec) return;
    setPhase("stopping");
    stopTicker();
    if (phase === "recording") {
      accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    }
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) throw new Error("Recording finished but no file was produced.");
      recordingRef.current = null;
      await upload(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  async function upload(uri: string) {
    if (!supabase || !session || !config) {
      setError("Not signed in.");
      setPhase("idle");
      return;
    }
    try {
      setPhase("uploading");
      setProgress("Reading file…");

      // The .m4a default Expo writes is universally accepted by Deepgram.
      const guessedExt = uri.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? "m4a";
      const contentType = guessedExt === "m4a" || guessedExt === "mp4" ? "audio/m4a" : `audio/${guessedExt}`;
      const filename = `${(title || "mobile-recording").replace(/[^a-zA-Z0-9._-]/g, "_")}.${guessedExt}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const buffer = decodeBase64(base64);

      setProgress("Creating meeting…");
      const meeting = await createMeeting({
        webUrl: config.webUrl,
        accessToken: session.access_token,
        title: title || undefined,
        filename,
        templateId: templateId || null,
        source: "mobile_app",
      });

      setProgress("Uploading audio…");
      const { error: upErr } = await supabase.storage
        .from("recordings")
        .upload(meeting.audio_path, buffer, { contentType, upsert: false });
      if (upErr) throw upErr;

      setProgress("Queuing transcription…");
      await startTranscription(config.webUrl, session.access_token, meeting.id);

      // Best-effort cleanup of the local file.
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      router.replace(`/meeting/${meeting.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
      setProgress(null);
    }
  }

  const recording = phase === "recording" || phase === "paused";
  const busy = phase === "preparing" || phase === "stopping" || phase === "uploading";

  return (
    <>
      <Stack.Screen options={{ title: "New recording" }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={styles.status}>
                {phase === "recording" ? "Recording" :
                 phase === "paused" ? "Paused" :
                 phase === "preparing" ? "Preparing…" :
                 phase === "stopping" ? "Stopping…" :
                 phase === "uploading" ? "Uploading…" : "Ready"}
              </Text>
              <Text style={styles.timer}>{formatTime(elapsed)}</Text>
            </View>
            <View style={[styles.dot, phase === "recording" && styles.dotLive]} />
          </View>

          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {!recording && (
              <Button label="Start recording" onPress={start} loading={phase === "preparing"} disabled={!templateId || busy} />
            )}
            {phase === "recording" && (
              <Button label="Pause" variant="secondary" onPress={pause} />
            )}
            {phase === "paused" && (
              <Button label="Resume" variant="secondary" onPress={resume} />
            )}
            {recording && (
              <Button label="Stop & transcribe" variant="danger" onPress={stopAndUpload} loading={busy} />
            )}
          </View>

          {progress && (
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", marginTop: spacing.sm }}>
              <ActivityIndicator size="small" color={colors.muted} />
              <Muted>{progress}</Muted>
            </View>
          )}
          {error && <ErrorBox>{error}</ErrorBox>}
        </Card>

        <View style={{ gap: spacing.md }} pointerEvents={recording || busy ? "none" : "auto"}>
          <Heading>Details</Heading>
          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Coffee with Sam"
            editable={!recording && !busy}
          />
          <View style={{ gap: spacing.xs }}>
            <Text style={styles.label}>Summary template</Text>
            <View style={styles.templatesWrap}>
              {templates.map((t) => (
                <TemplateChip
                  key={t.id}
                  selected={t.id === templateId}
                  label={t.name + (t.is_premium ? " (Pro)" : "")}
                  onPress={() => setTemplateId(t.id)}
                />
              ))}
            </View>
            {templates.find((t) => t.id === templateId)?.description && (
              <Muted>{templates.find((t) => t.id === templateId)?.description}</Muted>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function TemplateChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : null,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  status: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  timer: {
    fontSize: 42,
    fontVariant: ["tabular-nums"],
    color: colors.ink,
    marginTop: spacing.xs,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(11,11,12,0.2)",
  },
  dotLive: { backgroundColor: colors.red },
  label: { fontSize: 12, fontWeight: "600", color: colors.ink },
  templatesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper2,
    color: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    fontSize: 13,
    overflow: "hidden",
  },
  chipSelected: {
    backgroundColor: colors.ink,
    color: colors.paper,
    borderColor: colors.ink,
  },
});
