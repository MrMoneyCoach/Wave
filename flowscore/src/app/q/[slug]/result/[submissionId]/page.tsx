import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ResultView from "@/components/ResultView";
import type { Block } from "@/components/ResultPageBuilder";

export const dynamic = "force-dynamic";

function parseBlocks(raw: string | null): Block[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = ["heading", "paragraph", "image", "list", "button", "divider"];
    return parsed.filter((b: unknown): b is Block => {
      if (!b || typeof b !== "object" || !("type" in b) || !("id" in b)) return false;
      return valid.includes((b as { type: string }).type);
    });
  } catch {
    return [];
  }
}

function sub(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? "");
}

function substituteBlocks(blocks: Block[], ctx: Record<string, string>): Block[] {
  return blocks.map((b) => {
    if (b.type === "heading" || b.type === "paragraph") {
      return { ...b, text: sub(b.text, ctx) };
    }
    if (b.type === "list") {
      return { ...b, items: b.items.map((i) => sub(i, ctx)) };
    }
    if (b.type === "button") {
      return { ...b, label: sub(b.label, ctx), url: sub(b.url, ctx) };
    }
    if (b.type === "score-display") {
      return { ...b, label: sub(b.label, ctx) };
    }
    if (b.type === "hero-split") {
      return {
        ...b,
        headline: sub(b.headline, ctx),
        body: sub(b.body, ctx),
        ctaLabel: sub(b.ctaLabel, ctx),
        ctaUrl: sub(b.ctaUrl, ctx),
        bullets: b.bullets.map((x) => sub(x, ctx)),
      };
    }
    if (b.type === "image-text") {
      return {
        ...b,
        heading: sub(b.heading, ctx),
        body: sub(b.body, ctx),
        ctaLabel: sub(b.ctaLabel, ctx),
        ctaUrl: sub(b.ctaUrl, ctx),
      };
    }
    if (b.type === "feature-grid") {
      return {
        ...b,
        heading: sub(b.heading, ctx),
        subhead: sub(b.subhead, ctx),
        items: b.items.map((it) => ({
          ...it,
          title: sub(it.title, ctx),
          body: sub(it.body, ctx),
        })),
      };
    }
    return b;
  });
}

export default async function ResultPage({
  params,
}: {
  params: { slug: string; submissionId: string };
}) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.submissionId },
    include: { quiz: { include: { user: true } } },
  });
  if (!submission || submission.quiz.slug !== params.slug) return notFound();

  const outcome = submission.outcomeId
    ? await prisma.outcome.findUnique({ where: { id: submission.outcomeId } })
    : null;

  // Pick the right Result Page: prefer one tied to the submission's outcome,
  // else fall back to the quiz's default.
  const resultPage =
    (submission.outcomeId
      ? await prisma.resultPage.findFirst({
          where: { quizId: submission.quiz.id, outcomeId: submission.outcomeId },
        })
      : null) ??
    (await prisma.resultPage.findFirst({
      where: { quizId: submission.quiz.id, isDefault: true },
    }));

  const blocks = resultPage ? parseBlocks(resultPage.blocks) : [];
  const renderedBlocks = blocks.length
    ? substituteBlocks(blocks, {
        firstName: submission.firstName ?? "",
        lastName: submission.lastName ?? "",
        score: submission.score.toFixed(1),
        percent: submission.percent.toFixed(1),
        maxScore: submission.maxScore.toFixed(1),
        outcomeTitle: outcome?.title ?? "",
        outcomeDescription: outcome?.description ?? "",
      })
    : [];

  const ownerName =
    submission.quiz.ownerName ||
    submission.quiz.user.name ||
    submission.quiz.user.email.split("@")[0];

  return (
    <ResultView
      slug={submission.quiz.slug}
      quizTitle={submission.quiz.title}
      submission={{
        id: submission.id,
        firstName: submission.firstName,
        email: submission.email,
        phone: submission.phone,
        percent: submission.percent,
        score: submission.score,
        maxScore: submission.maxScore,
        marketingConsent: submission.marketingConsent,
        pdfSentAt: submission.pdfSentAt ? submission.pdfSentAt.toISOString() : null,
      }}
      outcome={
        outcome
          ? { title: outcome.title, description: outcome.description }
          : null
      }
      bookingUrl={submission.quiz.bookingUrl}
      bookingLabel={submission.quiz.bookingLabel || `Book a call with ${ownerName}`}
      ownerName={ownerName}
      brandColor={submission.quiz.brandColor || "#345ff2"}
      blocks={renderedBlocks}
    />
  );
}
