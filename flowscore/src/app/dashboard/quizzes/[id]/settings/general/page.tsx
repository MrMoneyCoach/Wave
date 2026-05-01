import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import GeneralSettingsForm from "@/components/settings/GeneralSettingsForm";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, title: true, slug: true },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const publicHost = appUrl ? new URL(appUrl).host : "your-domain.com";

  return (
    <GeneralSettingsForm
      quizId={quiz.id}
      initial={{ title: quiz.title, slug: quiz.slug }}
      publicHost={publicHost}
    />
  );
}
