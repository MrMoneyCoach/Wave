import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";

const schema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionIds: z.array(z.string()).default([]),
      scaleValue: z.number().optional(),
    }),
  ),
  email: z.string().email().nullable().optional(),
  name: z.string().nullable().optional(),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: { questions: { include: { options: true } }, outcomes: true },
  });
  if (!quiz || !quiz.published) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  if (quiz.collectEmail && !parsed.data.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const scoringQuestions = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    options: q.options.map((o) => ({ id: o.id, score: o.score })),
  }));

  const { score, maxScore, percent } = computeScore(scoringQuestions, parsed.data.answers);

  const outcome = quiz.outcomes.find(
    (o) => percent >= o.minScore && percent <= o.maxScore,
  );

  const submission = await prisma.submission.create({
    data: {
      quizId: quiz.id,
      email: parsed.data.email ?? null,
      name: parsed.data.name ?? null,
      score,
      maxScore,
      percent,
      outcomeId: outcome?.id ?? null,
      answers: JSON.stringify(parsed.data.answers),
    },
  });

  return NextResponse.json({ submissionId: submission.id });
}
