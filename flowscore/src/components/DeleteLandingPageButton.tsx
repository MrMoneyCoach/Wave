"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteLandingPageButton({
  quizId,
  lpId,
  name,
}: {
  quizId: string;
  lpId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete the variant "${name}"? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/quizzes/${quizId}/landing-pages/${lpId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Could not delete variant");
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
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
