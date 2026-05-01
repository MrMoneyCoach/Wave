import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import {
  DEFAULT_LANDING_BLOCKS,
  DEFAULT_PDF_BLOCKS,
  DEFAULT_RESULT_BLOCKS,
} from "@/lib/templates";
import { findTier, isWithinScorecardLimit } from "@/lib/tiers";

const schema = z.object({
  title: z.string().min(1).max(200),
  intro: z.string().max(2000).optional().default(""),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quiz data" }, { status: 400 });
  }

  // Enforce scorecard limit per the user's subscription tier.
  const tier = findTier(user.tier);
  const currentCount = await prisma.quiz.count({ where: { userId: user.id } });
  if (!isWithinScorecardLimit(tier, currentCount)) {
    return NextResponse.json(
      {
        error: `You're on the ${tier.name} plan, which includes ${tier.scorecardLimit} scorecard${tier.scorecardLimit === 1 ? "" : "s"}. Upgrade to add more.`,
        code: "scorecard_limit",
        tier: tier.id,
        limit: tier.scorecardLimit,
        currentCount,
      },
      { status: 402 },
    );
  }

  const quiz = await prisma.quiz.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      intro: parsed.data.intro,
      slug: slugify(parsed.data.title),
      landingBlocks: JSON.stringify(DEFAULT_LANDING_BLOCKS),
    },
  });

  // Seed a default Result Page and PDF Report so the new quiz has the full
  // branded report flow ready to edit, not a bare title/intro.
  await prisma.$transaction([
    prisma.resultPage.create({
      data: {
        quizId: quiz.id,
        name: "Default result page",
        isDefault: true,
        blocks: JSON.stringify(DEFAULT_RESULT_BLOCKS),
      },
    }),
    prisma.pdfReport.create({
      data: {
        quizId: quiz.id,
        name: "Default PDF report",
        isDefault: true,
        blocks: JSON.stringify(DEFAULT_PDF_BLOCKS),
      },
    }),
  ]);

  return NextResponse.json({ id: quiz.id, slug: quiz.slug });
}
