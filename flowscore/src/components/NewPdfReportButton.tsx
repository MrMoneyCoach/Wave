"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPdfReportButton({
  quizId,
  existingDefault,
}: {
  quizId: string;
  existingDefault: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(!existingDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/pdf-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), isDefault: makeDefault }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not create report");
      return;
    }
    const data = await res.json();
    setOpen(false);
    setName("");
    router.push(`/dashboard/quizzes/${quizId}/pdf-reports/${data.id}`);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Create PDF report
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
          placeholder="e.g. Standard report"
          required
          maxLength={120}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
        />
        Use as the default for emailed PDFs
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
