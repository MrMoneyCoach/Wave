import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminUsersList from "@/components/AdminUsersList";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { quizzes: true } },
    },
  });

  const items = users.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    tier: u.tier,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
    scorecardCount: u._count.quizzes,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Master admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every account on Flowscore. Click a user to change their tier or grant
          admin access.
        </p>
      </div>
      <AdminUsersList items={items} />
    </div>
  );
}
