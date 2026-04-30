"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePdfReportButton({
  quizId,
  reportId,
  name,
}: {
  quizId: string;
  reportId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete the PDF report "${name}"? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/quizzes/${quizId}/pdf-reports/${reportId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Could not delete");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:text-slate-400"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
