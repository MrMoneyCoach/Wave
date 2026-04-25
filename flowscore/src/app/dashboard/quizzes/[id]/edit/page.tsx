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

  const initial = {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    intro: quiz.intro,
    ctaLabel: quiz.ctaLabel,
    collectEmail: quiz.collectEmail,
    published: quiz.published,
    bookingUrl: quiz.bookingUrl ?? "",
    bookingLabel: quiz.bookingLabel ?? "",
    ownerName: quiz.ownerName ?? "",
    theme: (quiz.theme === "card" ? "card" : "minimal") as "minimal" | "card",
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: (["multi", "scale", "text"].includes(q.type) ? q.type : "single") as
        | "single"
        | "multi"
        | "scale"
        | "text",
      required: q.required,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        score: o.score,
        minChars: o.minChars,
      })),
    })),
    outcomes: quiz.outcomes.map((o) => ({
      id: o.id,
      minScore: o.minScore,
      maxScore: o.maxScore,
      title: o.title,
      description: o.description,
    })),
  };

  return <QuizEditor initial={initial} />;
}
