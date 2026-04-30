import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import QuestionsBuilder, {
  type Question,
  type Outcome,
  type SaveContext,
} from "@/components/QuestionsBuilder";

export const dynamic = "force-dynamic";

function parseHighlights(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    /* ignore */
  }
  return [];
}

export default async function QuestionsPage({
  params,
}: {
  params: { id: string };
}) {
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

  const questions: Question[] = quiz.questions.map((q) => ({
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
  }));

  const outcomes: Outcome[] = quiz.outcomes.map((o) => ({
    id: o.id,
    minScore: o.minScore,
    maxScore: o.maxScore,
    title: o.title,
    description: o.description,
  }));

  // Round-trip context for the existing PUT /api/quizzes/[id] endpoint —
  // the builder only edits questions + outcomes, but the API expects the
  // full quiz on save.
  const saveContext: SaveContext = {
    title: quiz.title,
    intro: quiz.intro,
    ctaLabel: quiz.ctaLabel,
    collectEmail: quiz.collectEmail,
    bookingUrl: quiz.bookingUrl ?? "",
    bookingLabel: quiz.bookingLabel ?? "",
    ownerName: quiz.ownerName ?? "",
    theme: quiz.theme === "card" ? "card" : "minimal",
    brandColor: quiz.brandColor ?? "",
    logoUrl: quiz.logoUrl ?? "",
    heroImageUrl: quiz.heroImageUrl ?? "",
    videoUrl: quiz.videoUrl ?? "",
    highlights: parseHighlights(quiz.highlights),
  };

  return (
    <QuestionsBuilder
      quizId={quiz.id}
      quizTitle={quiz.title}
      quizSlug={quiz.slug}
      published={quiz.published}
      brandColor={quiz.brandColor || "#345ff2"}
      initialQuestions={questions}
      initialOutcomes={outcomes}
      saveContext={saveContext}
    />
  );
}
