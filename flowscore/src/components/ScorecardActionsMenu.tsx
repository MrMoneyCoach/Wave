"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ScorecardActionsMenu({
  quizId,
  quizTitle,
  slug,
  published,
}: {
  quizId: string;
  quizTitle: string;
  slug: string;
  published: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function remove() {
    const ok = confirm(
      `Delete "${quizTitle}"?\n\nThis permanently removes the scorecard and every lead, submission, landing page, result page and email setting attached to it. This can't be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
    setBusy(false);
    setOpen(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Could not delete the scorecard");
      return;
    }
    router.refresh();
  }

  const itemCls =
    "flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50";

  return (
    <div ref={wrapRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Scorecard actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <circle cx="4" cy="9" r="1.5" fill="currentColor" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <circle cx="14" cy="9" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <Link href={`/dashboard/quizzes/${quizId}`} className={itemCls}>
            Open
          </Link>
          <Link href={`/dashboard/quizzes/${quizId}/edit`} className={itemCls}>
            Edit questions
          </Link>
          <Link href={`/dashboard/quizzes/${quizId}/leads`} className={itemCls}>
            Leads
          </Link>
          <Link href={`/dashboard/quizzes/${quizId}/analytics`} className={itemCls}>
            Analytics
          </Link>
          {published && (
            <a
              href={`/q/${slug}`}
              target="_blank"
              rel="noreferrer"
              className={itemCls}
            >
              View live ↗
            </a>
          )}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
