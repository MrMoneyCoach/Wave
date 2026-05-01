import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import AbandonEmailSettingsForm from "@/components/settings/AbandonEmailSettingsForm";

export const dynamic = "force-dynamic";

export default async function AbandonEmailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      abandonEmailEnabled: true,
      abandonEmailSubject: true,
      abandonEmailIntro: true,
      abandonEmailSignoff: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <AbandonEmailSettingsForm
      quizId={quiz.id}
      initial={{
        abandonEmailEnabled: quiz.abandonEmailEnabled,
        abandonEmailSubject: quiz.abandonEmailSubject ?? "",
        abandonEmailIntro: quiz.abandonEmailIntro ?? "",
        abandonEmailSignoff: quiz.abandonEmailSignoff ?? "",
      }}
    />
  );
}
