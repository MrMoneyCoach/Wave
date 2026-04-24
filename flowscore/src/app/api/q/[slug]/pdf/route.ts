import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf";
import { buildPdfData } from "@/lib/submissionPdf";
import { emailConfigured, sendResultEmail } from "@/lib/email";
import { signPdfToken } from "@/lib/pdfToken";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  submissionId: z.string().min(1),
  emailConfirm: z.string().email("Please enter a valid email"),
  phoneConfirm: z.string().min(7, "Please enter a valid phone number").max(50),
  marketingConsent: z.literal(true, {
    errorMap: () => ({ message: "Please tick the contact-consent box" }),
  }),
});

function normPhone(v: string): string {
  return v.replace(/[^0-9+]/g, "");
}

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

  const emailMatches =
    submission.email &&
    submission.email.trim().toLowerCase() ===
      parsed.data.emailConfirm.trim().toLowerCase();
  if (!emailMatches) {
    return NextResponse.json(
      { error: "Email doesn't match the one you provided at the start." },
      { status: 400 },
    );
  }

  const normalisedPhone = normPhone(parsed.data.phoneConfirm);
  if (submission.phone) {
    if (normPhone(submission.phone) !== normalisedPhone) {
      return NextResponse.json(
        { error: "Phone doesn't match the one you provided at the start." },
        { status: 400 },
      );
    }
  }

  const ownerName =
    quiz.ownerName || quiz.user.name || quiz.user.email.split("@")[0];

  const pdfData = buildPdfData({
    quiz: {
      title: quiz.title,
      ownerName,
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

  let emailResult: { ok: boolean; error?: string } = { ok: false };
  if (emailConfigured()) {
    const senderName = ownerName || "Flowscore";
    emailResult = await sendResultEmail({
      to: parsed.data.emailConfirm,
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
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      marketingConsent: true,
      verifiedPhone: normalisedPhone || null,
      pdfSentAt: emailResult.ok ? new Date() : submission.pdfSentAt,
      phone: submission.phone ?? (parsed.data.phoneConfirm || null),
    },
  });

  const token = signPdfToken(submission.id);
  return NextResponse.json({
    ok: true,
    emailed: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
    downloadUrl: `/api/q/${params.slug}/pdf-download?sid=${submission.id}&t=${token}`,
  });
}
