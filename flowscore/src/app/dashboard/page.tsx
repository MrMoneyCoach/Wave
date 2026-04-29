import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await requireUser();
  const quizzes = await prisma.quiz.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true, questions: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Your quizzes</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/templates" className="btn-secondary">
            Browse templates
          </Link>
          <Link href="/dashboard/quizzes/new" className="btn-primary">
            + New quiz
          </Link>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="card mt-8 text-center">
          <h2 className="text-lg font-semibold">No quizzes yet</h2>
          <p className="mt-2 text-slate-600">
            Pick a starting point — start from a template, or build one from scratch.
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
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {quizzes.map((q) => (
            <div key={q.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/dashboard/quizzes/${q.id}`}
                    className="text-lg font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {q.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {q._count.questions} questions · {q._count.submissions} submissions
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    q.published
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {q.published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link href={`/dashboard/quizzes/${q.id}/edit`} className="btn-secondary">
                  Edit
                </Link>
                <Link href={`/dashboard/quizzes/${q.id}/leads`} className="btn-secondary">
                  Leads
                </Link>
                <Link href={`/dashboard/quizzes/${q.id}/analytics`} className="btn-secondary">
                  Analytics
                </Link>
                {q.published && (
                  <Link
                    href={`/q/${q.slug}`}
                    target="_blank"
                    className="btn-secondary"
                  >
                    View live ↗
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
