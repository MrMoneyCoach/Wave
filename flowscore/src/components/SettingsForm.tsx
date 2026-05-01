"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Form wrapper that handles saving a settings PATCH and the saved/error/busy
 *  state. Children render whatever fields are needed; parent passes a payload
 *  factory called on submit. */
export default function SettingsForm({
  quizId,
  build,
  children,
  saveLabel = "Save changes",
  hideButton = false,
}: {
  quizId: string;
  build: () => Record<string, unknown>;
  children: React.ReactNode;
  saveLabel?: string;
  hideButton?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(build()),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={save} className="space-y-6">
      {children}
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {!hideButton && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
          {saved && (
            <span className="text-sm text-emerald-600">✓ Saved</span>
          )}
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Saving…" : saveLabel}
          </button>
        </div>
      )}
    </form>
  );
}

export function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0 md:grid-cols-[280px_1fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          {label}
        </p>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
