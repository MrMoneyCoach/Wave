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
  theme?: "minimal" | "card";
  questions: Question[];
};

type Stage = "intro" | "questions" | "capture" | "submitting";

type Answer = {
  questionId: string;
  optionIds: string[];
  scaleValue?: number;
  text?: string;
};

type Lead = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
};

export default function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [lead, setLead] = useState<Lead>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
  });
  const [consent, setConsent] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = quiz.questions.length;
  const question = quiz.questions[current];
  const existingAnswer = answers.find((a) => a.questionId === question?.id);

  const progress = useMemo(() => {
    if (stage === "intro") return 0;
    if (stage === "capture") return 5;
    if (stage === "submitting") return 100;
    return total > 0 ? 10 + ((current + 1) / total) * 85 : 0;
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
    if (submissionId) {
      void fetch(`/api/q/${quiz.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, answers }),
      });
    }
    if (current + 1 < total) {
      setCurrent(current + 1);
    } else {
      submit();
    }
  }

  function prev() {
    setError(null);
    if (current > 0) setCurrent(current - 1);
    else setStage("capture");
  }

  async function startQuiz() {
    setError(null);
    if (!lead.firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(lead.email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!consent) {
      setError("Please tick the consent box to continue.");
      return;
    }
    if (submissionId) {
      setStage("questions");
      setCurrent(0);
      return;
    }
    setStarting(true);
    const res = await fetch(`/api/q/${quiz.slug}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: lead.firstName.trim(),
        lastName: lead.lastName.trim(),
        email: lead.email.trim(),
        phone: lead.phone.trim(),
        company: lead.company.trim(),
        jobTitle: lead.jobTitle.trim(),
        consent: true,
      }),
    });
    setStarting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not start the quiz");
      return;
    }
    const data = await res.json();
    setSubmissionId(data.submissionId);
    setStage("questions");
    setCurrent(0);
  }

  async function submit() {
    if (!submissionId) {
      setError("Please complete the contact form first.");
      setStage("capture");
      return;
    }
    setStage("submitting");
    const res = await fetch(`/api/q/${quiz.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, answers }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not submit");
      setStage("questions");
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
          if (total > 0) setStage("capture");
        }
        return;
      }

      if (stage === "capture") {
        if (e.key === "Enter" && !e.shiftKey && !editable) {
          e.preventDefault();
          startQuiz();
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
  }, [stage, current, question, existingAnswer, lead, total]);

  const theme = quiz.theme ?? "minimal";
  const isCard = theme === "card";

  return (
    <main
      className={`relative min-h-screen ${
        isCard ? "bg-gradient-to-b from-brand-50 via-white to-brand-50/30" : "bg-white"
      }`}
    >
      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-slate-100">
        <div
          className="h-full bg-brand-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {stage === "questions" && total > 0 && (
        <div className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
          <span>
            Question <span className="text-slate-900">{current + 1}</span>{" "}
            <span className="text-slate-400">of {total}</span>
          </span>
          <span className="h-3 w-px bg-slate-200" aria-hidden />
          <span className="text-slate-500">
            {Math.round(((current + 1) / total) * 100)}%
          </span>
        </div>
      )}

      <div
        key={`${stage}-${current}`}
        className="fade-in flex min-h-screen items-center px-6 py-20 md:px-12"
      >
        <div
          className={`mx-auto w-full max-w-2xl ${
            isCard
              ? "rounded-3xl border border-slate-200 bg-white p-8 shadow-xl md:p-12"
              : ""
          }`}
        >
          {stage === "intro" && (
            <IntroScreen
              title={quiz.title}
              intro={quiz.intro}
              total={total}
              ctaLabel={quiz.ctaLabel || "Start"}
              onStart={() => setStage("capture")}
            />
          )}

          {stage === "questions" && question && (
            <QuestionScreen
              index={current}
              total={total}
              question={question}
              answer={existingAnswer}
              theme={theme}
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
            />
          )}

          {stage === "capture" && (
            <CaptureScreen
              lead={lead}
              consent={consent}
              onChange={(patch) => setLead((l) => ({ ...l, ...patch }))}
              onConsent={setConsent}
              onBack={() => setStage("intro")}
              onStart={startQuiz}
              starting={starting}
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
  theme,
  onSelectOption,
  onSelectScale,
  onText,
  onNext,
  onPrev,
  error,
  isLast,
}: {
  index: number;
  total: number;
  question: Question;
  answer?: Answer;
  theme: "minimal" | "card";
  onSelectOption: (opt: Option) => void;
  onSelectScale: (v: number) => void;
  onText: (t: string) => void;
  onNext: () => void;
  onPrev: () => void;
  error: string | null;
  isLast: boolean;
}) {
  const titleSize =
    theme === "card"
      ? "text-2xl md:text-3xl"
      : "text-3xl md:text-4xl";
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-brand-600">
        <span>{index + 1}</span>
        <span aria-hidden>→</span>
      </div>
      <h2 className={`${titleSize} font-semibold leading-tight tracking-tight text-slate-900`}>
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
            theme={theme}
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
          {isLast ? "See my result" : "OK"}
          <span aria-hidden>{isLast ? "→" : "✓"}</span>
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
  theme,
}: {
  options: Option[];
  selectedIds: string[];
  multi: boolean;
  onSelect: (opt: Option) => void;
  theme: "minimal" | "card";
}) {
  const containerCls =
    theme === "card"
      ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
      : "flex flex-col gap-3";
  return (
    <div className={containerCls}>
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
        <p className={`text-xs text-slate-500 ${theme === "card" ? "sm:col-span-2 mt-1" : "mt-2"}`}>
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
  lead,
  consent,
  onChange,
  onConsent,
  onBack,
  onStart,
  starting,
  error,
}: {
  lead: Lead;
  consent: boolean;
  onChange: (patch: Partial<Lead>) => void;
  onConsent: (v: boolean) => void;
  onBack: () => void;
  onStart: () => void;
  starting: boolean;
  error: string | null;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-brand-600">
        <span>Before we begin</span>
        <span aria-hidden>→</span>
      </div>
      <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
        Tell us a little about you
      </h2>
      <p className="mt-4 text-slate-600">
        We use this to send you your personalised result. Only first name and email are
        required.
      </p>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">⚠️ Please double-check your email and phone</p>
        <p className="mt-1">
          Your full report will be sent to the email below — make sure it's right.
          You won't be asked to confirm them again at the end of the quiz.
        </p>
      </div>

      <form
        className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <LeadField
          label="First name"
          required
          autoFocus
          value={lead.firstName}
          onChange={(v) => onChange({ firstName: v })}
          placeholder="Jane"
          autoComplete="given-name"
        />
        <LeadField
          label="Last name"
          value={lead.lastName}
          onChange={(v) => onChange({ lastName: v })}
          placeholder="Doe"
          autoComplete="family-name"
        />
        <LeadField
          label="Email"
          required
          type="email"
          value={lead.email}
          onChange={(v) => onChange({ email: v })}
          placeholder="jane@example.com"
          autoComplete="email"
          className="md:col-span-2"
        />
        <LeadField
          label="Phone"
          type="tel"
          value={lead.phone}
          onChange={(v) => onChange({ phone: v })}
          placeholder="Optional"
          autoComplete="tel"
        />
        <LeadField
          label="Company"
          value={lead.company}
          onChange={(v) => onChange({ company: v })}
          placeholder="Optional"
          autoComplete="organization"
        />
        <LeadField
          label="Job title"
          value={lead.jobTitle}
          onChange={(v) => onChange({ jobTitle: v })}
          placeholder="Optional"
          autoComplete="organization-title"
          className="md:col-span-2"
        />

        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={consent}
              onChange={(e) => onConsent(e.target.checked)}
              required
            />
            <span>
              I agree that my answers and contact details may be processed to
              generate my personalised result and to be contacted about it.{" "}
              <span className="text-brand-600">(required)</span>
            </span>
          </label>
        </div>

        {error && (
          <div className="md:col-span-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-2 flex items-center gap-4 md:col-span-2">
          <button
            type="submit"
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? "Starting…" : "Start the quiz"}
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
      </form>
      <p className="mt-6 text-xs text-slate-400">
        Your details are only shared with the quiz owner. You can request removal at
        any time.
      </p>
    </div>
  );
}

function LeadField({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-1 text-brand-600">*</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-2 text-lg text-slate-900 outline-none placeholder:text-slate-300 focus:border-brand-600 md:text-xl"
      />
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
