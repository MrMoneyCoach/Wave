/**
 * Continuous voice listener with an "Alfred" wake word.
 * Uses the Web Speech API (available in Electron / Chromium).
 *
 * Lifecycle:
 *   - `start()` turns on continuous recognition.
 *   - Every final transcript is inspected for "alfred"; anything after the
 *     wake word is delivered as a command via `onCommand`.
 *   - `pause()` / `resume()` temporarily stop listening (used while Alfred
 *     speaks, to avoid the mic picking up its own voice).
 */

type AlfredState = "off" | "listening" | "heard" | "paused";

export type VoiceOptions = {
  onCommand: (text: string) => void;
  onState: (state: AlfredState) => void;
  onInterim?: (text: string) => void;
  onError?: (err: string) => void;
};

const WAKE = "alfred";

type RecognitionCtor = new () => AnyRecognition;
interface AnyRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isVoiceSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export class VoiceListener {
  private rec: AnyRecognition | null = null;
  private desired = false;
  private paused = false;
  private opts: VoiceOptions;

  constructor(opts: VoiceOptions) {
    this.opts = opts;
  }

  start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      this.opts.onError?.("Voice recognition not supported in this environment.");
      return;
    }
    this.desired = true;
    this.launch(Ctor);
  }

  stop() {
    this.desired = false;
    this.rec?.abort();
    this.rec = null;
    this.opts.onState("off");
  }

  pause() {
    if (!this.desired) return;
    this.paused = true;
    this.rec?.abort();
    this.rec = null;
    this.opts.onState("paused");
  }

  resume() {
    if (!this.desired) return;
    this.paused = false;
    const Ctor = getRecognitionCtor();
    if (Ctor) this.launch(Ctor);
  }

  private launch(Ctor: RecognitionCtor) {
    if (this.rec || this.paused) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const transcript = String(res[0].transcript ?? "").trim();
        if (res.isFinal) {
          this.handleFinal(transcript);
        } else {
          interim += transcript + " ";
        }
      }
      if (interim && this.opts.onInterim) this.opts.onInterim(interim.trim());
    };

    rec.onerror = (ev: any) => {
      const err = ev?.error ?? "unknown";
      if (err === "no-speech" || err === "aborted") return;
      this.opts.onError?.(`Voice error: ${err}`);
    };

    rec.onend = () => {
      this.rec = null;
      if (this.desired && !this.paused) {
        // Chromium auto-stops continuous recognition after ~60s; restart.
        setTimeout(() => this.launch(Ctor), 200);
      }
    };

    try {
      rec.start();
      this.rec = rec;
      this.opts.onState("listening");
    } catch (err) {
      // Most commonly: "already started" — ignore and try again shortly.
      setTimeout(() => this.launch(Ctor), 500);
    }
  }

  private handleFinal(transcript: string) {
    const lower = transcript.toLowerCase();
    const idx = lower.indexOf(WAKE);
    if (idx < 0) return;
    const after = transcript.slice(idx + WAKE.length).trim().replace(/^[,.!?;:]+/, "").trim();
    if (!after) {
      // Just said "Alfred" — acknowledge by flashing the heard state.
      this.opts.onState("heard");
      setTimeout(() => {
        if (this.desired && !this.paused) this.opts.onState("listening");
      }, 600);
      return;
    }
    this.opts.onState("heard");
    this.opts.onCommand(after);
    setTimeout(() => {
      if (this.desired && !this.paused) this.opts.onState("listening");
    }, 400);
  }
}

/* -------------------- Text-to-Speech -------------------- */

let preferredVoiceName: string | null = null;
export function setPreferredVoice(name: string | null) {
  preferredVoiceName = name;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (voices.length === 0) return null;
  if (preferredVoiceName) {
    const chosen = voices.find((v) => v.name === preferredVoiceName);
    if (chosen) return chosen;
  }
  const fallback = ["Daniel", "Oliver", "Serena", "Samantha", "Alex", "Google UK English Male"];
  for (const name of fallback) {
    const v = voices.find((vv) => vv.name === name);
    if (v) return v;
  }
  const english = voices.find((v) => v.lang.startsWith("en"));
  return english ?? voices[0];
}

export function speak(
  text: string,
  handlers: { onStart?: () => void; onEnd?: () => void } = {},
): void {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const cleaned = cleanForSpeech(text);
  if (!cleaned) { handlers.onEnd?.(); return; }
  const utter = new SpeechSynthesisUtterance(cleaned);
  const v = pickVoice();
  if (v) utter.voice = v;
  utter.rate = 1.05;
  utter.pitch = 1.0;
  utter.onstart = () => handlers.onStart?.();
  utter.onend = () => handlers.onEnd?.();
  utter.onerror = () => handlers.onEnd?.();
  synth.speak(utter);
}

export function cancelSpeech(): void {
  window.speechSynthesis?.cancel();
}

export function cleanForSpeech(md: string): string {
  const plain = md
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Keep it brief; read up to ~2 sentences.
  const sentences = plain.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return sentences.slice(0, 360);
}
