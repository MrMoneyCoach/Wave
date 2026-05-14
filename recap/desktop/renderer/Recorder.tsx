import { useEffect, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Template } from "./supabase";

type Props = {
  supabase: SupabaseClient;
  session: Session;
  webUrl: string;
};

type Phase = "idle" | "preparing" | "recording" | "paused" | "stopping" | "uploading" | "done";

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function extensionFor(mime: string): string {
  if (mime.startsWith("audio/webm")) return "webm";
  if (mime.startsWith("audio/mp4")) return "m4a";
  return "bin";
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function Recorder({ supabase, session, webUrl }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [includeSystem, setIncludeSystem] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [lastMeetingId, setLastMeetingId] = useState<string | null>(null);

  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const mimeRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, slug, name, description, is_premium")
        .order("is_premium", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      const list = (data ?? []) as Template[];
      setTemplates(list);
      const general = list.find((t) => t.slug === "general") ?? list[0];
      if (general) setTemplateId(general.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function cleanup() {
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      cleanup();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch {}
      }
    };
  }, []);

  async function start() {
    setError(null);
    setLastMeetingId(null);
    setProgress(null);
    setPhase("preparing");
    chunksRef.current = [];
    accumulatedRef.current = 0;
    setElapsed(0);

    try {
      let display: MediaStream | null = null;
      let mic: MediaStream | null = null;

      if (includeSystem) {
        // Electron's setDisplayMediaRequestHandler in main.ts auto-selects the
        // primary screen and asks for loopback audio, so the user just sees
        // the OS-level capture permission (once, on macOS).
        display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (display.getAudioTracks().length === 0) {
          display.getTracks().forEach((t) => t.stop());
          throw new Error(
            "Couldn't capture system audio. On macOS, accept the screen-recording prompt and try again.",
          );
        }
        display.getVideoTracks().forEach((t) => t.stop());
      }

      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (display) streamsRef.current.push(display);
      streamsRef.current.push(mic);

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      if (display && display.getAudioTracks().length > 0) {
        ctx.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(dest);
      }
      if (mic.getAudioTracks().length > 0) {
        ctx.createMediaStreamSource(new MediaStream(mic.getAudioTracks())).connect(dest);
      }

      const mime = pickMimeType();
      mimeRef.current = mime;
      const rec = new MediaRecorder(
        dest.stream,
        mime ? { mimeType: mime, audioBitsPerSecond: 96_000 } : undefined,
      );
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onerror = (e) => {
        const err = (e as unknown as { error?: { message?: string } }).error;
        setError(err?.message ?? "Recorder error");
      };
      recorderRef.current = rec;

      display?.getAudioTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          if (recorderRef.current?.state === "recording" || recorderRef.current?.state === "paused") {
            stop().catch(() => {});
          }
        });
      });

      rec.start(1000);
      startedAtRef.current = performance.now();
      tickerRef.current = setInterval(() => {
        setElapsed(accumulatedRef.current + (performance.now() - startedAtRef.current) / 1000);
      }, 250);
      setPhase("recording");
    } catch (e) {
      cleanup();
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  function pause() {
    if (recorderRef.current?.state !== "recording") return;
    recorderRef.current.pause();
    accumulatedRef.current += (performance.now() - startedAtRef.current) / 1000;
    setPhase("paused");
  }

  function resume() {
    if (recorderRef.current?.state !== "paused") return;
    recorderRef.current.resume();
    startedAtRef.current = performance.now();
    setPhase("recording");
  }

  async function stop() {
    if (!recorderRef.current) return;
    setPhase("stopping");
    if (recorderRef.current.state === "recording") {
      accumulatedRef.current += (performance.now() - startedAtRef.current) / 1000;
    }
    await new Promise<void>((resolve) => {
      const rec = recorderRef.current!;
      rec.onstop = () => resolve();
      try { rec.stop(); } catch { resolve(); }
    });
    cleanup();
    await upload();
  }

  async function upload() {
    try {
      setPhase("uploading");
      setProgress("Packaging recording…");
      const mime = mimeRef.current || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      const baseName = (title || "desktop-recording").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${baseName}.${extensionFor(mime)}`;

      setProgress("Creating meeting…");
      const accessToken = session.access_token;
      const createRes = await fetch(`${webUrl.replace(/\/$/, "")}/api/meetings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: title || undefined,
          filename,
          template_id: templateId || null,
          source: "desktop_app",
        }),
      });
      const created: { id: string; audio_path: string; error?: string } = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to create meeting");

      setProgress("Uploading audio…");
      const { error: upErr } = await supabase.storage
        .from("recordings")
        .upload(created.audio_path, blob, { contentType: mime, upsert: false });
      if (upErr) throw upErr;

      setProgress("Queuing transcription…");
      const trRes = await fetch(`${webUrl.replace(/\/$/, "")}/api/meetings/${created.id}/transcribe`, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!trRes.ok) {
        const j = await trRes.json().catch(() => ({}));
        throw new Error(j.error || "Failed to start transcription");
      }

      setLastMeetingId(created.id);
      setProgress("Done — transcript will be ready on the web shortly.");
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
      setProgress(null);
    }
  }

  function newRecording() {
    setPhase("idle");
    setProgress(null);
    setElapsed(0);
    accumulatedRef.current = 0;
    chunksRef.current = [];
    setTitle("");
    setLastMeetingId(null);
  }

  const recording = phase === "recording" || phase === "paused";
  const busy = phase === "preparing" || phase === "stopping" || phase === "uploading";
  const locked = recording || busy;

  return (
    <div className="col">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="status">
              {phase === "recording" ? "Recording" :
               phase === "paused" ? "Paused" :
               phase === "preparing" ? "Preparing…" :
               phase === "stopping" ? "Stopping…" :
               phase === "uploading" ? "Uploading…" :
               phase === "done" ? "Saved" : "Ready"}
            </div>
            <div className="timer" style={{ marginTop: 6 }}>{formatTime(elapsed)}</div>
          </div>
          <div className={`dot ${phase === "recording" ? "live" : ""}`} />
        </div>

        <div className="spacer" />

        <div className="row">
          {!recording && phase !== "done" && (
            <button onClick={start} disabled={busy || !templateId}>
              {phase === "preparing" ? "Preparing…" : "Start recording"}
            </button>
          )}
          {phase === "recording" && (
            <button className="secondary" onClick={pause}>Pause</button>
          )}
          {phase === "paused" && (
            <button className="secondary" onClick={resume}>Resume</button>
          )}
          {recording && (
            <button className="danger" onClick={stop}>Stop & transcribe</button>
          )}
          {phase === "done" && (
            <>
              <button onClick={newRecording}>New recording</button>
              {lastMeetingId && (
                <button
                  className="secondary"
                  onClick={() =>
                    window.recap.openExternal(
                      `${webUrl.replace(/\/$/, "")}/meetings/${lastMeetingId}`,
                    )
                  }
                >
                  Open on web
                </button>
              )}
            </>
          )}
        </div>

        {progress && <div className="hint">{progress}</div>}
        {error && <><div className="spacer" /><div className="error">{error}</div></>}
      </div>

      <fieldset className="col" style={{ border: "none", padding: 0, margin: 0 }} disabled={locked || phase === "done"}>
        <label className="label">Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Customer call — Acme Co" />
        </label>
        <label className="label">Summary template
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.is_premium ? " (Pro)" : ""}
              </option>
            ))}
          </select>
          {templates.find((t) => t.id === templateId)?.description && (
            <div className="hint">{templates.find((t) => t.id === templateId)?.description}</div>
          )}
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={includeSystem}
            onChange={(e) => setIncludeSystem(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            <strong>Capture other participants&apos; audio</strong>
            <div className="hint" style={{ marginTop: 2 }}>
              Uses native screen-capture audio. On macOS you&apos;ll see a system permission prompt the first time.
            </div>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
