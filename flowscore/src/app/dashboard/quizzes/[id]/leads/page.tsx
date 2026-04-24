import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const submissions = await prisma.submission.findMany({
    where: { quizId: quiz.id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const outcomeMap = new Map(
    (await prisma.outcome.findMany({ where: { quizId: quiz.id } })).map((o) => [o.id, o]),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/quizzes/${quiz.id}/edit`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to quiz
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{quiz.title} — Leads</h1>
          <p className="text-sm text-slate-500">{submissions.length} submissions</p>
        </div>
        <a
          href={`/api/quizzes/${quiz.id}/leads-export`}
          className="btn-primary"
          download
        >
          Export CSV
        </a>
      </div>

      {submissions.length === 0 ? (
        <div className="card mt-6 text-center text-slate-600">
          No submissions yet. Share your quiz link to start collecting leads.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Date</th>
                <th className="whitespace-nowrap px-4 py-3">Name</th>
                <th className="whitespace-nowrap px-4 py-3">Email</th>
                <th className="whitespace-nowrap px-4 py-3">Phone</th>
                <th className="whitespace-nowrap px-4 py-3">Company</th>
                <th className="whitespace-nowrap px-4 py-3">Job title</th>
                <th className="whitespace-nowrap px-4 py-3">Score</th>
                <th className="whitespace-nowrap px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((s) => {
                const outcome = s.outcomeId ? outcomeMap.get(s.outcomeId) : null;
                const display =
                  [s.firstName, s.lastName].filter(Boolean).join(" ") || s.name || "—";
                return (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {s.createdAt.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{display}</td>
                    <td className="whitespace-nowrap px-4 py-3">{s.email || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{s.phone || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{s.company || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{s.jobTitle || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {s.percent.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{outcome?.title || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
