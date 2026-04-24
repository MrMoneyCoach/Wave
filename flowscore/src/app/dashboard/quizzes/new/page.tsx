"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, intro }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not create quiz");
      return;
    }
    const data = await res.json();
    router.push(`/dashboard/quizzes/${data.id}/edit`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">New quiz</h1>
      <p className="mt-2 text-slate-600">Give it a name. You can change everything later.</p>
      <form onSubmit={submit} className="card mt-6 space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            required
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How ready is your business for automation?"
          />
        </div>
        <div>
          <label className="label">Intro (optional)</label>
          <textarea
            className="input min-h-[100px]"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="A short paragraph shown to respondents before the first question."
          />
        </div>
        {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating…" : "Create quiz"}
        </button>
      </form>
    </div>
  );
}
