"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Template } from "@/lib/types";

type Props = { templates: Template[] };

export default function UploadForm({ templates }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<string>(
    templates.find((t) => t.slug === "general")?.id ?? templates[0]?.id ?? "",
  );
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);

    try {
      setProgress("Creating meeting…");
      const createRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          filename: file.name,
          template_id: templateId || null,
          source: "upload",
        }),
      });
      const created: { id: string; audio_path: string; error?: string } = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to create meeting");

      setProgress("Uploading audio…");
      const supabase = supabaseBrowser();
      const { error: upErr } = await supabase.storage
        .from("recordings")
        .upload(created.audio_path, file, {
          contentType: file.type || "application/octet-stream",
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Audio or video file</span>
        <input
          type="file"
          required
          accept="audio/*,video/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
          }}
          className="mt-1 block w-full text-sm"
        />
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
        disabled={!file || progress !== null}
        className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
      >
        {progress ?? "Upload & transcribe"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
