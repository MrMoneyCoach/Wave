import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { TIERS, findTier } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireAdmin();

  const [totalUsers, totalQuizzes, totalSubmissions, completedSubmissions, byTier, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.quiz.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { completedAt: { not: null } } }),
      prisma.user.groupBy({ by: ["tier"], _count: { _all: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, email: true, name: true, tier: true, createdAt: true },
      }),
    ]);

  const tierCounts = new Map(byTier.map((row) => [row.tier, row._count._all]));

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Master admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Snapshot of every account, scorecard and submission across Flowscore.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Users" value={totalUsers.toString()} />
        <Stat label="Scorecards" value={totalQuizzes.toString()} />
        <Stat label="Submissions" value={totalSubmissions.toString()} />
        <Stat
          label="Completed"
          value={completedSubmissions.toString()}
          sub={
            totalSubmissions === 0
              ? "no submissions yet"
              : `${Math.round((completedSubmissions / totalSubmissions) * 100)}% completion rate`
          }
        />
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Subscription tier mix</h2>
          <Link
            href="/admin/tiers"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            View tier definitions →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => {
            const count = tierCounts.get(t.id) ?? 0;
            const pct = totalUsers === 0 ? 0 : (count / totalUsers) * 100;
            return (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm font-semibold text-slate-700">{t.name}</p>
                <p className="mt-1 text-xs text-slate-500">{t.tagline}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-500">
                    {pct.toFixed(0)}% of users
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent sign-ups</h2>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            All users →
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No users yet.
                  </td>
                </tr>
              )}
              {recentUsers.map((u) => {
                const tier = findTier(u.tier);
                return (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="block font-medium text-slate-900 hover:underline"
                      >
                        {u.name || u.email.split("@")[0]}
                      </Link>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TierPill tierId={u.tier} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
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
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function TierPill({ tierId }: { tierId: string }) {
  const tier = findTier(tierId);
  const tone =
    tier.id === "free"
      ? "bg-slate-100 text-slate-700"
      : tier.id === "starter"
      ? "bg-sky-100 text-sky-800"
      : tier.id === "pro"
      ? "bg-violet-100 text-violet-800"
      : "bg-amber-100 text-amber-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {tier.name}
    </span>
  );
}
