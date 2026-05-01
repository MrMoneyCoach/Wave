import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import NotificationSettingsForm from "@/components/settings/NotificationSettingsForm";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
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
      adminNotifyEmail: true,
      adminNotifyEnabled: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <NotificationSettingsForm
      quizId={quiz.id}
      ownerEmail={user.email}
      initial={{
        adminNotifyEmail: quiz.adminNotifyEmail ?? "",
        adminNotifyEnabled: quiz.adminNotifyEnabled,
      }}
    />
  );
}
