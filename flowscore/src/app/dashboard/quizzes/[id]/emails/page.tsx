import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import EmailSettings from "@/components/EmailSettings";

export const dynamic = "force-dynamic";

export default async function EmailsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <EmailSettings
      quizId={quiz.id}
      quizTitle={quiz.title}
      ownerEmail={user.email}
      initial={{
        adminNotifyEmail: quiz.adminNotifyEmail ?? "",
        adminNotifyEnabled: quiz.adminNotifyEnabled,
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
