"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLandingPageButton({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/landing-pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not create variant");
      return;
    }
    setOpen(false);
    setName("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Create variant
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card flex w-full max-w-sm flex-col gap-3">
      <div>
        <label className="label">Variant name</label>
        <input
          autoFocus
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Black Friday"
          required
          maxLength={80}
        />
        <p className="mt-1 text-xs text-slate-500">
          For your reference. The URL slug is generated automatically.
        </p>
      </div>
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setOpen(false);
            setName("");
            setError(null);
          }}
        >
          Cancel
        </button>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create variant"}
        </button>
      </div>
    </form>
  );
}
