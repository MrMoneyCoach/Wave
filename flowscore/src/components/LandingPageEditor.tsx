"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Form = {
  name: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  brandColor: string;
  logoUrl: string;
  heroImageUrl: string;
  videoUrl: string;
  highlights: string[];
};

type Primary = {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  brandColor: string;
  logoUrl: string;
  heroImageUrl: string;
  videoUrl: string;
};

export default function LandingPageEditor({
  quizId,
  lpId,
  initial,
  primary,
}: {
  quizId: string;
  lpId: string;
  initial: Form;
  primary: Primary;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function patch<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/quizzes/${quizId}/landing-pages/${lpId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setStatus(`Could not save: ${j.error ?? res.statusText}`);
      return;
    }
    setStatus("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-6">
      {status && (
        <div className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {status}
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Variant basics</h2>
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            required
            maxLength={80}
          />
          <p className="mt-1 text-xs text-slate-500">For your reference only.</p>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Content overrides</h2>
        <p className="text-sm text-slate-600">
          Leave any field blank to inherit from the Primary landing page. The
          placeholder shows what's currently inherited.
        </p>
        <div>
          <label className="label">Headline</label>
          <input
            className="input"
            value={form.headline}
            onChange={(e) => patch("headline", e.target.value)}
            placeholder={primary.headline || "Inherits Primary headline"}
          />
        </div>
        <div>
          <label className="label">Subheadline / intro</label>
          <textarea
            className="input min-h-[100px]"
            value={form.subheadline}
            onChange={(e) => patch("subheadline", e.target.value)}
            placeholder={primary.subheadline || "Inherits Primary intro"}
          />
        </div>
        <div>
          <label className="label">Start button label</label>
          <input
            className="input"
            value={form.ctaLabel}
            onChange={(e) => patch("ctaLabel", e.target.value)}
            placeholder={primary.ctaLabel || "Start"}
          />
        </div>
      </section>

      <section className="card space-y-5">
        <h2 className="text-lg font-semibold">Design overrides</h2>

        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <div>
            <label className="label">Brand colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-16 cursor-pointer rounded border border-slate-300"
                value={form.brandColor || primary.brandColor || "#345ff2"}
                onChange={(e) => patch("brandColor", e.target.value)}
              />
              <input
                className="input flex-1 font-mono text-sm"
                value={form.brandColor}
                onChange={(e) => patch("brandColor", e.target.value)}
                placeholder={primary.brandColor || "#345ff2"}
              />
            </div>
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input
              type="url"
              className="input"
              value={form.logoUrl}
              onChange={(e) => patch("logoUrl", e.target.value)}
              placeholder={primary.logoUrl || "Inherits Primary logo"}
            />
            {form.logoUrl && (
              <div className="mt-2 inline-block rounded border border-slate-200 bg-slate-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logoUrl} alt="" className="h-8 w-auto" />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="label">Hero image URL</label>
          <input
            type="url"
            className="input"
            value={form.heroImageUrl}
            onChange={(e) => patch("heroImageUrl", e.target.value)}
            placeholder={primary.heroImageUrl || "Inherits Primary hero"}
          />
          {form.heroImageUrl && (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.heroImageUrl}
                alt=""
                className="max-h-48 w-full object-cover"
              />
            </div>
          )}
        </div>

        <div>
          <label className="label">Highlights</label>
          <p className="mb-2 text-xs text-slate-500">
            Override the Primary's bullet list. Leave all rows blank to inherit.
          </p>
          <div className="space-y-2">
            {form.highlights.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={h}
                  onChange={(e) =>
                    patch(
                      "highlights",
                      form.highlights.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  maxLength={140}
                />
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() =>
                    patch("highlights", form.highlights.filter((_, j) => j !== i))
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            {form.highlights.length < 8 && (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => patch("highlights", [...form.highlights, ""])}
              >
                + Add highlight
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="label">Video URL</label>
          <input
            type="url"
            className="input"
            value={form.videoUrl}
            onChange={(e) => patch("videoUrl", e.target.value)}
            placeholder={primary.videoUrl || "Inherits Primary video"}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save variant"}
        </button>
      </div>
    </form>
  );
}
