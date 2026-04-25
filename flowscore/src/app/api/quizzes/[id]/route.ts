import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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
