import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate, formatSeconds } from "@/lib/format";
import type { Meeting } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, status, duration_seconds, source, created_at, error")
    .order("created_at", { ascending: false })
    .limit(100);

  const list = (meetings ?? []) as Pick<
    Meeting,
    "id" | "title" | "status" | "duration_seconds" | "source" | "created_at" | "error"
  >[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your meetings</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/upload"
            className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm font-medium hover:bg-ink/5"
          >
            Upload
          </Link>
          <Link
            href="/dashboard/bot"
            className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm font-medium hover:bg-ink/5"
          >
            Send bot
          </Link>
          <Link
            href="/dashboard/record"
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            Record
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-ink/15 bg-white p-10 text-center">
          <p className="text-sm text-ink/70">
            No meetings yet. Upload your first recording to get a transcript and template summary in minutes.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/dashboard/record"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
            >
              Record a meeting
            </Link>
            <Link
              href="/dashboard/bot"
              className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm font-medium hover:bg-ink/5"
            >
              Send a meeting bot
            </Link>
            <Link
              href="/dashboard/upload"
              className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm font-medium hover:bg-ink/5"
            >
              Upload a file
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
          {list.map((m) => (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-ink/5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.title}</div>
                <div className="mt-0.5 text-xs text-ink/60">
                  {formatDate(m.created_at)} · {formatSeconds(m.duration_seconds)} ·{" "}
                  {sourceLabel(m.source)}
                </div>
              </div>
              <StatusPill status={m.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function sourceLabel(source: Meeting["source"]) {
  switch (source) {
    case "upload":
      return "Upload";
    case "browser_record":
      return "Browser";
    case "desktop_app":
      return "Desktop";
    case "mobile_app":
      return "Mobile";
    case "meeting_bot":
      return "Bot";
  }
}

function StatusPill({ status }: { status: Meeting["status"] }) {
  const map: Record<Meeting["status"], { label: string; className: string }> = {
    uploading: { label: "Uploading", className: "bg-ink/10 text-ink/70" },
    queued: { label: "Queued", className: "bg-ink/10 text-ink/70" },
    transcribing: { label: "Transcribing", className: "bg-amber-100 text-amber-900" },
    transcribed: { label: "Transcribed", className: "bg-amber-100 text-amber-900" },
    summarizing: { label: "Summarizing", className: "bg-amber-100 text-amber-900" },
    ready: { label: "Ready", className: "bg-emerald-100 text-emerald-900" },
    failed: { label: "Failed", className: "bg-red-100 text-red-900" },
  };
  const { label, className } = map[status];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>;
}
