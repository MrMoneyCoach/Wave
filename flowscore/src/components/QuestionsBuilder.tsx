"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditorChrome, {
  EditorPanelHeading,
  type Rail,
} from "@/components/EditorChrome";

export type Option = {
  id?: string;
  text: string;
  score: number;
  minChars?: number | null;
};

export type Question = {
  id?: string;
  text: string;
  type: "single" | "multi" | "scale" | "text";
  required: boolean;
  options: Option[];
};

export type Outcome = {
  id?: string;
  minScore: number;
  maxScore: number;
  title: string;
  description: string;
};

export type SaveContext = Record<string, unknown>;

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

function typeLabel(t: Question["type"]) {
  if (t === "multi") return "Multiple choice";
  if (t === "scale") return "Scale 0–10";
  if (t === "text") return "Free text";
  return "Single choice";
}

export default function QuestionsBuilder({
  quizId,
  quizTitle,
  quizSlug,
  published,
  brandColor,
  initialQuestions,
  initialOutcomes,
  saveContext,
}: {
  quizId: string;
  quizTitle: string;
  quizSlug: string;
  published: boolean;
  brandColor: string;
  initialQuestions: Question[];
  initialOutcomes: Outcome[];
  saveContext: SaveContext;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [outcomes] = useState<Outcome[]>(initialOutcomes);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [tab, setTab] = useState<"question" | "answers">("question");
  const [rail, setRail] = useState<Rail>("sections");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeIdx = Math.min(selectedIdx, Math.max(0, questions.length - 1));
  const sel = questions[safeIdx];

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function patchQuestion(idx: number, patch: Partial<Question>) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  }
  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
    if (selectedIdx >= idx) setSelectedIdx(Math.max(0, selectedIdx - 1));
  }
  function moveQuestionTo(from: number, to: number) {
    if (from === to) return;
    setQuestions((qs) => {
      if (from < 0 || to < 0 || from >= qs.length || to >= qs.length) return qs;
      const copy = [...qs];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...saveContext, questions, outcomes, published }),
    });
    setBusy(false);
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const j = await res.json();
        detail = j.error || detail;
      } catch {
        /* ignore */
      }
      setError(`Could not save: ${detail}`);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <EditorChrome
      backHref={`/dashboard/quizzes/${quizId}`}
      breadcrumb={[
        { label: quizTitle || "Untitled", href: `/dashboard/quizzes/${quizId}` },
        { label: "Questions" },
      ]}
      previewHref={published ? `/q/${quizSlug}` : undefined}
      onSave={save}
      saving={busy}
      saved={saved}
      device={device}
      onDeviceChange={setDevice}
      rail={rail}
      onRailChange={setRail}
      leftPanel={
        rail === "sections" ? (
          <SectionsPanel
            questions={questions}
            selectedIdx={safeIdx}
            outcomes={outcomes}
            quizId={quizId}
            dragIdx={dragIdx}
            dragOverIdx={dragOverIdx}
            onSelect={(i) => {
              setSelectedIdx(i);
              setTab("question");
            }}
            onDragStart={setDragIdx}
            onDragOver={setDragOverIdx}
            onDrop={(from, to) => moveQuestionTo(from, to)}
            onDragEnd={() => {
              setDragIdx(null);
              setDragOverIdx(null);
            }}
            onAdd={() => {
              setQuestions((qs) => [...qs, newQuestion()]);
              setSelectedIdx(questions.length);
              setTab("question");
            }}
          />
        ) : (
          <DeferredPanel rail={rail} />
        )
      }
      rightPanel={
        sel ? (
          <RightPanel
            question={sel}
            tab={tab}
            onTabChange={setTab}
            onChange={(patch) => patchQuestion(safeIdx, patch)}
            onRemove={() => removeQuestion(safeIdx)}
          />
        ) : (
          <div className="text-sm text-slate-500">
            Add a question on the left to get started.
          </div>
        )
      }
    >
      <div className="px-6 py-10 md:px-12 md:py-16">
        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {sel ? (
          <QuestionPreview
            index={safeIdx}
            total={questions.length}
            question={sel}
            brand={brandColor}
          />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-16 text-center text-sm text-slate-500">
            No questions yet. Add one in the left panel.
          </div>
        )}
      </div>
    </EditorChrome>
  );
}

