"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Meeting, Segment, Template, TemplateSection } from "@/lib/types";
import { formatDate, formatSeconds, speakerColor, speakerName } from "@/lib/format";

type Props = {
  meeting: Meeting;
  segments: Segment[];
  templates: Template[];
  speakerAliases: Record<string, string>;
};

const POLL_STATUSES: Meeting["status"][] = [
  "uploading",
  "queued",
  "transcribing",
  "transcribed",
  "summarizing",
];

export default function MeetingView({ meeting, segments, templates, speakerAliases: initialAliases }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"summary" | "transcript">("summary");
  const [aliases, setAliases] = useState(initialAliases);
  const [editingSpeaker, setEditingSpeaker] = useState<number | null>(null);
  const [resummarizing, setResummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll while processing.
  useEffect(() => {
    if (!POLL_STATUSES.includes(meeting.status)) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [meeting.status, router]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === meeting.template_id) ?? null,
    [templates, meeting.template_id],
  );

  const speakerCount = useMemo(() => {
    const s = new Set<number>();
    segments.forEach((seg) => s.add(seg.speaker));
    return s.size;
  }, [segments]);

  async function saveAlias(speaker: number, name: string) {
    const next = { ...aliases };
    if (name.trim()) next[String(speaker)] = name.trim();
    else delete next[String(speaker)];
    setAliases(next);
    setEditingSpeaker(null);

    const supabase = supabaseBrowser();
    await supabase.from("profiles").update({ speaker_aliases: next }).eq("id", meeting.owner_id);
  }

  async function changeTemplate(templateId: string) {
    setResummarizing(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/summarize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to re-summarize");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResummarizing(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {formatDate(meeting.created_at)} · {formatSeconds(meeting.duration_seconds)} ·{" "}
            {speakerCount} {speakerCount === 1 ? "speaker" : "speakers"}
          </p>
        </div>
        <StatusBadge status={meeting.status} />
      </div>

      {meeting.status === "failed" && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          Something went wrong: {meeting.error ?? "unknown error"}
        </div>
      )}

      {POLL_STATUSES.includes(meeting.status) && (
        <div className="mt-4 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70">
          {processingMessage(meeting.status)}
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-ink/10">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Summary
        </TabButton>
        <TabButton active={tab === "transcript"} onClick={() => setTab("transcript")}>
          Transcript
        </TabButton>
      </div>

      {tab === "summary" ? (
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_240px]">
          <div>
            {activeTemplate && meeting.summary ? (
              <SummaryDisplay sections={activeTemplate.sections} summary={meeting.summary} />
            ) : meeting.status === "ready" ? (
              <p className="text-sm text-ink/60">No summary yet. Pick a template on the right.</p>
            ) : (
              <p className="text-sm text-ink/60">Summary will appear here when processing finishes.</p>
            )}
          </div>
          <aside>
            <div className="text-xs font-medium uppercase tracking-widest text-ink/50">Template</div>
            <select
              value={meeting.template_id ?? ""}
              onChange={(e) => changeTemplate(e.target.value)}
              disabled={resummarizing || POLL_STATUSES.includes(meeting.status)}
              className="mt-2 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
            >
              <option value="" disabled>
                Choose a template…
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_premium ? " (Pro)" : ""}
                </option>
              ))}
            </select>
            {activeTemplate?.description && (
              <p className="mt-2 text-xs text-ink/60">{activeTemplate.description}</p>
            )}
            {resummarizing && <p className="mt-2 text-xs text-ink/60">Regenerating summary…</p>}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </aside>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {segments.length === 0 && (
            <p className="text-sm text-ink/60">Transcript will appear here when processing finishes.</p>
          )}
          {segments.map((s) => (
            <div key={s.id} className="flex items-start gap-3">
              <span className="w-12 shrink-0 pt-0.5 text-xs text-ink/40">
                {formatSeconds(s.start_seconds)}
              </span>
              <div className="flex-1">
                {editingSpeaker === s.speaker ? (
                  <input
                    autoFocus
                    defaultValue={speakerName(s.speaker, aliases)}
                    onBlur={(e) => saveAlias(s.speaker, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingSpeaker(null);
                    }}
                    className="rounded border border-ink/30 bg-white px-1 py-0.5 text-xs"
                  />
                ) : (
                  <button
                    onClick={() => setEditingSpeaker(s.speaker)}
                    title="Click to rename"
                    className={`rounded px-2 py-0.5 text-xs font-medium ${speakerColor(s.speaker)}`}
                  >
                    {speakerName(s.speaker, aliases)}
                  </button>
                )}
                <p className="mt-1 text-sm leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryDisplay({
  sections,
  summary,
}: {
  sections: TemplateSection[];
  summary: Record<string, string>;
}) {
  return (
    <div className="prose-recap">
      {sections.map((sec) => {
        const value = summary[sec.key];
        if (!value || value.trim().toLowerCase() === "none") return null;
        return (
          <section key={sec.key} className="mt-2">
            <h2>{sec.label}</h2>
            <MarkdownBlock text={value} />
          </section>
        );
      })}
    </div>
  );
}

/** Tiny, dependency-free renderer good enough for the bulleted markdown Claude returns. */
function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let i = 0;

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {bullets.map((b, idx) => (
            <li key={idx}>{renderInline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      bullets.push(line.slice(2));
    } else {
      flush();
      blocks.push(<p key={`p-${i++}`}>{renderInline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm ${
        active ? "border-ink font-medium" : "border-transparent text-ink/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const styles: Record<Meeting["status"], string> = {
    uploading: "bg-ink/10 text-ink/70",
    queued: "bg-ink/10 text-ink/70",
    transcribing: "bg-amber-100 text-amber-900",
    transcribed: "bg-amber-100 text-amber-900",
    summarizing: "bg-amber-100 text-amber-900",
    ready: "bg-emerald-100 text-emerald-900",
    failed: "bg-red-100 text-red-900",
  };
  const labels: Record<Meeting["status"], string> = {
    uploading: "Uploading",
    queued: "Queued",
    transcribing: "Transcribing",
    transcribed: "Transcribed",
    summarizing: "Summarizing",
    ready: "Ready",
    failed: "Failed",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function processingMessage(status: Meeting["status"]) {
  switch (status) {
    case "uploading":
      return "Audio is still uploading…";
    case "queued":
      return "Queued for transcription…";
    case "transcribing":
      return "Transcribing with Deepgram Nova-3 — this usually takes ~10% of the meeting length.";
    case "transcribed":
      return "Transcript ready, generating summary…";
    case "summarizing":
      return "Generating summary…";
    default:
      return "Working…";
  }
}
