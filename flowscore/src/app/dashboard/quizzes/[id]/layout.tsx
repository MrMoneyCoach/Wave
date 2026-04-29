import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import QuizSidebar from "@/components/QuizSidebar";

export const dynamic = "force-dynamic";

export default async function QuizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, title: true, slug: true, published: true },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <div className="-mx-6 -my-8 flex min-h-[calc(100vh-65px)]">
      <QuizSidebar
        quizId={quiz.id}
        quizTitle={quiz.title}
        published={quiz.published}
        slug={quiz.slug}
      />
      <div className="flex-1 overflow-x-auto px-8 py-8">{children}</div>
    </div>
  );
}
