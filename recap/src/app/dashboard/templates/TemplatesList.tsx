"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Template } from "@/lib/types";

type Props = {
  templates: Template[];
  userId: string | null;
  isPro: boolean;
};

export default function TemplatesList({ templates, userId, isPro }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const own = templates.filter((t) => t.owner_id === userId);
  const builtIn = templates.filter((t) => t.owner_id === null);

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template? Any meetings using it keep their existing summary.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to delete");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-8 space-y-10">
      {own.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">Your templates</h2>
          <div className="mt-3 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
            {own.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.name}</div>
                  {t.description && <div className="mt-0.5 text-xs text-ink/60">{t.description}</div>}
                  <div className="mt-1 text-xs text-ink/50">
                    {t.sections.length} section{t.sections.length === 1 ? "" : "s"} ·{" "}
                    {t.sections.map((s) => s.label).join(" · ")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/dashboard/templates/${t.id}/edit`}
                    className="rounded border border-ink/15 bg-white px-3 py-1 text-xs hover:bg-ink/5"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    disabled={busyId === t.id}
                    className="rounded border border-red-200 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyId === t.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">Built-in</h2>
        <div className="mt-3 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
          {builtIn.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.name}</div>
                {t.description && <div className="mt-0.5 text-xs text-ink/60">{t.description}</div>}
                <div className="mt-1 text-xs text-ink/50">
                  {t.sections.map((s) => s.label).join(" · ")}
                </div>
              </div>
              {isPro && (
                <Link
                  href={`/dashboard/templates/new?from=${t.id}`}
                  className="shrink-0 rounded border border-ink/15 bg-white px-3 py-1 text-xs hover:bg-ink/5"
                >
                  Duplicate &amp; edit
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
