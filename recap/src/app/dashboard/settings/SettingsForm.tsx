"use client";

import { useState } from "react";

type Initial = {
  display_name: string;
  slack_webhook_url: string;
  notion_token: string;
  notion_parent_page_id: string;
};

export default function SettingsForm({ initial }: { initial: Initial }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Initial>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  }

  return (
    <div className="mt-6 max-w-xl space-y-8">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Profile</h2>
        <label className="block">
          <span className="text-sm text-ink/70">Display name</span>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            placeholder="Sam Rivera"
            maxLength={80}
            className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Slack</h2>
        <p className="text-xs text-ink/60">
          Create an <strong>Incoming Webhook</strong> in your Slack workspace (Slack &rarr; Apps
          &rarr; Incoming Webhooks), pick a channel, and paste the URL here. &ldquo;Post to
          Slack&rdquo; on any meeting then sends the summary to that channel.
        </p>
        <input
          type="url"
          value={form.slack_webhook_url}
          onChange={(e) => set("slack_webhook_url", e.target.value)}
          placeholder="https://hooks.slack.com/services/T000/B000/xxxx"
          className="block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Notion</h2>
        <p className="text-xs text-ink/60">
          Create an <strong>internal integration</strong> at notion.so/my-integrations, copy its
          token, then share a parent page with the integration. Paste the token and the parent
          page ID (the 32-char hex in the page URL) below — &ldquo;Export to Notion&rdquo; creates
          a child page under it.
        </p>
        <input
          type="password"
          value={form.notion_token}
          onChange={(e) => set("notion_token", e.target.value)}
          placeholder="secret_xxxxxxxx (or ntn_xxxxxxxx)"
          className="block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <input
          type="text"
          value={form.notion_parent_page_id}
          onChange={(e) => set("notion_parent_page_id", e.target.value)}
          placeholder="Parent page ID, e.g. 1a2b3c4d5e6f..."
          className="block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={status === "saving"}
          className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save settings"}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-700">Saved.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
