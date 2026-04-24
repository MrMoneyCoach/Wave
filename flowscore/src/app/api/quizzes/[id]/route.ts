import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  type: z.enum(["single", "multi", "scale"]),
  required: z.boolean().default(true),
  options: z
    .array(z.object({ id: z.string().optional(), text: z.string(), score: z.number() }))
    .default([]),
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
    return NextResponse.json({ error: "Invalid quiz", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.quiz.update({
      where: { id: params.id },
      data: {
        title: data.title,
        intro: data.intro,
        ctaLabel: data.ctaLabel,
        collectEmail: data.collectEmail,
        published: data.published,
      },
    });

    await tx.answerOption.deleteMany({ where: { question: { quizId: params.id } } });
    await tx.question.deleteMany({ where: { quizId: params.id } });
    await tx.outcome.deleteMany({ where: { quizId: params.id } });

    for (const [i, q] of data.questions.entries()) {
      await tx.question.create({
        data: {
          quizId: params.id,
          order: i,
          text: q.text,
          type: q.type,
          required: q.required,
          options: {
            create: q.options.map((o, j) => ({
              order: j,
              text: o.text,
              score: o.score,
            })),
          },
        },
      });
    }

    for (const o of data.outcomes) {
      await tx.outcome.create({
        data: {
          quizId: params.id,
          minScore: o.minScore,
          maxScore: o.maxScore,
          title: o.title,
          description: o.description,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const check = await authOwned(params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  await prisma.quiz.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
