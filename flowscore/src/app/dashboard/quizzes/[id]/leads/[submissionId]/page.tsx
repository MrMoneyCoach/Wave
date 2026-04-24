import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: { id: string; submissionId: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      outcomes: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const submission = await prisma.submission.findUnique({
    where: { id: params.submissionId },
  });
  if (!submission || submission.quizId !== quiz.id) return notFound();

  type ParsedAnswer = {
    questionId: string;
    optionIds: string[];
    scaleValue?: number;
    text?: string;
  };
  let answers: ParsedAnswer[] = [];
  try {
    answers = JSON.parse(submission.answers);
  } catch {
    /* empty */
  }
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));

  const outcome = submission.outcomeId
    ? quiz.outcomes.find((o) => o.id === submission.outcomeId)
    : null;

  const isComplete = !!submission.completedAt;
  const display =
    [submission.firstName, submission.lastName].filter(Boolean).join(" ") ||
    submission.name ||
    "Anonymous";

  return (
    <div>
      <Link
        href={`/dashboard/quizzes/${quiz.id}/leads`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to leads
      </Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{display}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Started {submission.createdAt.toLocaleString()}
            {isComplete
              ? ` · Completed ${submission.completedAt!.toLocaleString()}`
              : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isComplete ? "Completed" : "In progress"}
        </span>
      </div>

      <section className="card mt-6 grid gap-4 md:grid-cols-3">
        <KV label="Email" value={submission.email} />
        <KV label="Phone" value={submission.phone} />
        <KV label="Company" value={submission.company} />
        <KV label="Job title" value={submission.jobTitle} />
        <KV
          label="GDPR consent"
          value={
            submission.consentedAt
              ? `Given ${submission.consentedAt.toLocaleString()}`
              : "—"
          }
        />
        <KV
          label="Marketing consent"
          value={submission.marketingConsent ? "Given" : "—"}
        />
      </section>

      <section className="card mt-6">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">
            {isComplete ? "Score" : "Running score (in progress)"}
          </h2>
          {outcome && (
            <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
              {outcome.title}
            </span>
          )}
        </div>
        <p className="mt-3 text-4xl font-bold text-slate-900">
          {submission.percent.toFixed(1)}%
        </p>
        <p className="text-sm text-slate-500">
          {submission.score.toFixed(1)} of {submission.maxScore.toFixed(1)} points
          {!isComplete && " so far"}
        </p>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Answers</h2>
        {answers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            No answers captured yet — respondent hasn't started answering questions.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-slate-100">
            {quiz.questions.map((q, i) => {
              const a = byQuestion.get(q.id);
              const rendered = renderAnswer(q, a);
              return (
                <li key={q.id} className="py-3">
                  <p className="text-sm font-medium text-slate-500">
                    Q{i + 1} · {typeLabel(q.type)}
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{q.text}</p>
                  <p className="mt-2 text-slate-700">
                    {rendered ? (
                      <span>{rendered.answer}</span>
                    ) : (
                      <span className="italic text-slate-400">Not answered</span>
                    )}
                    {rendered && (
                      <span className="ml-3 text-xs text-slate-500">
                        +{rendered.points.toFixed(1)} pts
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

function typeLabel(t: string) {
  if (t === "multi") return "Multiple choice";
  if (t === "scale") return "Scale";
  if (t === "text") return "Free text";
  return "Single choice";
}

type AnswerShape = {
  questionId: string;
  optionIds: string[];
  scaleValue?: number;
  text?: string;
};

function renderAnswer(
  q: {
    id: string;
    type: string;
    options: { id: string; text: string; score: number; minChars: number | null }[];
  },
  a: AnswerShape | undefined,
): { answer: string; points: number } | null {
  if (!a) return null;
  if (q.type === "scale") {
    if (typeof a.scaleValue !== "number") return null;
    return { answer: `${a.scaleValue} / 10`, points: a.scaleValue };
  }
  if (q.type === "text") {
    if (!a.text) return null;
    const len = a.text.trim().length;
    const earned = q.options
      .filter((o) => typeof o.minChars === "number" && len >= (o.minChars as number))
      .reduce((m, o) => Math.max(m, o.score), 0);
    return { answer: a.text, points: earned };
  }
  if (a.optionIds.length === 0) return null;
  const picked = a.optionIds.map((id) => q.options.find((o) => o.id === id)).filter(Boolean) as {
    id: string;
    text: string;
    score: number;
  }[];
  const pointsForMulti = q.type === "multi";
  const points = pointsForMulti
    ? picked.reduce((s, o) => s + o.score, 0)
    : picked[0]?.score ?? 0;
  return {
    answer: picked.map((p) => p.text).join("; "),
    points,
  };
}
