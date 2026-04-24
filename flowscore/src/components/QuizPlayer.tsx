"use client";

import { useState } from "react";
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

  if (stage === "intro") {
    return (
      <Shell>
        <h1 className="text-3xl font-bold">{quiz.title}</h1>
        {quiz.intro && <p className="mt-4 whitespace-pre-wrap text-slate-700">{quiz.intro}</p>}
        <p className="mt-6 text-sm text-slate-500">{total} questions · takes a couple of minutes</p>
        <button
          className="btn-primary mt-6 px-6 py-3 text-base"
          onClick={() => setStage("questions")}
          disabled={total === 0}
        >
          {quiz.ctaLabel || "Start"}
        </button>
      </Shell>
    );
  }

  if (stage === "capture") {
    return (
      <Shell>
        <h2 className="text-2xl font-bold">Where should we send your result?</h2>
        <p className="mt-2 text-slate-600">
          We'll show your score on the next screen — drop your email so you can revisit it later.
        </p>
        <div className="mt-6 space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex justify-between">
          <button className="btn-secondary" onClick={() => setStage("questions")}>
            Back
          </button>
          <button className="btn-primary" onClick={submit}>
            Get my result
          </button>
        </div>
      </Shell>
    );
  }

  if (stage === "submitting") {
    return (
      <Shell>
        <p className="text-center text-slate-600">Scoring your answers…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {current + 1} of {total}
        </span>
        <span>{Math.round(((current + 1) / total) * 100)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded bg-slate-200">
        <div
          className="h-full bg-brand-600 transition-all"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {question && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">{question.text}</h2>

          <div className="mt-6 space-y-2">
            {question.type === "text" ? (
              <div>
                <textarea
                  className="input min-h-[160px]"
                  value={existingAnswer?.text ?? ""}
                  onChange={(e) =>
                    setAnswer({
                      questionId: question.id,
                      optionIds: [],
                      text: e.target.value,
                    })
                  }
                  placeholder="Type your answer…"
                />
                <p className="mt-2 text-right text-xs text-slate-500">
                  {(existingAnswer?.text ?? "").length} characters
                </p>
              </div>
            ) : question.type === "scale" ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 11 }).map((_, v) => {
                  const active = existingAnswer?.scaleValue === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setAnswer({ questionId: question.id, optionIds: [], scaleValue: v })
                      }
                      className={`h-12 w-12 rounded-lg border text-base font-semibold ${
                        active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white text-slate-800 hover:border-brand-400"
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            ) : (
              question.options.map((opt) => {
                const active = existingAnswer?.optionIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (question.type === "multi") {
                        const current = existingAnswer?.optionIds ?? [];
                        const has = current.includes(opt.id);
                        setAnswer({
                          questionId: question.id,
                          optionIds: has
                            ? current.filter((id) => id !== opt.id)
                            : [...current, opt.id],
                        });
                      } else {
                        setAnswer({ questionId: question.id, optionIds: [opt.id] });
                      }
                    }}
                    className={`block w-full rounded-lg border px-4 py-3 text-left text-base transition ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-900"
                        : "border-slate-300 bg-white hover:border-brand-400"
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })
            )}
          </div>

          {error && <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="mt-8 flex justify-between">
            <button className="btn-secondary" onClick={prev}>
              Back
            </button>
            <button className="btn-primary" onClick={next}>
              {current + 1 === total ? (quiz.collectEmail ? "Continue" : "Finish") : "Next"}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="card">{children}</div>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by Flowscore</p>
      </div>
    </main>
  );
}