function SectionsPanel({
  questions,
  selectedIdx,
  outcomes,
  quizId,
  dragIdx,
  dragOverIdx,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onAdd,
}: {
  questions: Question[];
  selectedIdx: number;
  outcomes: Outcome[];
  quizId: string;
  dragIdx: number | null;
  dragOverIdx: number | null;
  onSelect: (i: number) => void;
  onDragStart: (i: number) => void;
  onDragOver: (i: number | null) => void;
  onDrop: (from: number, to: number) => void;
  onDragEnd: () => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <EditorPanelHeading>Questions</EditorPanelHeading>
      {questions.length === 0 && (
        <p className="px-4 pb-2 text-xs text-slate-500">
          No questions yet. Add one below.
        </p>
      )}
      <ul className="space-y-0.5 px-2">
        {questions.map((q, i) => {
          const active = i === selectedIdx;
          return (
            <li key={i}>
              <div
                draggable
                onDragStart={(e) => {
                  onDragStart(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverIdx !== i) onDragOver(i);
                }}
                onDragLeave={() => {
                  if (dragOverIdx === i) onDragOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdx !== null) onDrop(dragIdx, i);
                  onDragEnd();
                }}
                onDragEnd={onDragEnd}
                onClick={() => onSelect(i)}
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
                    <span className="italic text-slate-400">Untitled</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="px-2 pb-4 pt-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
        >
          + Add question
        </button>
      </div>

      <EditorPanelHeading>End logic</EditorPanelHeading>
      <div className="space-y-2 px-4 pb-4 text-sm">
        {outcomes.length === 0 ? (
          <p className="text-xs text-slate-500">
            No outcome bands defined. Map score ranges to result titles to
            personalise the result page.
          </p>
        ) : (
          <ul className="space-y-1">
            {outcomes.map((o, i) => (
              <li
                key={i}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">
                    {o.title || "(untitled outcome)"}
                  </span>
                  <span className="text-slate-500">
                    {o.minScore}–{o.maxScore}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/dashboard/quizzes/${quizId}/edit`}
          className="block rounded-md border border-slate-200 px-2 py-1.5 text-center text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
        >
          Edit outcome bands →
        </Link>
      </div>
    </div>
  );
}

function DeferredPanel({ rail }: { rail: Rail }) {
  return (
    <div>
      <EditorPanelHeading>{rail === "theme" ? "Theme" : "Settings"}</EditorPanelHeading>
      <p className="px-4 pb-4 text-xs text-slate-500">
        Theme and Settings rails are wired on the Landing Page designer.
        They'll arrive here in a follow-up push.
      </p>
    </div>
  );
}

function RightPanel({
  question,
  tab,
  onTabChange,
  onChange,
  onRemove,
}: {
  question: Question;
  tab: "question" | "answers";
  onTabChange: (t: "question" | "answers") => void;
  onChange: (patch: Partial<Question>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-slate-200">
        {(["question", "answers"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`-mb-px px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              tab === t
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto pr-1">
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>

      {tab === "question" && (
        <div className="space-y-4">
          <div>
            <label className="label">Question text</label>
            <textarea
              className="input min-h-[80px]"
              value={question.text}
              placeholder="What do you want to ask?"
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={question.type}
              onChange={(e) =>
                onChange({ type: e.target.value as Question["type"] })
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
              checked={question.required}
              onChange={(e) => onChange({ required: e.target.checked })}
            />
            Required
          </label>
        </div>
      )}

      {tab === "answers" && (
        <AnswersTab question={question} onChange={onChange} />
      )}
    </div>
  );
}

function AnswersTab({
  question,
  onChange,
}: {
  question: Question;
  onChange: (patch: Partial<Question>) => void;
}) {
  if (question.type === "scale") {
    return (
      <p className="text-xs text-slate-500">
        Scale questions don't have options — respondents pick a value 0–10. Max
        score is 10 points per question.
      </p>
    );
  }

  if (question.type === "text") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Free-text answers can be scored by character length. Each threshold
          awards points if the answer reaches it; the highest threshold met
          wins. Leave empty to capture without scoring.
        </p>
        {question.options.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Min chars</span>
            <span>Points</span>
            <span />
          </div>
        )}
        {question.options.map((o, oi) => (
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
              onChange={(e) => {
                const opts = [...question.options];
                const n = e.target.value === "" ? null : Number(e.target.value);
                opts[oi] = {
                  ...opts[oi],
                  minChars:
                    n === null || Number.isNaN(n)
                      ? null
                      : Math.max(0, Math.round(n)),
                };
                onChange({ options: opts });
              }}
            />
            <input
              type="number"
              className="input"
              placeholder="10"
              value={o.score}
              onChange={(e) => {
                const opts = [...question.options];
                opts[oi] = {
                  ...opts[oi],
                  score: Number(e.target.value) || 0,
                };
                onChange({ options: opts });
              }}
            />
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() =>
                onChange({
                  options: question.options.filter((_, j) => j !== oi),
                })
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
            onChange({
              options: [
                ...question.options,
                { text: "", score: 0, minChars: 0 },
              ],
            })
          }
        >
          + Threshold
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {question.options.map((o, oi) => (
        <div
          key={oi}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Option {String.fromCharCode(65 + oi)}
            </span>
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-red-700"
              onClick={() =>
                onChange({
                  options: question.options.filter((_, j) => j !== oi),
                })
              }
            >
              ✕
            </button>
          </div>
          <input
            className="input"
            placeholder="Option text"
            value={o.text}
            onChange={(e) => {
              const opts = [...question.options];
              opts[oi] = { ...opts[oi], text: e.target.value };
              onChange({ options: opts });
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-slate-500">Score</label>
            <input
              type="number"
              className="input w-24"
              value={o.score}
              onChange={(e) => {
                const opts = [...question.options];
                opts[oi] = {
                  ...opts[oi],
                  score: Number(e.target.value) || 0,
                };
                onChange({ options: opts });
              }}
            />
            <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">
              Jump to · soon
            </span>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary w-full text-xs"
        onClick={() =>
          onChange({
            options: [...question.options, { text: "", score: 0 }],
          })
        }
      >
        + Add option
      </button>
    </div>
  );
}

function QuestionPreview({
  index,
  total,
  question,
  brand,
}: {
  index: number;
  total: number;
  question: Question;
  brand: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium" style={{ color: brand }}>
        <span>{index + 1}</span>
        <span aria-hidden>→</span>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {typeLabel(question.type)}
        </span>
      </div>
      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 md:text-3xl">
        {question.text || (
          <span className="italic text-slate-400">Untitled question</span>
        )}
        {!question.required && (
          <span className="ml-2 align-middle text-sm font-normal text-slate-400">
            (optional)
          </span>
        )}
      </h2>

      <div className="mt-8">
        {question.type === "scale" ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 11 }).map((_, v) => (
              <span
                key={v}
                className="grid h-12 w-12 place-items-center rounded-lg border border-slate-200 text-base font-semibold text-slate-700"
              >
                {v}
              </span>
            ))}
          </div>
        ) : question.type === "text" ? (
          <div className="border-b-2 border-slate-200 pb-3 pt-2 text-base text-slate-400">
            Type your answer…
          </div>
        ) : question.options.length === 0 ? (
          <p className="text-sm italic text-slate-400">
            No options yet — add some in the right panel.
          </p>
        ) : (
          <ul className="space-y-2">
            {question.options.map((o, oi) => (
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

      <div className="mt-12 flex items-center justify-end gap-3 text-sm text-slate-400">
        <span>
          Question {index + 1} of {total}
        </span>
      </div>
    </div>
  );
}
