import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";

const schema = z.object({
  submissionId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionIds: z.array(z.string()).default([]),
      scaleValue: z.number().optional(),
      text: z.string().max(10000).optional(),
    }),
  ),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress update" }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: { questions: { include: { options: true } }, outcomes: true },
  });
  if (!quiz || !quiz.published) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: parsed.data.submissionId },
  });
  if (!submission || submission.quizId !== quiz.id) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.completedAt) {
    return NextResponse.json({ ok: true });
  }

  const scoringQuestions = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    options: q.options.map((o) => ({ id: o.id, score: o.score, minChars: o.minChars })),
  }));

  const { score, maxScore, percent } = computeScore(scoringQuestions, parsed.data.answers);
  const outcome = quiz.outcomes.find(
    (o) => percent >= o.minScore && percent <= o.maxScore,
  );

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      answers: JSON.stringify(parsed.data.answers),
      score,
      maxScore,
      percent,
      outcomeId: outcome?.id ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
