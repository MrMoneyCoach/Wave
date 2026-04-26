import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf";
import { buildPdfData } from "@/lib/submissionPdf";
import { emailConfigured, sendResultEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  submissionId: z.string().min(1),
  marketingConsent: z.literal(true, {
    errorMap: () => ({ message: "Please tick the contact-consent box" }),
  }),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? issue.message : "Invalid request" },
      { status: 400 },
    );
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email delivery isn't set up yet. Please contact the quiz owner so they can configure it.",
      },
      { status: 503 },
    );
  }

  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: {
      user: true,
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      outcomes: true,
    },
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
  if (!submission.completedAt) {
    return NextResponse.json(
      { error: "Please complete the quiz first" },
      { status: 400 },
    );
  }
  if (!submission.email) {
    return NextResponse.json(
      {
        error:
          "We don't have an email on file for this submission. Please retake the quiz so we can send you the report.",
      },
      { status: 400 },
    );
  }

  const ownerName =
    quiz.ownerName || quiz.user.name || quiz.user.email.split("@")[0];

  const pdfData = buildPdfData({
    quiz: {
      title: quiz.title,
      ownerName,
      bookingUrl: quiz.bookingUrl,
      bookingLabel: quiz.bookingLabel,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      })),
      outcomes: quiz.outcomes.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
      })),
    },
    submission,
  });

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfBuffer(pdfData);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF failed";
    return NextResponse.json({ error: `PDF generation failed: ${msg}` }, { status: 500 });
  }

  const senderName = ownerName || "Flowscore";
  const emailResult = await sendResultEmail({
    to: submission.email,
    subject: `Your ${quiz.title} results`,
    html: `
      <div style="font-family: Helvetica, Arial, sans-serif; color: #0f172a;">
        <p>Hi ${submission.firstName ?? "there"},</p>
        <p>Your personalised results for <strong>${quiz.title}</strong> are attached as a PDF.</p>
        <p>You scored <strong>${submission.percent.toFixed(1)}%</strong>${
          pdfData.outcomeTitle ? ` — ${pdfData.outcomeTitle}` : ""
        }.</p>
        <p>Thanks for completing the scorecard.<br/>— ${senderName}</p>
      </div>
    `,
    pdf: pdfBuffer,
    filename: `${quiz.slug}-result.pdf`,
  });

  if (!emailResult.ok) {
    return NextResponse.json(
      {
        error: `We couldn't send your report (${
          emailResult.error ?? "unknown error"
        }). Please contact the quiz owner.`,
      },
      { status: 502 },
    );
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      marketingConsent: true,
      pdfSentAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, sentTo: submission.email });
}
