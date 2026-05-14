export function formatSeconds(s: number | null | undefined) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  if (m < 60) return `${m}:${sec}`;
  const h = Math.floor(m / 60);
  const remMin = (m % 60).toString().padStart(2, "0");
  return `${h}:${remMin}:${sec}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SPEAKER_PALETTE = [
  "bg-amber-100 text-amber-900",
  "bg-sky-100 text-sky-900",
  "bg-emerald-100 text-emerald-900",
  "bg-rose-100 text-rose-900",
  "bg-violet-100 text-violet-900",
  "bg-orange-100 text-orange-900",
  "bg-teal-100 text-teal-900",
];

export function speakerColor(speaker: number) {
  return SPEAKER_PALETTE[speaker % SPEAKER_PALETTE.length];
}

export function speakerName(
  speaker: number,
  aliases: Record<string, string> | null | undefined,
) {
  return aliases?.[String(speaker)] || `Speaker ${speaker + 1}`;
}
