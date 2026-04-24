"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; text: string };
type Question = {
  id: string;
  text: string;
  type: "single" | "multi" | "scale" | "text";
  required: boolean;
  options: Option[];
};
type Quiz = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  ctaLabel: string;
  collectEmail: boolean;
  questions: Question[];
};

type Stage = "intro" | "questions" | "capture" | "submitting";

type Answer = {
  questionId: string;
  optionIds: string[];
  scaleValue?: number;
  text?: string;
};

export default function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = quiz.questions.length;
  const question = quiz.questions[current];
  const existingAnswer = answers.find((a) => a.questionId === question?.id);

  const progress = useMemo(() => {
    if (stage === "intro") return 0;
    if (stage === "capture") return 100;
    if (stage === "submitting") return 100;
    return total > 0 ? ((current + 1) / total) * 100 : 0;
  }, [stage, current, total]);

  function setAnswer(next: Answer) {
    setAnswers((prev) => {
      const other = prev.filter((a) => a.questionId !== next.questionId);
      return [...other, next];
    });
  }

  function canAdvance(): boolean {
    if (!question) return false;
    if (!question.required) return true;
    if (!existingAnswer) return false;
    if (question.type === "scale") return typeof existingAnswer.scaleValue === "number";
    if (question.type === "text") return (existingAnswer.text ?? "").trim().length > 0;
    return existingAnswer.optionIds.length > 0;
  }

  function next() {
    setError(null);
    if (!canAdvance()) {
      setError("Please answer this question to continue.");
      return;
    }
    if (current + 1 < total) {
      setCurrent(current + 1);
    } else if (quiz.collectEmail) {
      setStage("capture");
    } else {
      submit();
    }
  }

  function prev() {
    setError(null);
    if (current > 0) setCurrent(current - 1);
    else setStage("intro");
  }

  async function submit() {
    if (quiz.collectEmail && !email) {
      setError("Please enter your email.");
      return;
    }
    setStage("submitting");
    const res = await fetch(`/api/q/${quiz.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, email: email || null, name: name || null }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not submit");
      setStage("capture");
      return;
    }
    const data = await res.json();
    router.push(`/q/${quiz.slug}/result/${data.submissionId}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable = tag === "INPUT" || tag === "TEXTAREA";

      if (stage === "intro") {
        if (e.key === "Enter") {
          e.preventDefault();
          if (total > 0) setStage("questions");
        }
        return;
      }

      if (stage === "capture") {
        if (e.key === "Enter" && !e.shiftKey && !editable) {
          e.preventDefault();
          submit();
        }
        return;
      }

      if (stage !== "questions" || !question) return;

      if (e.key === "ArrowUp" && !editable) {
        e.preventDefault();
        prev();
        return;
      }

      if (question.type === "text") {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          next();
        }
        return;
      }

      if (editable) return;

      if (e.key === "Enter") {
        e.preventDefault();
        next();
        return;
      }

      if (question.type === "scale") {
        if (/^[0-9]$/.test(e.key)) {
          const v = parseInt(e.key, 10);
          setAnswer({ questionId: question.id, optionIds: [], scaleValue: v });
        }
        return;
      }

      const letter = e.key.toUpperCase();
      if (letter.length === 1 && letter >= "A" && letter <= "Z") {
        const index = letter.charCodeAt(0) - 65;
        if (index < question.options.length) {
          const opt = question.options[index];
          if (question.type === "multi") {
            const cur = existingAnswer?.optionIds ?? [];
            const has = cur.includes(opt.id);
            setAnswer({
              questionId: question.id,
              optionIds: has ? cur.filter((id) => id !== opt.id) : [...cur, opt.id],
            });
          } else {
            setAnswer({ questionId: question.id, optionIds: [opt.id] });
          }
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, current, question, existingAnswer, email, total]);

  return (
    <main className="relative min-h-screen bg-white">
      <div className="fixed left-0 right-0 top-0 z-40 h-[3px] bg-slate-100">
        <div
          className="h-full bg-brand-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        key={`${stage}-${current}`}
        className="fade-in flex min-h-screen items-center px-6 py-20 md:px-12"
      >
        <div className="mx-auto w-full max-w-2xl">
          {stage === "intro" && (
            <IntroScreen
              title={quiz.title}
              intro={quiz.intro}
              total={total}
              ctaLabel={quiz.ctaLabel || "Start"}
              onStart={() => setStage("questions")}
            />
          )}

          {stage === "questions" && question && (
            <QuestionScreen
              index={current}
              total={total}
              question={question}
              answer={existingAnswer}
              onSelectOption={(opt) => {
                if (question.type === "multi") {
                  const cur = existingAnswer?.optionIds ?? [];
                  const has = cur.includes(opt.id);
                  setAnswer({
                    questionId: question.id,
                    optionIds: has
                      ? cur.filter((id) => id !== opt.id)
                      : [...cur, opt.id],
                  });
                } else {
                  setAnswer({ questionId: question.id, optionIds: [opt.id] });
                }
              }}
              onSelectScale={(v) => {
                setAnswer({ questionId: question.id, optionIds: [], scaleValue: v });
              }}
              onText={(t) =>
                setAnswer({ questionId: question.id, optionIds: [], text: t })
              }
              onNext={next}
              onPrev={prev}
              error={error}
              isLast={current + 1 === total}
              collectEmail={quiz.collectEmail}
            />
          )}

          {stage === "capture" && (
            <CaptureScreen
              name={name}
              email={email}
              onName={setName}
              onEmail={setEmail}
              onBack={() => setStage("questions")}
              onSubmit={submit}
              error={error}
            />
          )}

          {stage === "submitting" && (
            <div className="text-center">
              <p className="text-lg text-slate-500">Scoring your answers…</p>
            </div>
          )}
        </div>
      </div>

      {stage === "questions" && (
        <NavArrows
          canPrev={current > 0}
          canNext={canAdvance()}
          onPrev={prev}
          onNext={next}
        />
      )}

      <footer className="fixed bottom-4 left-6 text-xs text-slate-400">
        Powered by <span className="font-medium text-slate-500">Flowscore</span>
      </footer>
    </main>
  );
}

