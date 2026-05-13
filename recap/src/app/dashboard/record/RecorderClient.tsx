"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Template } from "@/lib/types";

type Props = { templates: Template[] };

type Phase = "idle" | "preparing" | "recording" | "paused" | "stopping" | "uploading";

type Inputs = {
  display: MediaStream | null;
  mic: MediaStream | null;
};

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

export default function RecorderClient({ templates }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<string>(
    templates.find((t) => t.slug === "general")?.id ?? templates[0]?.id ?? "",
  );
  const [includeSystem, setIncludeSystem] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [supportsDisplay, setSupportsDisplay] = useState(true);

  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputsRef = useRef<Inputs>({ display: null, mic: null });
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const mimeRef = useRef<string>("");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const hasDisplay = !!(navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices);
    setSupportsDisplay(hasDisplay);
    if (!hasDisplay) setIncludeSystem(false);
  }, []);

  function cleanupStreams() {
    inputsRef.current.display?.getTracks().forEach((t) => t.stop());
    inputsRef.current.mic?.getTracks().forEach((t) => t.stop());
    inputsRef.current = { display: null, mic: null };
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }

  async function start() {
    setError(null);
    setPhase("preparing");
    chunksRef.current = [];
    accumulatedRef.current = 0;
    setElapsed(0);

    try {
      let display: MediaStream | null = null;
      let mic: MediaStream | null = null;

      if (includeSystem) {
        // getDisplayMedia requires asking for video too; we discard the video track.
        // On Chrome / Edge the user must tick "Share audio" in the picker.
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
            "No system audio captured. In the screen-share dialog, choose a tab or window and tick “Share tab/system audio”.",
          );
        }
        // We don't need the video — drop it to avoid recording it.
        display.getVideoTracks().forEach((t) => t.stop());
      }

      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      inputsRef.current = { display, mic };

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();

      if (display && display.getAudioTracks().length > 0) {
        const src = ctx.createMediaStreamSource(new MediaStream(display.getAudioTracks()));
        src.connect(dest);
      }
      if (mic && mic.getAudioTracks().length > 0) {
        const src = ctx.createMediaStreamSource(new MediaStream(mic.getAudioTracks()));
        src.connect(dest);
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
        setError((e as unknown as { error?: { message?: string } }).error?.message ?? "Recorder error");
      };
      recorderRef.current = rec;

      // If the user stops screen-share via the browser chrome, end the recording.
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
      cleanupStreams();
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
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
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
    cleanupStreams();
    await upload();
  }

  async function upload() {
    try {
      setPhase("uploading");
      setProgress("Packaging recording…");
      const mime = mimeRef.current || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      const filename = `${(title || "browser-recording").replace(/[^a-zA-Z0-9._-]/g, "_")}.${extensionFor(mime)}`;
      const file = new File([blob], filename, { type: mime });

      setProgress("Creating meeting…");
      const createRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          filename,
          template_id: templateId || null,
          source: "browser_record",
        }),
      });
      const created: { id: string; audio_path: string; error?: string } = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to create meeting");

      setProgress("Uploading audio…");
      const supabase = supabaseBrowser();
      const { error: upErr } = await supabase.storage
        .from("recordings")
        .upload(created.audio_path, file, {
          contentType: mime,
          upsert: false,
        });
      if (upErr) throw upErr;

      setProgress("Queuing transcription…");
      const trRes = await fetch(`/api/meetings/${created.id}/transcribe`, { method: "POST" });
      if (!trRes.ok) {
        const j = await trRes.json().catch(() => ({}));
        throw new Error(j.error || "Failed to start transcription");
      }
      router.push(`/meetings/${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase("idle");
      setProgress(null);
    }
  }

  useEffect(() => {
    return () => {
      cleanupStreams();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const recording = phase === "recording" || phase === "paused";
  const busy = phase === "preparing" || phase === "stopping" || phase === "uploading";

  return (
    <div className="mt-6 max-w-xl space-y-5">
      <div className="rounded-lg border border-ink/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-ink/50">
              {phase === "recording" ? "Recording" : phase === "paused" ? "Paused" : "Ready"}
            </div>
            <div className="mt-1 font-mono text-3xl tabular-nums">{formatTime(elapsed)}</div>
          </div>
          <div className={`h-3 w-3 rounded-full ${phase === "recording" ? "animate-pulse bg-red-500" : "bg-ink/20"}`} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {!recording && (
            <button
              onClick={start}
              disabled={busy}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
            >
              {phase === "preparing" ? "Preparing…" : "Start recording"}
            </button>
          )}
          {phase === "recording" && (
            <button
              onClick={pause}
              className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm font-medium hover:bg-ink/5"
            >
              Pause
            </button>
          )}
          {phase === "paused" && (
            <button
              onClick={resume}
              className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm font-medium hover:bg-ink/5"
            >
              Resume
            </button>
          )}
          {recording && (
            <button
              onClick={stop}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Stop &amp; transcribe
            </button>
          )}
        </div>

        {progress && <p className="mt-3 text-xs text-ink/60">{progress}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <fieldset className="space-y-4" disabled={recording || busy}>
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Customer call — Acme Co"
            className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Summary template</span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-50"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.is_premium ? " (Pro)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeSystem}
            onChange={(e) => setIncludeSystem(e.target.checked)}
            disabled={!supportsDisplay}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Capture other participants&apos; audio</span>
            <span className="mt-0.5 block text-xs text-ink/60">
              {supportsDisplay
                ? "Your browser will ask you to share a tab or screen — tick “Share audio” so we can hear the rest of the call."
                : "Your browser doesn’t support capturing system audio. Only your microphone will be recorded. Try Chrome or Edge for full capture."}
            </span>
          </span>
        </label>
      </fieldset>

      <details className="text-sm text-ink/60">
        <summary className="cursor-pointer">Tips</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            On a Zoom/Meet/Teams call, choose <em>the meeting tab</em> in the share dialog — the audio comes through clearer than &ldquo;Entire screen.&rdquo;
          </li>
          <li>Wear headphones to keep your own voice out of the system-audio side of the mix.</li>
          <li>Keep this tab focused or in the background — most browsers throttle recording in a minimised window.</li>
        </ul>
      </details>
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
