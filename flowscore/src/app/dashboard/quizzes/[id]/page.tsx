import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import DeleteScorecardButton from "@/components/DeleteScorecardButton";

export const dynamic = "force-dynamic";

export default async function ScorecardHomePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { questions: true, submissions: true, outcomes: true } },
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const submissions = await prisma.submission.findMany({
    where: { quizId: quiz.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const total = submissions.length === 0
    ? 0
    : await prisma.submission.count({ where: { quizId: quiz.id } });
  const completed = total === 0
    ? 0
    : await prisma.submission.count({
        where: { quizId: quiz.id, completedAt: { not: null } },
      });
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const publicPath = `/q/${quiz.slug}`;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const publicUrl = appUrl ? `${appUrl}${publicPath}` : publicPath;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Scorecard Home
          </p>
          <h1 className="mt-1 text-2xl font-bold">{quiz.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {quiz._count.questions} questions · {quiz._count.outcomes} outcomes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/quizzes/${quiz.id}/edit`} className="btn-secondary">
            Edit questions
          </Link>
          {quiz.published ? (
            <a href={publicPath} target="_blank" className="btn-primary">
              View live ↗
            </a>
          ) : (
            <Link href={`/dashboard/quizzes/${quiz.id}/edit`} className="btn-primary">
              Finish & publish
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="Total leads" value={total.toString()} />
        <Stat label="Completed" value={completed.toString()} />
        <Stat
          label="Completion rate"
          value={total === 0 ? "—" : `${completionRate}%`}
        />
      </div>

      <section className="card mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent leads</h2>
          <Link
            href={`/dashboard/quizzes/${quiz.id}/leads`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            See all →
          </Link>
        </div>
        {submissions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No leads yet. Share your scorecard link once it's published.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {submissions.map((s) => {
              const display =
                [s.firstName, s.lastName].filter(Boolean).join(" ") ||
                s.name ||
                s.email ||
                "Anonymous";
              return (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/quizzes/${quiz.id}/leads/${s.id}`}
                    className="flex items-center justify-between py-3 text-sm hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{display}</p>
                      <p className="text-xs text-slate-500">
                        {s.email || "no email"} ·{" "}
                        {s.createdAt.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.completedAt
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {s.completedAt ? "Completed" : "In progress"}
                      </span>
                      <span className="font-medium text-slate-900">
                        {s.percent.toFixed(1)}%
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {quiz.published && (
        <section className="card mt-6">
          <h2 className="text-lg font-semibold">Share</h2>
          <p className="mt-2 text-sm text-slate-600">Public URL:</p>
          <code className="mt-2 block break-all rounded bg-slate-50 px-3 py-2 text-sm text-slate-800">
            {publicUrl}
          </code>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-red-200 bg-red-50/40 p-5">
        <h2 className="text-base font-semibold text-red-900">Danger zone</h2>
        <p className="mt-1 text-sm text-red-800/80">
          Deleting this scorecard will permanently remove every lead, submission,
          landing page, result page and email setting attached to it. This can't be
          undone.
        </p>
        <div className="mt-4">
          <DeleteScorecardButton
            quizId={quiz.id}
            quizTitle={quiz.title}
            redirectTo="/dashboard"
            variant="button"
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
