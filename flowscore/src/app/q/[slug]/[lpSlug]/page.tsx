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

export default async function VariantPlayerPage({
  params,
}: {
  params: { slug: string; lpSlug: string };
}) {
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

  const lp = await prisma.landingPage.findUnique({
    where: { quizId_slug: { quizId: quiz.id, slug: params.lpSlug } },
  });
  if (!lp) return notFound();

  const variantHighlights = parseHighlights(lp.highlights);
  const primaryHighlights = parseHighlights(quiz.highlights);

  const safe = {
    id: quiz.id,
    slug: quiz.slug,
    title: lp.headline || quiz.title,
    intro: lp.subheadline || quiz.intro,
    ctaLabel: lp.ctaLabel || quiz.ctaLabel,
    collectEmail: quiz.collectEmail,
    theme: (quiz.theme === "card" ? "card" : "minimal") as "minimal" | "card",
    brandColor: lp.brandColor ?? quiz.brandColor,
    logoUrl: lp.logoUrl ?? quiz.logoUrl,
    heroImageUrl: lp.heroImageUrl ?? quiz.heroImageUrl,
    videoUrl: lp.videoUrl ?? quiz.videoUrl,
    highlights:
      variantHighlights.length > 0 ? variantHighlights : primaryHighlights,
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
