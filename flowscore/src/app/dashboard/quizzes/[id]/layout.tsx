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
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-65px)] flex-col md:-mx-8 md:-my-10 md:flex-row">
      <QuizSidebar
        quizId={quiz.id}
        quizTitle={quiz.title}
        published={quiz.published}
        slug={quiz.slug}
      />
      <div className="flex-1 overflow-x-auto px-4 py-6 md:px-8 md:py-8">
        {children}
      </div>
    </div>
  );
}
