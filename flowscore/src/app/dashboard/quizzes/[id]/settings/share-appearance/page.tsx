import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ShareAppearanceForm from "@/components/settings/ShareAppearanceForm";

export const dynamic = "force-dynamic";

export default async function ShareAppearancePage({
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
      title: true,
      metaTitle: true,
      metaDescription: true,
      shareImageUrl: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <ShareAppearanceForm
      quizId={quiz.id}
      initial={{
        metaTitle: quiz.metaTitle ?? "",
        metaDescription: quiz.metaDescription ?? "",
        shareImageUrl: quiz.shareImageUrl ?? "",
      }}
      placeholderTitle={quiz.title}
    />
  );
}
