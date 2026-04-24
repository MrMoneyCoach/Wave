import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import QuizEditor from "@/components/QuizEditor";

export const dynamic = "force-dynamic";

export default async function EditQuizPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      outcomes: { orderBy: { minScore: "asc" } },
    },
  });

  if (!quiz || quiz.userId !== user.id) return notFound();

  return <QuizEditor initial={quiz} />;
}
