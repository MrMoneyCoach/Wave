import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { findTier } from "@/lib/tiers";

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  score: z.number(),
  minChars: z.number().int().nullable().optional(),
});

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  type: z.enum(["single", "multi", "scale", "text"]),
  required: z.boolean().default(true),
  options: z.array(optionSchema).default([]),
});

const outcomeSchema = z.object({
  id: z.string().optional(),
  minScore: z.number(),
  maxScore: z.number(),
  title: z.string().min(1),
  description: z.string().default(""),
});

const updateSchema = z.object({
  title: z.string().min(1),
  intro: z.string().default(""),
  ctaLabel: z.string().default("Start"),
  collectEmail: z.boolean().default(true),
  published: z.boolean().default(false),
  bookingUrl: z.string().max(500).optional().default(""),
  bookingLabel: z.string().max(200).optional().default(""),
  ownerName: z.string().max(200).optional().default(""),
  theme: z.enum(["minimal", "card"]).default("minimal"),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/i, "Use a 6-digit hex like #345ff2")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  highlights: z.array(z.string().max(140)).max(8).optional().default([]),
  questions: z.array(questionSchema),
  outcomes: z.array(outcomeSchema),
});

async function authOwned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz || quiz.userId !== user.id)
    return { error: "Not found" as const, status: 404 };
  return { user, quiz };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const check = await authOwned(params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
      outcomes: { orderBy: { minScore: "asc" } },
    },
  });
  return NextResponse.json(quiz);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const check = await authOwned(params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .slice(0, 5)
      .join("; ");
    return NextResponse.json(
      { error: `Invalid quiz — ${issues}`, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Publishing a previously-draft scorecard counts against the user's tier
  // limit (drafts are unlimited; only live scorecards are capped). Going
  // from live → draft (unpublishing) and edits to an already-live quiz are
  // always allowed.
  const goingLive = data.published && !check.quiz.published;
  if (goingLive) {
    const tier = findTier(check.user.tier);
    if (tier.scorecardLimit !== -1) {
      const liveCount = await prisma.quiz.count({
        where: {
          userId: check.user.id,
          published: true,
          NOT: { id: params.id },
        },
      });
      if (liveCount >= tier.scorecardLimit) {
        return NextResponse.json(
          {
            error: `You're on the ${tier.name} plan, which allows ${tier.scorecardLimit} live scorecard${tier.scorecardLimit === 1 ? "" : "s"}. Unpublish another one or upgrade your plan to publish this.`,
            code: "scorecard_limit",
            tier: tier.id,
            limit: tier.scorecardLimit,
            currentCount: liveCount,
          },
          { status: 402 },
        );
      }
    }
  }

  const questionRows = data.questions.map((q, i) => ({
    id: randomUUID(),
    quizId: params.id,
    order: i,
    text: q.text,
    type: q.type,
    required: q.required,
  }));

  const optionRows = data.questions.flatMap((q, qi) =>
    q.options.map((o, j) => ({
      id: randomUUID(),
      questionId: questionRows[qi].id,
      order: j,
      text: o.text,
      score: o.score,
      minChars: o.minChars ?? null,
    })),
  );

  const outcomeRows = data.outcomes.map((o) => ({
    quizId: params.id,
    minScore: o.minScore,
    maxScore: o.maxScore,
    title: o.title,
    description: o.description,
  }));

  try {
    await prisma.$transaction([
      prisma.quiz.update({
        where: { id: params.id },
        data: {
          title: data.title,
          intro: data.intro,
          ctaLabel: data.ctaLabel,
          collectEmail: data.collectEmail,
          published: data.published,
          bookingUrl: data.bookingUrl || null,
          bookingLabel: data.bookingLabel || null,
          ownerName: data.ownerName || null,
          theme: data.theme,
          brandColor: data.brandColor || null,
          logoUrl: data.logoUrl || null,
          heroImageUrl: data.heroImageUrl || null,
          videoUrl: data.videoUrl || null,
          highlights: (() => {
            const clean = (data.highlights ?? []).map((s) => s.trim()).filter(Boolean);
            return clean.length > 0 ? JSON.stringify(clean) : null;
          })(),
        },
      }),
      prisma.question.deleteMany({ where: { quizId: params.id } }),
      prisma.outcome.deleteMany({ where: { quizId: params.id } }),
      ...(questionRows.length
        ? [prisma.question.createMany({ data: questionRows })]
        : []),
      ...(optionRows.length
        ? [prisma.answerOption.createMany({ data: optionRows })]
        : []),
      ...(outcomeRows.length
        ? [prisma.outcome.createMany({ data: outcomeRows })]
        : []),
    ]);
  } catch (err) {
    console.error("Save quiz failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Save failed: ${message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const check = await authOwned(params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  await prisma.quiz.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
