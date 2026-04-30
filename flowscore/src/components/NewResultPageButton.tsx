"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Outcome = {
  id: string;
  title: string;
  minScore: number;
  maxScore: number;
};

export default function NewResultPageButton({
  quizId,
  outcomes,
  existingDefault,
}: {
  quizId: string;
  outcomes: Outcome[];
  existingDefault: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [outcomeId, setOutcomeId] = useState<string>("");
  const [makeDefault, setMakeDefault] = useState(!existingDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/result-pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        outcomeId: outcomeId || null,
        isDefault: makeDefault,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not create result page");
      return;
    }
    const data = await res.json();
    setOpen(false);
    setName("");
    setOutcomeId("");
    router.push(`/dashboard/quizzes/${quizId}/result-pages/${data.id}`);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Create result page
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card flex w-full max-w-sm flex-col gap-3">
      <div>
        <label className="label">Name</label>
        <input
          autoFocus
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. High-scorer page"
          required
          maxLength={120}
        />
      </div>

      <div>
        <label className="label">Show when</label>
        <select
          className="input"
          value={outcomeId}
          onChange={(e) => setOutcomeId(e.target.value)}
        >
          <option value="">Any outcome (default fallback)</option>
          {outcomes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title} ({o.minScore}–{o.maxScore}%)
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Pick an outcome band to make this page specific to that score range.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
        />
        Use as the default catch-all
      </label>

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
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
