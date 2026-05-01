import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ScorecardsList from "@/components/ScorecardsList";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await requireUser();
  const quizzes = await prisma.quiz.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { submissions: true, questions: true } },
    },
  });

  const submissionLatest = await prisma.submission.groupBy({
    by: ["quizId"],
    where: { quizId: { in: quizzes.map((q) => q.id) } },
    _max: { createdAt: true },
  });
  const lastByQuiz = new Map(
    submissionLatest.map((s) => [s.quizId, s._max.createdAt as Date | null]),
  );

  const items = quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    slug: q.slug,
    published: q.published,
    brandColor: q.brandColor || null,
    questionCount: q._count.questions,
    submissionCount: q._count.submissions,
    lastActivity: (lastByQuiz.get(q.id) ?? q.updatedAt).toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Your Scorecards
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {quizzes.length === 0
              ? "Pick a starting point — start from a template, or build one from scratch."
              : `${quizzes.length} scorecard${quizzes.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/templates" className="btn-secondary">
            Browse templates
          </Link>
          <Link href="/dashboard/quizzes/new" className="btn-primary">
            + Create scorecard
          </Link>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="card mt-8 text-center">
          <h2 className="text-lg font-semibold">No scorecards yet</h2>
          <p className="mt-2 text-slate-600">
            Pick a template to get a fully-ready scorecard, or start from a blank
            quiz and edit everything yourself.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/dashboard/templates" className="btn-primary">
              Browse templates
            </Link>
            <Link href="/dashboard/quizzes/new" className="btn-secondary">
              Start from blank
            </Link>
          </div>
        </div>
      ) : (
        <ScorecardsList items={items} />
      )}
    </div>
  );
}
