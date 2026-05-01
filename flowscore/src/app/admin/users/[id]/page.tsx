import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminUserActions from "@/components/AdminUserActions";
import { findTier } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { quizzes: true } },
      quizzes: {
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          _count: { select: { submissions: true, questions: true } },
        },
      },
    },
  });
  if (!user) return notFound();

  const tier = findTier(user.tier);
  const submissionCount = await prisma.submission.count({
    where: { quiz: { userId: user.id } },
  });
  const isSelf = user.id === me.id;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/users"
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← All users
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            {user.name || user.email.split("@")[0]}
            {user.isAdmin && (
              <span className="ml-3 inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                Admin
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Current tier" value={tier.name} sub={tier.tagline} />
        <Stat
          label="Scorecards"
          value={user._count.quizzes.toString()}
          sub={
            tier.scorecardLimit === -1
              ? "Unlimited on this tier"
              : `${tier.scorecardLimit} included on this tier`
          }
        />
        <Stat label="Submissions" value={submissionCount.toString()} sub="across all scorecards" />
      </div>

      <AdminUserActions
        userId={user.id}
        currentTier={user.tier}
        currentIsAdmin={user.isAdmin}
        isSelf={isSelf}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent scorecards</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {user.quizzes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No scorecards yet.
                  </td>
                </tr>
              )}
              {user.quizzes.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{q.title}</p>
                    <p className="text-xs text-slate-500">{q.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        q.published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {q.published ? "Live" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {q._count.questions}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {q._count.submissions}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {q.updatedAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
