import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { outcomes: { orderBy: { minScore: "asc" } } },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const submissions = await prisma.submission.findMany({
    where: { quizId: quiz.id },
  });

  const total = submissions.length;
  const withEmail = submissions.filter((s) => !!s.email).length;
  const avg =
    total === 0 ? 0 : submissions.reduce((a, s) => a + s.percent, 0) / total;

  const last30 = new Array(30).fill(0).map((_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (29 - i));
    return day;
  });
  const counts = last30.map((d) => {
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    return submissions.filter((s) => s.createdAt >= d && s.createdAt < end).length;
  });
  const max = Math.max(1, ...counts);

  const outcomeCounts = quiz.outcomes.map((o) => ({
    outcome: o,
    count: submissions.filter((s) => s.outcomeId === o.id).length,
  }));

  return (
    <div>
      <Link
        href={`/dashboard/quizzes/${quiz.id}/edit`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to quiz
      </Link>
      <h1 className="mt-1 text-2xl font-bold">{quiz.title} — Analytics</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Submissions" value={total.toString()} />
        <Stat label="Avg score" value={`${avg.toFixed(1)}%`} />
        <Stat
          label="Email capture rate"
          value={total === 0 ? "—" : `${Math.round((withEmail / total) * 100)}%`}
        />
      </div>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Submissions (last 30 days)</h2>
        <div className="mt-4 flex h-32 items-end gap-1">
          {counts.map((c, i) => (
            <div key={i} className="flex h-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-sm bg-brand-500"
                style={{ height: `${(c / max) * 100}%`, minHeight: c > 0 ? 2 : 0 }}
                title={`${last30[i].toLocaleDateString()}: ${c}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Outcome distribution</h2>
        {outcomeCounts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No outcomes defined yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {outcomeCounts.map(({ outcome, count }) => {
              const pct = total === 0 ? 0 : (count / total) * 100;
              return (
                <div key={outcome.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{outcome.title}</span>
                    <span className="text-slate-500">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded bg-slate-100">
                    <div
                      className="h-full rounded bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
