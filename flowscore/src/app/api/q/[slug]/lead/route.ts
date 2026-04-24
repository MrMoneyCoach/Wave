import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  firstName: z.string().min(1, "First name is required").max(200),
  lastName: z.string().max(200).optional().default(""),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().max(50).optional().default(""),
  company: z.string().max(200).optional().default(""),
  jobTitle: z.string().max(200).optional().default(""),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please confirm you agree to continue" }),
  }),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue
      ? `${issue.path.join(".") || "field"}: ${issue.message}`
      : "Invalid submission";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({ where: { slug: params.slug } });
  if (!quiz || !quiz.published) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { firstName, lastName, email, phone, company, jobTitle } = parsed.data;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const submission = await prisma.submission.create({
    data: {
      quizId: quiz.id,
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
      company: company || null,
      jobTitle: jobTitle || null,
      name: fullName || null,
      score: 0,
      maxScore: 0,
      percent: 0,
      answers: "[]",
      consentedAt: new Date(),
    },
  });

  return NextResponse.json({ submissionId: submission.id });
}
