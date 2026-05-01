import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import SettingsTabs from "@/components/SettingsTabs";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, title: true },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Distribute
        </p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure how this scorecard looks, behaves and follows up.
        </p>
      </div>

      <SettingsTabs quizId={quiz.id} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
