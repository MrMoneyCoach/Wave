"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteScorecardButton({
  quizId,
  quizTitle,
  redirectTo,
  variant = "link",
}: {
  quizId: string;
  quizTitle: string;
  redirectTo?: string;
  variant?: "link" | "button";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const confirmed = confirm(
      `Delete "${quizTitle}"?\n\nThis permanently removes the scorecard and every lead, submission, landing page, result page and email setting attached to it. This can't be undone.`,
    );
    if (!confirmed) return;
    setBusy(true);
    const res = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Could not delete the scorecard");
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Delete scorecard"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:text-slate-400"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
