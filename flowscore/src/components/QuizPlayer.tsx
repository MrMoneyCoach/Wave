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
type Block =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "list"; items: string[]; checkmark: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "divider" }
  | {
      id: string;
      type: "hero-split";
      headline: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
      bullets: string[];
      imageUrl: string;
      imageAlt: string;
      imagePosition: "left" | "right";
    }
  | {
      id: string;
      type: "feature-grid";
      heading: string;
      subhead: string;
      columns: 2 | 3 | 4;
      items: { id: string; iconUrl: string; title: string; body: string }[];
    }
  | {
      id: string;
      type: "image-text";
      imageUrl: string;
      imageAlt: string;
      imagePosition: "left" | "right";
      heading: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
    };

type Quiz = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  ctaLabel: string;
  collectEmail: boolean;
  theme?: "minimal" | "card";
  brandColor?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  videoUrl?: string | null;
  highlights?: string[];
  blocks?: Block[];
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
  const brand = (quiz.brandColor || "#345ff2").trim();

  return (
    <main
      className={`relative min-h-screen ${
        isCard ? "bg-gradient-to-b from-brand-50 via-white to-brand-50/30" : "bg-white"
      }`}
    >
      {stage === "questions" && total > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              {Math.round(((current + 1) / total) * 100)}% Complete
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((current + 1) / total) * 100}%`,
                  backgroundColor: brand,
                }}
              />
            </div>
          </div>
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
          {(stage === "intro" || stage === "capture") && (
            <IntroScreen
              title={quiz.title}
              intro={quiz.intro}
              total={total}
              ctaLabel={quiz.ctaLabel || "Start"}
              onStart={() => setStage("capture")}
              brand={brand}
              logoUrl={quiz.logoUrl ?? null}
              heroImageUrl={quiz.heroImageUrl ?? null}
              videoUrl={quiz.videoUrl ?? null}
              highlights={quiz.highlights ?? []}
              blocks={quiz.blocks ?? []}
            />
          )}

          {stage === "questions" && question && (
            <QuestionScreen
              index={current}
              total={total}
              question={question}
              answer={existingAnswer}
              theme={theme}
              brand={brand}
              logoUrl={quiz.logoUrl ?? null}
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

          {stage === "submitting" && (
            <div className="text-center">
              <p className="text-lg text-slate-500">Scoring your answers…</p>
            </div>
          )}
        </div>
      </div>

      {stage !== "questions" && (
        <footer className="fixed bottom-4 left-6 text-xs text-slate-400">
          Powered by <span className="font-medium text-slate-500">Flowscore</span>
        </footer>
      )}

      {stage === "capture" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 px-4 py-6 backdrop-blur-sm md:items-center md:py-12">
          <div className="fade-in max-h-full w-full max-w-xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl md:p-10">
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
          </div>
        </div>
      )}
    </main>
  );
}

function IntroScreen({
  title,
  intro,
  total,
  ctaLabel,
  onStart,
  brand,
  logoUrl,
  heroImageUrl,
  videoUrl,
  highlights,
  blocks,
}: {
  title: string;
  intro: string;
  total: number;
  ctaLabel: string;
  onStart: () => void;
  brand: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  videoUrl: string | null;
  highlights: string[];
  blocks: Block[];
}) {
  const embed = videoUrl ? videoEmbedUrl(videoUrl) : null;
  const useBlocks = blocks.length > 0;
  return (
    <div>
      {useBlocks ? (
        <div className="space-y-6">
          {blocks.map((b) => (
            <BlockRender key={b.id} block={b} brand={brand} />
          ))}
        </div>
      ) : (
        <>
          {logoUrl && (
            <div className="mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="h-10 w-auto" />
            </div>
          )}

          {heroImageUrl && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl}
                alt=""
                className="h-56 w-full object-cover md:h-72"
              />
            </div>
          )}

          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-6 whitespace-pre-wrap text-lg text-slate-600 md:text-xl">
              {intro}
            </p>
          )}

          {highlights.length > 0 && (
            <ul className="mt-8 space-y-3">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: brand }}
                  >
                    ✓
                  </span>
                  <span className="text-base text-slate-800 md:text-lg">{h}</span>
                </li>
              ))}
            </ul>
          )}

          {embed && (
            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="relative aspect-video w-full">
                <iframe
                  src={embed}
                  title="Intro video"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-sm text-slate-500">
        {total} question{total === 1 ? "" : "s"} · takes a couple of minutes
      </p>
      <div className="mt-10 flex items-center gap-4">
        <button
          type="button"
          onClick={onStart}
          disabled={total === 0}
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-lg font-medium text-white transition disabled:opacity-50"
          style={{ backgroundColor: brand }}
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

function pickTextOn(hex: string): "white" | "#0f172a" {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "white";
  const r = parseInt(m.substr(0, 2), 16);
  const g = parseInt(m.substr(2, 2), 16);
  const b = parseInt(m.substr(4, 2), 16);
  // YIQ luma; 155 is a sensible threshold for perceived lightness.
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 155 ? "#0f172a" : "white";
}

function videoEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

function QuestionScreen({
  index,
  total,
  question,
  answer,
  theme,
  brand,
  logoUrl,
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
  brand: string;
  logoUrl: string | null;
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
      ? "text-3xl md:text-4xl"
      : "text-4xl md:text-5xl";
  const textOnBrand = pickTextOn(brand);
  return (
    <div className="relative">
      {logoUrl && (
        <div className="mb-12 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="h-12 w-auto" />
        </div>
      )}

      {index > 0 && (
        <button
          type="button"
          onClick={onPrev}
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-800"
        >
          <span aria-hidden>←</span> Back
        </button>
      )}

      <h2
        className={`${titleSize} font-serif font-bold leading-tight tracking-tight text-slate-900`}
        style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif" }}
      >
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
            brand={brand}
          />
        ) : (
          <OptionsAnswer
            options={question.options}
            selectedIds={answer?.optionIds ?? []}
            multi={question.type === "multi"}
            onSelect={onSelectOption}
            brand={brand}
          />
        )}
      </div>

      {error && (
        <div className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold transition hover:opacity-90"
          style={{ backgroundColor: brand, color: textOnBrand }}
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
      </div>
    </div>
  );
}

function OptionsAnswer({
  options,
  selectedIds,
  multi,
  onSelect,
  brand,
}: {
  options: Option[];
  selectedIds: string[];
  multi: boolean;
  onSelect: (opt: Option) => void;
  brand: string;
}) {
  const textOnBrand = pickTextOn(brand);
  // Choose row vs stack layout based on count and option text length —
  // short single-word options (Yes / No / 3-way splits) read better in a row.
  const maxLen = options.reduce((m, o) => Math.max(m, o.text.length), 0);
  const rowLayout = options.length <= 3 && maxLen <= 28;
  const containerCls = rowLayout
    ? "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
    : "grid grid-cols-1 gap-3 md:grid-cols-2";

  return (
    <div className={containerCls}>
      {options.map((opt) => {
        const active = selectedIds.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt)}
            className="group relative flex min-h-[88px] items-center justify-center rounded-xl px-6 py-5 text-center text-lg font-semibold transition hover:scale-[1.01] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: brand,
              color: textOnBrand,
              opacity: active ? 1 : 0.9,
              boxShadow: active
                ? `0 0 0 3px ${textOnBrand === "white" ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.4)"}`
                : "0 1px 2px rgba(15,23,42,0.05)",
            }}
          >
            <span className="text-balance leading-snug">{opt.text}</span>
            {active && (
              <span
                aria-hidden
                className="absolute right-3 top-3 text-base"
                style={{ color: textOnBrand }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
      {multi && (
        <p className="text-xs text-slate-500 sm:col-span-full">
          Select any that apply.
        </p>
      )}
    </div>
  );
}

function ScaleAnswer({
  value,
  onSelect,
  brand,
}: {
  value?: number;
  onSelect: (v: number) => void;
  brand: string;
}) {
  const textOnBrand = pickTextOn(brand);
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
              className="h-14 w-14 rounded-xl border text-lg font-semibold transition hover:opacity-90"
              style={
                active
                  ? { backgroundColor: brand, color: textOnBrand, borderColor: brand }
                  : { backgroundColor: "white", color: "#0f172a", borderColor: "#e2e8f0" }
              }
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
        <p className="font-medium">⚠️ Please use a real email</p>
        <p className="mt-1">
          We'll send your full PDF report to the email you give us. You'll get a chance
          to confirm or fix it at the end of the quiz before we send anything.
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

function BlockRender({ block, brand }: { block: Block; brand: string }) {
  if (block.type === "heading") {
    const sizeCls =
      block.level === 1
        ? "text-4xl md:text-6xl"
        : block.level === 2
        ? "text-3xl md:text-5xl"
        : "text-2xl md:text-3xl";
    return (
      <h2
        className={`${sizeCls} font-semibold leading-tight tracking-tight text-slate-900`}
      >
        {block.text}
      </h2>
    );
  }
  if (block.type === "paragraph") {
    return (
      <p className="whitespace-pre-wrap text-lg text-slate-600 md:text-xl">
        {block.text}
      </p>
    );
  }
  if (block.type === "image") {
    if (!block.url) return null;
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.url}
          alt={block.alt}
          className="w-full object-cover"
        />
      </div>
    );
  }
  if (block.type === "list") {
    const items = block.items.filter((s) => s.trim().length > 0);
    if (items.length === 0) return null;
    return (
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            {block.checkmark ? (
              <span
                aria-hidden
                className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: brand }}
              >
                ✓
              </span>
            ) : (
              <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
            )}
            <span className="text-base text-slate-800 md:text-lg">{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "button") {
    if (!block.url || !block.label) return null;
    const style =
      block.style === "primary"
        ? { backgroundColor: brand, color: "white" }
        : { border: `1px solid ${brand}`, color: brand };
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-medium transition hover:opacity-90"
        style={style}
      >
        {block.label} <span aria-hidden>→</span>
      </a>
    );
  }
  if (block.type === "hero-split") {
    const text = (
      <div className="flex flex-col justify-center">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
          {block.headline}
        </h2>
        {block.body && (
          <p className="mt-5 whitespace-pre-wrap text-base text-slate-600 md:text-lg">
            {block.body}
          </p>
        )}
        {block.bullets.filter(Boolean).length > 0 && (
          <ul className="mt-6 space-y-3">
            {block.bullets.filter(Boolean).map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: brand }}
                >
                  ✓
                </span>
                <span className="text-base text-slate-800">{b}</span>
              </li>
            ))}
          </ul>
        )}
        {block.ctaLabel && block.ctaUrl && (
          <a
            href={block.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex max-w-max items-center gap-2 rounded-lg px-6 py-3 text-base font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: brand }}
          >
            {block.ctaLabel} <span aria-hidden>→</span>
          </a>
        )}
      </div>
    );
    if (!block.imageUrl) return text;
    const image = (
      <div className="overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.imageUrl}
          alt={block.imageAlt}
          className="h-full w-full object-contain"
        />
      </div>
    );
    return (
      <div className="grid items-center gap-8 md:grid-cols-2">
        {block.imagePosition === "left" ? (
          <>
            {image}
            {text}
          </>
        ) : (
          <>
            {text}
            {image}
          </>
        )}
      </div>
    );
  }

  if (block.type === "feature-grid") {
    const colsClass =
      block.columns === 2
        ? "md:grid-cols-2"
        : block.columns === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-4";
    return (
      <div>
        {(block.heading || block.subhead) && (
          <div className="mx-auto mb-10 max-w-2xl text-center">
            {block.heading && (
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
                {block.heading}
              </h2>
            )}
            {block.subhead && (
              <p className="mt-3 whitespace-pre-wrap text-base text-slate-600 md:text-lg">
                {block.subhead}
              </p>
            )}
          </div>
        )}
        <div className={`grid gap-8 ${colsClass}`}>
          {block.items.map((item) => (
            <div key={item.id} className="text-center">
              {item.iconUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.iconUrl}
                  alt=""
                  className="mx-auto mb-4 h-16 w-16 object-contain"
                />
              ) : (
                <div
                  className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-white"
                  style={{ backgroundColor: brand }}
                  aria-hidden
                >
                  ◆
                </div>
              )}
              {item.title && (
                <h3 className="text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
              )}
              {item.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {item.body}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "image-text") {
    const text = (
      <div className="flex flex-col justify-center">
        {block.heading && (
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
            {block.heading}
          </h2>
        )}
        {block.body && (
          <p className="mt-4 whitespace-pre-wrap text-base text-slate-600 md:text-lg">
            {block.body}
          </p>
        )}
        {block.ctaLabel && block.ctaUrl && (
          <a
            href={block.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex max-w-max items-center gap-2 rounded-lg px-6 py-3 text-base font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: brand }}
          >
            {block.ctaLabel} <span aria-hidden>→</span>
          </a>
        )}
      </div>
    );
    if (!block.imageUrl) return text;
    const image = (
      <div className="overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.imageUrl}
          alt={block.imageAlt}
          className="h-full w-full object-cover"
        />
      </div>
    );
    return (
      <div className="grid items-center gap-8 md:grid-cols-2">
        {block.imagePosition === "left" ? (
          <>
            {image}
            {text}
          </>
        ) : (
          <>
            {text}
            {image}
          </>
        )}
      </div>
    );
  }

  if (block.type === "divider") {
    return <hr className="border-t border-slate-200" />;
  }
  return null;
}
