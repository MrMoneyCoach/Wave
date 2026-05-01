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
  // The quiz's optinConsent setting controls what the public form
  // requires; the route just stores whatever it gets so downstream emails
  // know whether the visitor opted in.
  consent: z.boolean().optional().default(false),
  /** Optional — supplied when the visitor came back via an abandon-email
   *  link (?resume=<id>). Lets us update the existing submission rather
   *  than creating a duplicate. */
  resumeId: z.string().optional(),
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

  const { firstName, lastName, email, phone, company, jobTitle, resumeId, consent } =
    parsed.data;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  // For "implied" consent quizzes the act of submitting the form is the
  // consent. For "optional"/"required" we trust the boolean we got back.
  const optedIn = quiz.optinConsent === "implied" ? true : !!consent;

  if (resumeId) {
    const existing = await prisma.submission.findUnique({
      where: { id: resumeId },
    });
    if (
      existing &&
      existing.quizId === quiz.id &&
      !existing.completedAt
    ) {
      const updated = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName: lastName || null,
          email,
          phone: phone || null,
          company: company || null,
          jobTitle: jobTitle || null,
          name: fullName || null,
          marketingConsent: optedIn || existing.marketingConsent,
          consentedAt:
            existing.consentedAt ?? (optedIn ? new Date() : null),
        },
      });
      return NextResponse.json({ submissionId: updated.id, resumed: true });
    }
    // resumeId was stale or invalid — fall through to create.
  }

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
      marketingConsent: optedIn,
      consentedAt: optedIn ? new Date() : null,
    },
  });

  return NextResponse.json({ submissionId: submission.id });
}
