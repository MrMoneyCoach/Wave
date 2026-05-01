import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import TrackingSettingsForm from "@/components/settings/TrackingSettingsForm";

export const dynamic = "force-dynamic";

export default async function TrackingPage({
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
      facebookPixelId: true,
      googleAnalyticsCode: true,
      googleTagManagerId: true,
      customTrackingScript: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <TrackingSettingsForm
      quizId={quiz.id}
      initial={{
        facebookPixelId: quiz.facebookPixelId ?? "",
        googleAnalyticsCode: quiz.googleAnalyticsCode ?? "",
        googleTagManagerId: quiz.googleTagManagerId ?? "",
        customTrackingScript: quiz.customTrackingScript ?? "",
      }}
    />
  );
}
