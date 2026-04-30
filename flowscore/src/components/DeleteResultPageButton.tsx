"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteResultPageButton({
  quizId,
  rpId,
  name,
}: {
  quizId: string;
  rpId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete the result page "${name}"? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/quizzes/${quizId}/result-pages/${rpId}`, {
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
