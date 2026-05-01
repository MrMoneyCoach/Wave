import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import BrandingSettingsForm from "@/components/settings/BrandingSettingsForm";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage({
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
      logoUrl: true,
      squareIconUrl: true,
      brandColor: true,
      secondaryColor: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <BrandingSettingsForm
      quizId={quiz.id}
      initial={{
        logoUrl: quiz.logoUrl ?? "",
        squareIconUrl: quiz.squareIconUrl ?? "",
        brandColor: quiz.brandColor ?? "#345ff2",
        secondaryColor: quiz.secondaryColor ?? "#0f172a",
      }}
    />
  );
}
