import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer, type PdfBlock } from "@/lib/pdf";
import { buildPdfData } from "@/lib/submissionPdf";
import { emailConfigured, sendResultEmail } from "@/lib/email";

function parseBlocks(raw: string | null): PdfBlock[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = ["heading", "paragraph", "image", "list", "button", "divider"];
    return parsed.filter((b: unknown): b is PdfBlock => {
      if (!b || typeof b !== "object" || !("type" in b) || !("id" in b)) return false;
      return valid.includes((b as { type: string }).type);
    });
  } catch {
    return [];
  }
}

function sub(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? "");
}

function substituteBlocks(blocks: PdfBlock[], ctx: Record<string, string>): PdfBlock[] {
  return blocks.map((b) => {
    if (b.type === "heading" || b.type === "paragraph") {
      return { ...b, text: sub(b.text, ctx) };
    }
    if (b.type === "list") {
      return { ...b, items: b.items.map((i) => sub(i, ctx)) };
    }
    if (b.type === "button") {
      return { ...b, label: sub(b.label, ctx), url: sub(b.url, ctx) };
    }
    return b;
  });
}

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  submissionId: z.string().min(1),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().max(50).optional().default(""),
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
  const finalEmail = parsed.data.email.trim();
  const finalPhone = parsed.data.phone?.trim() ?? "";

  // Persist any updates the user made on the result page so the PDF
  // and our records reflect what they confirmed at the end.
  const updatedSubmission = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      email: finalEmail,
      phone: finalPhone || submission.phone,
    },
  });

  const ownerName =
    quiz.ownerName || quiz.user.name || quiz.user.email.split("@")[0];

  // Pick the default PDF report for this quiz, if the owner designed one.
  const report = await prisma.pdfReport.findFirst({
    where: { quizId: quiz.id, isDefault: true },
  });
  const outcome = updatedSubmission.outcomeId
    ? quiz.outcomes.find((o) => o.id === updatedSubmission.outcomeId)
    : undefined;
  const reportBlocks = report ? parseBlocks(report.blocks) : [];
  const subbedBlocks =
    reportBlocks.length > 0
      ? substituteBlocks(reportBlocks, {
          firstName: updatedSubmission.firstName ?? "",
          lastName: updatedSubmission.lastName ?? "",
          score: updatedSubmission.score.toFixed(1),
          percent: updatedSubmission.percent.toFixed(1),
          maxScore: updatedSubmission.maxScore.toFixed(1),
          outcomeTitle: outcome?.title ?? "",
          outcomeDescription: outcome?.description ?? "",
        })
      : undefined;

  const pdfData = buildPdfData({
    quiz: {
      title: quiz.title,
      ownerName,
      bookingUrl: quiz.bookingUrl,
      bookingLabel: quiz.bookingLabel,
      brandColor: quiz.brandColor,
      logoUrl: quiz.logoUrl,
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
    submission: updatedSubmission,
    bodyBlocks: subbedBlocks,
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
    to: finalEmail,
    subject: `Your ${quiz.title} results`,
    html: `
      <div style="font-family: Helvetica, Arial, sans-serif; color: #0f172a;">
        <p>Hi ${updatedSubmission.firstName ?? "there"},</p>
        <p>Your personalised results for <strong>${quiz.title}</strong> are attached as a PDF.</p>
        <p>You scored <strong>${updatedSubmission.percent.toFixed(1)}%</strong>${
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

  return NextResponse.json({ ok: true, sentTo: finalEmail });
}
