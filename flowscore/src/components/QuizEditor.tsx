"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Option = { id?: string; text: string; score: number; minChars?: number | null };
type Question = {
  id?: string;
  text: string;
  type: "single" | "multi" | "scale" | "text";
  required: boolean;
  options: Option[];
};
type Outcome = {
  id?: string;
  minScore: number;
  maxScore: number;
  title: string;
  description: string;
};
type Quiz = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  ctaLabel: string;
  collectEmail: boolean;
  published: boolean;
  questions: Question[];
  outcomes: Outcome[];
};

function newQuestion(): Question {
  return {
    text: "",
    type: "single",
    required: true,
    options: [
      { text: "", score: 0 },
      { text: "", score: 0 },
    ],
  };
}

function newOutcome(defaults: Partial<Outcome> = {}): Outcome {
  return {
    minScore: 0,
    maxScore: 100,
    title: "",
    description: "",
    ...defaults,
  };
}

export default function QuizEditor({ initial }: { initial: Quiz }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz>({
    ...initial,
    questions: initial.questions.length ? initial.questions : [],
    outcomes: initial.outcomes.length ? initial.outcomes : [],
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof Quiz>(key: K, value: Quiz[K]) {
    setQuiz((q) => ({ ...q, [key]: value }));
  }

  function updateQuestion(idx: number, fn: (q: Question) => Question) {
    setQuiz((q) => {
      const copy = [...q.questions];
      copy[idx] = fn(copy[idx]);
      return { ...q, questions: copy };
    });
  }

  function removeQuestion(idx: number) {
    setQuiz((q) => ({ ...q, questions: q.questions.filter((_, i) => i !== idx) }));
  }

  function moveQuestion(idx: number, delta: number) {
    setQuiz((q) => {
      const copy = [...q.questions];
      const target = idx + delta;
      if (target < 0 || target >= copy.length) return q;
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return { ...q, questions: copy };
    });
  }

  async function save(opts: { publish?: boolean } = {}) {
    setSaving(true);
    setStatus(null);
    const payload = {
      ...quiz,
      published: opts.publish ?? quiz.published,
    };
    const res = await fetch(`/api/quizzes/${quiz.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setStatus(`Could not save: ${j.error ?? res.statusText}`);
      return;
    }
    if (opts.publish !== undefined) update("published", opts.publish);
    setStatus("Saved.");
    router.refresh();
  }

  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    setStatus("Reading spreadsheet…");
    setUploadWarnings([]);
    const res = await fetch(`/api/quizzes/${quiz.id}/upload`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Upload failed: ${data.error}`);
      if (data.warnings) setUploadWarnings(data.warnings);
      return;
    }

    setUploadWarnings(data.warnings ?? []);
    const mergedQuestions: Question[] = [
      ...quiz.questions,
      ...data.questions.map((q: any) => ({
        text: q.text,
        type: q.type,
        required: q.required,
        options: q.options,
      })),
    ];
    const mergedOutcomes: Outcome[] =
      data.outcomes.length > 0 ? [...quiz.outcomes, ...data.outcomes] : quiz.outcomes;

    setQuiz((q) => ({ ...q, questions: mergedQuestions, outcomes: mergedOutcomes }));
    setStatus(`Imported ${data.questions.length} questions from spreadsheet.`);
  }

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/q/${quiz.slug}` : `/q/${quiz.slug}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Edit quiz</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => save()} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          {quiz.published ? (
            <button className="btn-secondary" onClick={() => save({ publish: false })} disabled={saving}>
              Unpublish
            </button>
          ) : (
            <button className="btn-primary" onClick={() => save({ publish: true })} disabled={saving}>
              Publish
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="mb-4 rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</div>
      )}
      {uploadWarnings.length > 0 && (
        <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          <p className="font-semibold">Import warnings</p>
          <ul className="mt-1 list-disc pl-5">
            {uploadWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {quiz.published && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-green-300 bg-green-50">
          <div>
            <p className="text-sm font-semibold text-green-800">Live at:</p>
            <code className="text-sm text-green-900">{publicUrl}</code>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              Copy link
            </button>
            <a href={`/q/${quiz.slug}`} target="_blank" className="btn-primary">
              Open
            </a>
          </div>
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Basics</h2>
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={quiz.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Intro</label>
          <textarea
            className="input min-h-[80px]"
            value={quiz.intro}
            onChange={(e) => update("intro", e.target.value)}
            placeholder="Shown before the first question."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Start button label</label>
            <input
              className="input"
              value={quiz.ctaLabel}
              onChange={(e) => update("ctaLabel", e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={quiz.collectEmail}
                onChange={(e) => update("collectEmail", e.target.checked)}
              />
              Require email before results
            </label>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Questions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Upload Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv,.ods"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <button
              className="btn-primary"
              onClick={() => update("questions", [...quiz.questions, newQuestion()])}
              type="button"
            >
              + Question
            </button>
          </div>
        </div>
        <details className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <summary className="cursor-pointer font-medium text-slate-900">
            Excel format
          </summary>
          <div className="mt-3 space-y-2">
            <p>
              Build a <strong>Questions</strong> sheet with these columns (one row per option):
            </p>
            <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs">
{`Question                          | Type    | Option           | Score | Min Chars
Are you tracking your KPIs weekly?| single  | Yes, every week  | 10    |
Are you tracking your KPIs weekly?| single  | Roughly monthly  | 5     |
Are you tracking your KPIs weekly?| single  | Not really       | 0     |
Describe your growth strategy.    | text    | Basic detail     | 10    | 140
Describe your growth strategy.    | text    | Great detail     | 20    | 200`}
            </pre>
            <p>
              Rows that share the same question text are grouped into one question.{" "}
              <code>Type</code> can be <code>single</code>, <code>multi</code>,{" "}
              <code>scale</code>, or <code>text</code>. For <code>text</code> questions,
              use the <code>Min Chars</code> column to award points by answer length
              (leave blank for no scoring).
            </p>
            <p>
              Add an <strong>Outcomes</strong> sheet with columns{" "}
              <code>Min Score</code>, <code>Max Score</code>, <code>Title</code>,{" "}
              <code>Description</code> to define result bands.
            </p>
          </div>
        </details>

        {quiz.questions.length === 0 ? (
          <div className="card text-center text-slate-600">
            No questions yet. Add one manually or upload from Excel.
          </div>
        ) : (
          <div className="space-y-4">
            {quiz.questions.map((q, i) => (
              <div key={i} className="card">
                <div className="mb-3 flex items-start gap-2">
                  <span className="mt-2 text-sm font-semibold text-slate-500">{i + 1}.</span>
                  <input
                    className="input"
                    value={q.text}
                    placeholder="Question text"
                    onChange={(e) =>
                      updateQuestion(i, (qq) => ({ ...qq, text: e.target.value }))
                    }
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      className="btn-secondary px-2 py-1 text-xs"
                      onClick={() => moveQuestion(i, -1)}
                      disabled={i === 0}
                    >
                      ↑
                    </button>
                    <button
                      className="btn-secondary px-2 py-1 text-xs"
                      onClick={() => moveQuestion(i, 1)}
                      disabled={i === quiz.questions.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    className="btn-danger px-2 py-1 text-xs"
                    onClick={() => removeQuestion(i)}
                  >
                    Remove
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap gap-3 text-sm">
                  <label>
                    Type{" "}
                    <select
                      className="rounded border border-slate-300 px-2 py-1"
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(i, (qq) => ({ ...qq, type: e.target.value as Question["type"] }))
                      }
                    >
                      <option value="single">Single choice</option>
                      <option value="multi">Multiple choice</option>
                      <option value="scale">Scale (0–10)</option>
                      <option value="text">Free text</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) =>
                        updateQuestion(i, (qq) => ({ ...qq, required: e.target.checked }))
                      }
                    />
                    Required
                  </label>
                </div>

                {q.type === "scale" ? (
                  <p className="text-sm text-slate-600">
                    Respondents pick a value 0–10. The raw value is added to the score
                    (max 10 points per scale question).
                  </p>
                ) : q.type === "text" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Respondents type a free-text answer. Optionally score by length — add
                      thresholds below. The highest threshold the answer meets wins; leave
                      this empty to capture the text without scoring.
                    </p>
                    {q.options.length > 0 && (
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
                        <span>Min characters</span>
                        <span>Points awarded</span>
                        <span />
                      </div>
                    )}
                    {q.options.map((o, oi) => (
                      <div key={oi} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="e.g. 140"
                          value={o.minChars ?? ""}
                          onChange={(e) =>
                            updateQuestion(i, (qq) => {
                              const opts = [...qq.options];
                              const n = e.target.value === "" ? null : Number(e.target.value);
                              opts[oi] = {
                                ...opts[oi],
                                minChars: n === null || Number.isNaN(n) ? null : Math.max(0, Math.round(n)),
                              };
                              return { ...qq, options: opts };
                            })
                          }
                        />
                        <input
                          type="number"
                          className="input"
                          placeholder="e.g. 10"
                          value={o.score}
                          onChange={(e) =>
                            updateQuestion(i, (qq) => {
                              const opts = [...qq.options];
                              opts[oi] = { ...opts[oi], score: Number(e.target.value) || 0 };
                              return { ...qq, options: opts };
                            })
                          }
                        />
                        <button
                          className="btn-secondary text-xs"
                          type="button"
                          onClick={() =>
                            updateQuestion(i, (qq) => ({
                              ...qq,
                              options: qq.options.filter((_, j) => j !== oi),
                            }))
                          }
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-secondary text-xs"
                      type="button"
                      onClick={() =>
                        updateQuestion(i, (qq) => ({
                          ...qq,
                          options: [...qq.options, { text: "", score: 0, minChars: 0 }],
                        }))
                      }
                    >
                      + Threshold
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          className="input flex-1"
                          placeholder={`Option ${oi + 1}`}
                          value={o.text}
                          onChange={(e) =>
                            updateQuestion(i, (qq) => {
                              const opts = [...qq.options];
                              opts[oi] = { ...opts[oi], text: e.target.value };
                              return { ...qq, options: opts };
                            })
                          }
                        />
                        <input
                          type="number"
                          className="input w-24"
                          placeholder="Score"
                          value={o.score}
                          onChange={(e) =>
                            updateQuestion(i, (qq) => {
                              const opts = [...qq.options];
                              opts[oi] = { ...opts[oi], score: Number(e.target.value) || 0 };
                              return { ...qq, options: opts };
                            })
                          }
                        />
                        <button
                          className="btn-secondary text-xs"
                          onClick={() =>
                            updateQuestion(i, (qq) => ({
                              ...qq,
                              options: qq.options.filter((_, j) => j !== oi),
                            }))
                          }
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-secondary text-xs"
                      type="button"
                      onClick={() =>
                        updateQuestion(i, (qq) => ({
                          ...qq,
                          options: [...qq.options, { text: "", score: 0 }],
                        }))
                      }
                    >
                      + Option
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Outcomes</h2>
            <p className="text-sm text-slate-600">
              Score bands are matched against the percentage score (0–100).
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => update("outcomes", [...quiz.outcomes, newOutcome()])}
          >
            + Outcome
          </button>
        </div>
        {quiz.outcomes.length === 0 ? (
          <div className="card text-center text-slate-600">
            No outcomes yet. Without outcomes, respondents see only their score.
          </div>
        ) : (
          <div className="space-y-3">
            {quiz.outcomes.map((o, i) => (
              <div key={i} className="card grid gap-3 md:grid-cols-[100px_100px_1fr_auto]">
                <div>
                  <label className="label text-xs">Min %</label>
                  <input
                    type="number"
                    className="input"
                    value={o.minScore}
                    onChange={(e) =>
                      setQuiz((q) => {
                        const copy = [...q.outcomes];
                        copy[i] = { ...copy[i], minScore: Number(e.target.value) || 0 };
                        return { ...q, outcomes: copy };
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Max %</label>
                  <input
                    type="number"
                    className="input"
                    value={o.maxScore}
                    onChange={(e) =>
                      setQuiz((q) => {
                        const copy = [...q.outcomes];
                        copy[i] = { ...copy[i], maxScore: Number(e.target.value) || 0 };
                        return { ...q, outcomes: copy };
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">Title & description</label>
                  <input
                    className="input mb-2"
                    placeholder="Title (e.g. Ready to scale)"
                    value={o.title}
                    onChange={(e) =>
                      setQuiz((q) => {
                        const copy = [...q.outcomes];
                        copy[i] = { ...copy[i], title: e.target.value };
                        return { ...q, outcomes: copy };
                      })
                    }
                  />
                  <textarea
                    className="input min-h-[70px]"
                    placeholder="Message shown to respondents in this band."
                    value={o.description}
                    onChange={(e) =>
                      setQuiz((q) => {
                        const copy = [...q.outcomes];
                        copy[i] = { ...copy[i], description: e.target.value };
                        return { ...q, outcomes: copy };
                      })
                    }
                  />
                </div>
                <button
                  className="btn-danger self-start text-xs"
                  onClick={() =>
                    setQuiz((q) => ({
                      ...q,
                      outcomes: q.outcomes.filter((_, j) => j !== i),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex justify-end gap-2">
        <button className="btn-secondary" onClick={() => save()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {!quiz.published && (
          <button className="btn-primary" onClick={() => save({ publish: true })} disabled={saving}>
            Publish
          </button>
        )}
      </div>
    </div>
  );
}
