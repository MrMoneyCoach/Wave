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
  bookingUrl: string;
  bookingLabel: string;
  ownerName: string;
  theme: "minimal" | "card";
  brandColor: string;
  logoUrl: string;
  heroImageUrl: string;
  videoUrl: string;
  highlights: string[];
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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
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

  function moveQuestionTo(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setQuiz((q) => {
      if (from >= q.questions.length || to >= q.questions.length) return q;
      const copy = [...q.questions];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
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
      let detail = res.statusText || "";
      let code: string | undefined;
      try {
        const text = await res.text();
        try {
          const j = JSON.parse(text);
          detail = j.error || text;
          code = j.code;
        } catch {
          detail = text.slice(0, 200) || detail;
        }
      } catch {
        /* ignore */
      }
      // Tier limit blocking a publish — point the user at upgrade options.
      if (res.status === 402 && code === "scorecard_limit") {
        setStatus(detail);
        if (typeof window !== "undefined") {
          setTimeout(() => router.push("/dashboard/account"), 1500);
        }
        return;
      }
      setStatus(`Could not save (HTTP ${res.status}): ${detail || "no response body"}`);
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
          <Link
            href={`/dashboard/quizzes/${quiz.id}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Scorecard home
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Questions</h1>
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
        <div>
          <label className="label">Start button label</label>
          <input
            className="input"
            value={quiz.ctaLabel}
            onChange={(e) => update("ctaLabel", e.target.value)}
          />
        </div>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Every respondent fills in a short contact form before the first question
          (name, email, phone, company, job title). First name and email are required;
          the rest are optional. GDPR consent is mandatory.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Your name (shown on reports)</label>
            <input
              className="input"
              value={quiz.ownerName}
              onChange={(e) => update("ownerName", e.target.value)}
              placeholder="e.g. Scott"
            />
          </div>
          <div>
            <label className="label">Layout theme</label>
            <select
              className="input"
              value={quiz.theme}
              onChange={(e) => update("theme", e.target.value as "minimal" | "card")}
            >
              <option value="minimal">Minimal — full-bleed, Typeform-style</option>
              <option value="card">Card — contained, brand-tinted</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div>
            <label className="label">Booking URL (optional)</label>
            <input
              type="url"
              className="input"
              value={quiz.bookingUrl}
              onChange={(e) => update("bookingUrl", e.target.value)}
              placeholder="https://calendly.com/your-link"
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown as a CTA at the bottom of the results page.
            </p>
          </div>
          <div>
            <label className="label">Booking CTA label</label>
            <input
              className="input"
              value={quiz.bookingLabel}
              onChange={(e) => update("bookingLabel", e.target.value)}
              placeholder="Book a call with Scott"
            />
          </div>
        </div>
      </section>

      <section className="card mt-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Design</h2>
          <p className="mt-1 text-sm text-slate-500">
            Brand the landing page and the PDF. URLs for now — direct file upload is
            coming next.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <div>
            <label className="label">Brand colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-16 cursor-pointer rounded border border-slate-300"
                value={quiz.brandColor || "#345ff2"}
                onChange={(e) => update("brandColor", e.target.value)}
              />
              <input
                className="input flex-1 font-mono text-sm"
                value={quiz.brandColor}
                onChange={(e) => update("brandColor", e.target.value)}
                placeholder="#345ff2"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Used for buttons, accents, PDF header.
            </p>
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input
              type="url"
              className="input"
              value={quiz.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            {quiz.logoUrl && (
              <div className="mt-2 inline-block rounded border border-slate-200 bg-slate-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={quiz.logoUrl} alt="Logo preview" className="h-8 w-auto" />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="label">Hero image URL</label>
          <input
            type="url"
            className="input"
            value={quiz.heroImageUrl}
            onChange={(e) => update("heroImageUrl", e.target.value)}
            placeholder="https://example.com/hero.jpg"
          />
          {quiz.heroImageUrl && (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={quiz.heroImageUrl}
                alt="Hero preview"
                className="max-h-48 w-full object-cover"
              />
            </div>
          )}
        </div>

        <div>
          <label className="label">Highlights (bullet points on the landing page)</label>
          <p className="mb-2 text-xs text-slate-500">
            Up to 8 short benefits. Empty rows are ignored on save.
          </p>
          <div className="space-y-2">
            {quiz.highlights.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={h}
                  onChange={(e) =>
                    update(
                      "highlights",
                      quiz.highlights.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  placeholder="e.g. Personalised PDF report"
                  maxLength={140}
                />
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() =>
                    update(
                      "highlights",
                      quiz.highlights.filter((_, j) => j !== i),
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            {quiz.highlights.length < 8 && (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => update("highlights", [...quiz.highlights, ""])}
              >
                + Add highlight
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="label">Video URL (optional)</label>
          <input
            type="url"
            className="input"
            value={quiz.videoUrl}
            onChange={(e) => update("videoUrl", e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
          />
          <p className="mt-1 text-xs text-slate-500">
            YouTube or Vimeo link, embedded on the landing page.
          </p>
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
              onClick={() => {
                const next = [...quiz.questions, newQuestion()];
                update("questions", next);
                setSelectedIdx(next.length - 1);
              }}
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
          (() => {
            const safeIdx = Math.min(selectedIdx, quiz.questions.length - 1);
            const sel = quiz.questions[safeIdx];
            return (
              <div className="grid gap-4 lg:grid-cols-[260px_1fr_340px]">
                <div className="card max-h-[640px] overflow-auto p-2">
                  <ul className="space-y-1">
                    {quiz.questions.map((q, i) => {
                      const active = i === safeIdx;
                      return (
                        <li key={i}>
                          <div
                            draggable
                            onDragStart={(e) => {
                              setDragIdx(i);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverIdx !== i) setDragOverIdx(i);
                            }}
                            onDragLeave={() => {
                              if (dragOverIdx === i) setDragOverIdx(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (dragIdx !== null) {
                                moveQuestionTo(dragIdx, i);
                                setSelectedIdx(i);
                              }
                              setDragIdx(null);
                              setDragOverIdx(null);
                            }}
                            onDragEnd={() => {
                              setDragIdx(null);
                              setDragOverIdx(null);
                            }}
                            onClick={() => setSelectedIdx(i)}
                            className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm transition ${
                              active
                                ? "bg-brand-50 text-brand-700"
                                : "text-slate-700 hover:bg-slate-50"
                            } ${dragIdx === i ? "opacity-50" : ""} ${
                              dragOverIdx === i && dragIdx !== null && dragIdx !== i
                                ? "ring-2 ring-brand-400"
                                : ""
                            }`}
                          >
                            <span className="select-none text-slate-400" aria-hidden>
                              ⋮⋮
                            </span>
                            <span className="font-semibold tabular-nums text-slate-500">
                              {i + 1}.
                            </span>
                            <span className="line-clamp-2 flex-1">
                              {q.text || (
                                <span className="italic text-slate-400">
                                  Untitled question
                                </span>
                              )}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="card max-h-[640px] overflow-auto">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Preview
                  </p>
                  <div className="border-t border-slate-100 pt-5">
                    <div className="text-sm font-medium text-brand-600">
                      {safeIdx + 1} <span aria-hidden>→</span>
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold leading-tight text-slate-900">
                      {sel.text || (
                        <span className="italic text-slate-400">
                          Untitled question
                        </span>
                      )}
                      {!sel.required && (
                        <span className="ml-2 align-middle text-sm font-normal text-slate-400">
                          (optional)
                        </span>
                      )}
                    </h3>
                    <div className="mt-6">
                      {sel.type === "scale" ? (
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: 11 }).map((_, v) => (
                            <span
                              key={v}
                              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : sel.type === "text" ? (
                        <div className="border-b-2 border-slate-200 pb-3 pt-2 text-base text-slate-400">
                          Type your answer…
                        </div>
                      ) : sel.options.length === 0 ? (
                        <p className="text-sm italic text-slate-400">
                          No options yet — add some on the right.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {sel.options.map((o, oi) => (
                            <li
                              key={oi}
                              className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
                            >
                              <span className="grid h-7 w-9 place-items-center rounded border border-slate-300 text-xs font-semibold text-slate-600">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="text-slate-800">
                                {o.text || (
                                  <span className="italic text-slate-400">
                                    Option {oi + 1}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card max-h-[640px] space-y-4 overflow-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Settings
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                      onClick={() => {
                        removeQuestion(safeIdx);
                        setSelectedIdx(Math.max(0, safeIdx - 1));
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div>
                    <label className="label">Question text</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={sel.text}
                      placeholder="What do you want to ask?"
                      onChange={(e) =>
                        updateQuestion(safeIdx, (qq) => ({ ...qq, text: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Type</label>
                    <select
                      className="input"
                      value={sel.type}
                      onChange={(e) =>
                        updateQuestion(safeIdx, (qq) => ({
                          ...qq,
                          type: e.target.value as Question["type"],
                        }))
                      }
                    >
                      <option value="single">Single choice</option>
                      <option value="multi">Multiple choice</option>
                      <option value="scale">Scale (0–10)</option>
                      <option value="text">Free text</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sel.required}
                      onChange={(e) =>
                        updateQuestion(safeIdx, (qq) => ({
                          ...qq,
                          required: e.target.checked,
                        }))
                      }
                    />
                    Required
                  </label>

                  {sel.type === "scale" ? (
                    <p className="text-xs text-slate-500">
                      Respondents pick 0–10. The raw value adds to the score (max 10
                      pts).
                    </p>
                  ) : sel.type === "text" ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Respondents type freely. Add length thresholds below to score by
                        character count, or leave empty to capture text without scoring.
                      </p>
                      {sel.options.length > 0 && (
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
                          <span>Min chars</span>
                          <span>Points</span>
                          <span />
                        </div>
                      )}
                      {sel.options.map((o, oi) => (
                        <div
                          key={oi}
                          className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                        >
                          <input
                            type="number"
                            min={0}
                            className="input"
                            placeholder="140"
                            value={o.minChars ?? ""}
                            onChange={(e) =>
                              updateQuestion(safeIdx, (qq) => {
                                const opts = [...qq.options];
                                const n =
                                  e.target.value === "" ? null : Number(e.target.value);
                                opts[oi] = {
                                  ...opts[oi],
                                  minChars:
                                    n === null || Number.isNaN(n)
                                      ? null
                                      : Math.max(0, Math.round(n)),
                                };
                                return { ...qq, options: opts };
                              })
                            }
                          />
                          <input
                            type="number"
                            className="input"
                            placeholder="10"
                            value={o.score}
                            onChange={(e) =>
                              updateQuestion(safeIdx, (qq) => {
                                const opts = [...qq.options];
                                opts[oi] = {
                                  ...opts[oi],
                                  score: Number(e.target.value) || 0,
                                };
                                return { ...qq, options: opts };
                              })
                            }
                          />
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() =>
                              updateQuestion(safeIdx, (qq) => ({
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
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() =>
                          updateQuestion(safeIdx, (qq) => ({
                            ...qq,
                            options: [
                              ...qq.options,
                              { text: "", score: 0, minChars: 0 },
                            ],
                          }))
                        }
                      >
                        + Threshold
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Options
                      </p>
                      {sel.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            className="input flex-1"
                            placeholder={`Option ${oi + 1}`}
                            value={o.text}
                            onChange={(e) =>
                              updateQuestion(safeIdx, (qq) => {
                                const opts = [...qq.options];
                                opts[oi] = { ...opts[oi], text: e.target.value };
                                return { ...qq, options: opts };
                              })
                            }
                          />
                          <input
                            type="number"
                            className="input w-20"
                            placeholder="Score"
                            value={o.score}
                            onChange={(e) =>
                              updateQuestion(safeIdx, (qq) => {
                                const opts = [...qq.options];
                                opts[oi] = {
                                  ...opts[oi],
                                  score: Number(e.target.value) || 0,
                                };
                                return { ...qq, options: opts };
                              })
                            }
                          />
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() =>
                              updateQuestion(safeIdx, (qq) => ({
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
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() =>
                          updateQuestion(safeIdx, (qq) => ({
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
              </div>
            );
          })()
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
