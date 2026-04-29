import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizPlayer from "@/components/QuizPlayer";

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

export default async function QuizPublicPage({ params }: { params: { slug: string } }) {
  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!quiz || !quiz.published) return notFound();

  const safe = {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    intro: quiz.intro,
    ctaLabel: quiz.ctaLabel,
    collectEmail: quiz.collectEmail,
    theme: (quiz.theme === "card" ? "card" : "minimal") as "minimal" | "card",
    brandColor: quiz.brandColor,
    logoUrl: quiz.logoUrl,
    heroImageUrl: quiz.heroImageUrl,
    videoUrl: quiz.videoUrl,
    highlights: parseHighlights(quiz.highlights),
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type as "single" | "multi" | "scale" | "text",
      required: q.required,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };

  return <QuizPlayer quiz={safe} />;
}
