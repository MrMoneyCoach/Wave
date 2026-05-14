"use client";

import { useState } from "react";
import Link from "next/link";
import type { IntegrationStatus } from "@/lib/types";

type Props = {
  meetingId: string;
  integrations: IntegrationStatus;
  hasSummary: boolean;
};

export default function ExportButtons({ meetingId, integrations, hasSummary }: Props) {
  const [busy, setBusy] = useState<"slack" | "notion" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const anyConfigured = integrations.slack || integrations.notion;

  async function exportTo(target: "slack" | "notion") {
    setBusy(target);
    setMessage(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Export failed");
      setMessage({
        kind: "ok",
        text: target === "slack" ? "Posted to Slack." : `Created Notion page.`,
      });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-10 border-t border-ink/10 pt-6">
      <h2 className="text-sm font-semibold">Export</h2>
      {!hasSummary ? (
        <p className="mt-2 text-sm text-ink/60">
          The summary needs to finish generating before you can export it.
        </p>
      ) : !anyConfigured ? (
        <p className="mt-2 text-sm text-ink/60">
          Connect Slack or Notion in{" "}
          <Link href="/dashboard/settings" className="underline hover:text-ink">
            Settings
          </Link>{" "}
          to push this summary out with one click.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {integrations.slack && (
            <button
              onClick={() => exportTo("slack")}
              disabled={busy !== null}
              className="rounded-md border border-ink/15 bg-white px-4 py-1.5 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
            >
              {busy === "slack" ? "Posting…" : "Post to Slack"}
            </button>
          )}
          {integrations.notion && (
            <button
              onClick={() => exportTo("notion")}
              disabled={busy !== null}
              className="rounded-md border border-ink/15 bg-white px-4 py-1.5 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
            >
              {busy === "notion" ? "Exporting…" : "Export to Notion"}
            </button>
          )}
          {(!integrations.slack || !integrations.notion) && (
            <Link href="/dashboard/settings" className="text-xs text-ink/50 hover:text-ink">
              Connect {!integrations.slack ? "Slack" : "Notion"} →
            </Link>
          )}
        </div>
      )}
      {message && (
        <p className={`mt-2 text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
