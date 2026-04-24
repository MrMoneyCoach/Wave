import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: { slug: string; submissionId: string };
}) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.submissionId },
    include: { quiz: true },
  });
  if (!submission || submission.quiz.slug !== params.slug) return notFound();

  const outcome = submission.outcomeId
    ? await prisma.outcome.findUnique({ where: { id: submission.outcomeId } })
    : null;

  const percent = submission.percent;

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="card">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            Your Flowscore result
          </p>
          <h1 className="mt-1 text-3xl font-bold">{submission.quiz.title}</h1>

          <div className="mt-6 flex flex-col items-center gap-4 md:flex-row">
            <ScoreDial percent={percent} />
            <div>
              <p className="text-5xl font-bold text-slate-900">{percent.toFixed(1)}%</p>
              <p className="mt-1 text-sm text-slate-500">
                {submission.score.toFixed(1)} of {submission.maxScore.toFixed(1)} points
              </p>
            </div>
          </div>

          {outcome ? (
            <div className="mt-8 rounded-lg border border-brand-200 bg-brand-50 p-5">
              <h2 className="text-xl font-semibold text-brand-800">{outcome.title}</h2>
              {outcome.description && (
                <p className="mt-2 whitespace-pre-wrap text-brand-900/90">{outcome.description}</p>
              )}
            </div>
          ) : (
            <p className="mt-6 text-slate-600">
              Thanks for completing the quiz — your score has been recorded.
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            <Link href={`/q/${submission.quiz.slug}`} className="btn-secondary">
              Retake
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by Flowscore</p>
      </div>
    </main>
  );
}

function ScoreDial({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="none" />
      <circle
        cx="70"
        cy="70"
        r={radius}
        stroke="#345ff2"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
      />
    </svg>
  );
}
