"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Template } from "@/lib/types";

type Props = { templates: Template[] };

function detectPlatform(url: string): string | null {
  try {
    const u = new URL(url);
    if (/zoom\.us$/i.test(u.hostname) || /zoom\.us$/i.test(u.hostname.replace(/^.*\./, ""))) return "Zoom";
    if (/meet\.google\.com$/i.test(u.hostname)) return "Google Meet";
    if (/teams\.microsoft\.com$/i.test(u.hostname) || /teams\.live\.com$/i.test(u.hostname)) return "Microsoft Teams";
    return null;
  } catch {
    return null;
  }
}

export default function BotForm({ templates }: Props) {
  const router = useRouter();
  const [meetingUrl, setMeetingUrl] = useState("");
  const [title, setTitle] = useState("");
  const [botName, setBotName] = useState("Recap");
  const [templateId, setTemplateId] = useState<string>(
    templates.find((t) => t.slug === "general")?.id ?? templates[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platform = detectPlatform(meetingUrl);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meeting_url: meetingUrl.trim(),
          title: title || undefined,
          template_id: templateId || null,
          bot_name: botName || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to dispatch bot");
      router.push(`/meetings/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Meeting link</span>
        <input
          type="url"
          required
          autoFocus
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-def-ghi"
          className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <p className="mt-1 text-xs text-ink/60">
          {meetingUrl
            ? platform
              ? `Detected: ${platform}.`
              : "Heads up — that doesn't look like a Zoom/Meet/Teams URL. Recall will try anyway."
            : "Paste a Zoom, Google Meet, or Microsoft Teams link."}
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Customer call — Acme Co"
          className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Bot display name</span>
        <input
          type="text"
          value={botName}
          maxLength={80}
          onChange={(e) => setBotName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <p className="mt-1 text-xs text-ink/60">
          What other participants see in the call. &ldquo;Recap&rdquo; is a sensible default.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Summary template</span>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.is_premium ? " (Pro)" : ""}
            </option>
          ))}
        </select>
        {templates.find((t) => t.id === templateId)?.description && (
          <p className="mt-1 text-xs text-ink/60">
            {templates.find((t) => t.id === templateId)?.description}
          </p>
        )}
      </label>

      <button
        type="submit"
        disabled={busy || !meetingUrl}
        className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Dispatching…" : "Send the bot"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-ink/50">
        The host may need to admit &ldquo;{botName || "Recap"}&rdquo; from the waiting room. The
        bot leaves automatically when the meeting ends; you can also stop it early from the
        meeting page.
      </p>
    </form>
  );
}
