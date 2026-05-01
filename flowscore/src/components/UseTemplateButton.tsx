"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UseTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function use() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quizzes/from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 402) {
        router.push("/dashboard/account");
        return;
      }
      setError(data.error || "Could not create quiz");
      return;
    }
    router.push(`/dashboard/quizzes/${data.id}/edit`);
  }

  return (
    <div>
      <button onClick={use} className="btn-primary" disabled={busy}>
        {busy ? "Creating…" : "Use this template →"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
