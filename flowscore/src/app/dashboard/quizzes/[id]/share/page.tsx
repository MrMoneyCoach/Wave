import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import EmbedAndShare from "@/components/EmbedAndShare";

export const dynamic = "force-dynamic";

export default async function SharePage({
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
      slug: true,
      published: true,
      brandColor: true,
      metaDescription: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const publicPath = `/q/${quiz.slug}`;
  const publicUrl = appUrl ? `${appUrl}${publicPath}` : publicPath;

  return (
    <EmbedAndShare
      quizId={quiz.id}
      quizTitle={quiz.title}
      published={quiz.published}
      brandColor={quiz.brandColor}
      metaDescription={quiz.metaDescription}
      publicUrl={publicUrl}
    />
  );
}
