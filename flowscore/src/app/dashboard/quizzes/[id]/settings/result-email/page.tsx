import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ResultEmailSettingsForm from "@/components/settings/ResultEmailSettingsForm";

export const dynamic = "force-dynamic";

export default async function ResultEmailPage({
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
      emailSubject: true,
      emailGreeting: true,
      emailIntro: true,
      emailBullets: true,
      emailBookingLine: true,
      emailSignoff: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <ResultEmailSettingsForm
      quizId={quiz.id}
      initial={{
        emailSubject: quiz.emailSubject ?? "",
        emailGreeting: quiz.emailGreeting ?? "",
        emailIntro: quiz.emailIntro ?? "",
        emailBullets: quiz.emailBullets ?? "",
        emailBookingLine: quiz.emailBookingLine ?? "",
        emailSignoff: quiz.emailSignoff ?? "",
      }}
    />
  );
}