function IntroScreen({
  title,
  intro,
  total,
  ctaLabel,
  onStart,
}: {
  title: string;
  intro: string;
  total: number;
  ctaLabel: string;
  onStart: () => void;
}) {
  return (
    <div>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
        {title}
      </h1>
      {intro && (
        <p className="mt-6 whitespace-pre-wrap text-lg text-slate-600 md:text-xl">
          {intro}
        </p>
      )}
      <p className="mt-8 text-sm text-slate-500">
        {total} question{total === 1 ? "" : "s"} · takes a couple of minutes
      </p>
      <div className="mt-10 flex items-center gap-4">
        <button
          type="button"
          onClick={onStart}
          disabled={total === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-lg font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {ctaLabel}
          <span aria-hidden>→</span>
        </button>
        <span className="text-sm text-slate-500">
          press <kbd>Enter ↵</kbd>
        </span>
      </div>
    </div>
  );
}

function QuestionScreen({
  index,
  total,
  question,
  answer,
  onSelectOption,
  onSelectScale,
  onText,
  onNext,
  onPrev,
  error,
  isLast,
  collectEmail,
}: {
  index: number;
  total: number;
  question: Question;
  answer?: Answer;
  onSelectOption: (opt: Option) => void;
  onSelectScale: (v: number) => void;
  onText: (t: string) => void;
  onNext: () => void;
  onPrev: () => void;
  error: string | null;
  isLast: boolean;
  collectEmail: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-brand-600">
        <span>{index + 1}</span>
        <span aria-hidden>→</span>
      </div>
      <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
        {question.text}
        {!question.required && (
          <span className="ml-2 align-middle text-sm font-normal text-slate-400">
            (optional)
          </span>
        )}
      </h2>

      <div className="mt-10">
        {question.type === "text" ? (
          <TextAnswer
            value={answer?.text ?? ""}
            onChange={onText}
          />
        ) : question.type === "scale" ? (
          <ScaleAnswer
            value={answer?.scaleValue}
            onSelect={onSelectScale}
          />
        ) : (
          <OptionsAnswer
            options={question.options}
            selectedIds={answer?.optionIds ?? []}
            multi={question.type === "multi"}
            onSelect={onSelectOption}
          />
        )}
      </div>

      {error && (
        <div className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-10 flex items-center gap-4">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white transition hover:bg-brand-700"
        >
          {isLast && !collectEmail ? "Finish" : "OK"}
          <span aria-hidden>✓</span>
        </button>
        <span className="text-sm text-slate-500">
          press{" "}
          {question.type === "text" ? (
            <>
              <kbd>⌘/Ctrl</kbd> + <kbd>Enter ↵</kbd>
            </>
          ) : (
            <kbd>Enter ↵</kbd>
          )}
        </span>
        {index > 0 && (
          <button
            type="button"
            onClick={onPrev}
            className="ml-auto text-sm text-slate-500 hover:text-slate-700"
          >
            ← back
          </button>
        )}
      </div>
    </div>
  );
}

function OptionsAnswer({
  options,
  selectedIds,
  multi,
  onSelect,
}: {
  options: Option[];
  selectedIds: string[];
  multi: boolean;
  onSelect: (opt: Option) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt, i) => {
        const active = selectedIds.includes(opt.id);
        const letter = String.fromCharCode(65 + i);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt)}
            className={`group flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition ${
              active
                ? "border-brand-600 bg-brand-600/5"
                : "border-slate-200 hover:border-brand-400 hover:bg-slate-50"
            }`}
          >
            <span
              className={`flex h-9 min-w-[36px] items-center justify-center rounded-md border text-sm font-semibold transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 group-hover:border-brand-400 group-hover:text-brand-600"
              }`}
            >
              {letter}
            </span>
            <span className="text-lg text-slate-900">{opt.text}</span>
            {active && (
              <span
                className="ml-auto text-brand-600"
                aria-hidden
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
      {multi && (
        <p className="mt-2 text-xs text-slate-500">
          Select any that apply. Press a letter to toggle.
        </p>
      )}
    </div>
  );
}

function ScaleAnswer({
  value,
  onSelect,
}: {
  value?: number;
  onSelect: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 11 }).map((_, v) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelect(v)}
              className={`h-14 w-14 rounded-xl border text-lg font-semibold transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-brand-400"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>Not at all</span>
        <span>Completely</span>
      </div>
    </div>
  );
}

function TextAnswer({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <div>
      <textarea
        className="w-full resize-none border-0 border-b-2 border-slate-200 bg-transparent px-0 py-3 text-xl leading-relaxed text-slate-900 outline-none placeholder:text-slate-300 focus:border-brand-600 md:text-2xl"
        placeholder="Type your answer…"
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
      <p className="mt-2 text-right text-xs text-slate-500">
        {value.length} characters
      </p>
    </div>
  );
}

function CaptureScreen({
  name,
  email,
  onName,
  onEmail,
  onBack,
  onSubmit,
  error,
}: {
  name: string;
  email: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  error: string | null;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-brand-600">
        <span>One last thing</span>
        <span aria-hidden>→</span>
      </div>
      <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
        Where should we send your result?
      </h2>
      <p className="mt-4 text-slate-600">
        Drop your details — your personalised score is on the next screen.
      </p>

      <div className="mt-10 space-y-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            className="mt-2 w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-2 text-xl text-slate-900 outline-none placeholder:text-slate-300 focus:border-brand-600"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            className="mt-2 w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-2 text-xl text-slate-900 outline-none placeholder:text-slate-300 focus:border-brand-600"
            placeholder="jane@example.com"
          />
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-10 flex items-center gap-4">
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white transition hover:bg-brand-700"
        >
          Get my result
          <span aria-hidden>→</span>
        </button>
        <span className="text-sm text-slate-500">
          press <kbd>Enter ↵</kbd>
        </span>
        <button
          type="button"
          onClick={onBack}
          className="ml-auto text-sm text-slate-500 hover:text-slate-700"
        >
          ← back
        </button>
      </div>
    </div>
  );
}

function NavArrows({
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
        aria-label="Previous question"
      >
        ↑
      </button>
      <div className="w-px bg-slate-200" />
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
        aria-label="Next question"
      >
        ↓
      </button>
    </div>
  );
}
