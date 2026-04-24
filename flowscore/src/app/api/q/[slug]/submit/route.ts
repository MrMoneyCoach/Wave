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
      text: z.string().max(10000).optional(),
    }),
  ),
  firstName: z.string().min(1, "First name is required").max(200),
  lastName: z.string().max(200).optional().default(""),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().max(50).optional().default(""),
  company: z.string().max(200).optional().default(""),
  jobTitle: z.string().max(200).optional().default(""),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join(".") || "field"}: ${firstIssue.message}`
      : "Invalid submission";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: { questions: { include: { options: true } }, outcomes: true },
  });
  if (!quiz || !quiz.published) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
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

  const { firstName, lastName, email, phone, company, jobTitle } = parsed.data;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const submission = await prisma.submission.create({
    data: {
      quizId: quiz.id,
      email,
      name: fullName || null,
      firstName,
      lastName: lastName || null,
      phone: phone || null,
      company: company || null,
      jobTitle: jobTitle || null,
      score,
      maxScore,
      percent,
      outcomeId: outcome?.id ?? null,
      answers: JSON.stringify(parsed.data.answers),
    },
  });

  return NextResponse.json({ submissionId: submission.id });
}
