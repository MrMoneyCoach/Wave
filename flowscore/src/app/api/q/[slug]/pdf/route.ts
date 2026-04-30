import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer, type PdfBlock } from "@/lib/pdf";
import { buildPdfData } from "@/lib/submissionPdf";
import { emailConfigured, sendResultEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

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

const schema = z.object({
  submissionId: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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
      { error: "Submission isn't complete yet" },
      { status: 400 },
    );
  }
  if (!submission.email) {
    return NextResponse.json(
      { error: "No email captured for this submission" },
      { status: 400 },
    );
  }

  // Idempotent: if we've already emailed this submission, just return success.
  if (submission.pdfSentAt) {
    return NextResponse.json({ ok: true, alreadySent: true, sentTo: submission.email });
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

  const ownerName =
    quiz.ownerName || quiz.user.name || quiz.user.email.split("@")[0];

  const report = await prisma.pdfReport.findFirst({
    where: { quizId: quiz.id, isDefault: true },
  });
  const outcome = submission.outcomeId
    ? quiz.outcomes.find((o) => o.id === submission.outcomeId)
    : undefined;
  const reportBlocks = report ? parseBlocks(report.blocks) : [];
  const subbedBlocks =
    reportBlocks.length > 0
      ? substituteBlocks(reportBlocks, {
          firstName: submission.firstName ?? "",
          lastName: submission.lastName ?? "",
          score: submission.score.toFixed(1),
          percent: submission.percent.toFixed(1),
          maxScore: submission.maxScore.toFixed(1),
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
    submission,
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
  const brand = quiz.brandColor || "#345ff2";

  const ctx: Record<string, string> = {
    firstName: submission.firstName ?? "there",
    lastName: submission.lastName ?? "",
    quizTitle: quiz.title,
    percent: submission.percent.toFixed(1),
    outcomeTitle: pdfData.outcomeTitle ?? "",
    outcomeDescription: pdfData.outcomeDescription ?? "",
    ownerName: senderName,
  };
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const subOne = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? "");
  const subEsc = (text: string) => escape(subOne(text));
  const para = (text: string) =>
    text
      ? text
          .split(/\n\n+/)
          .map((p) => `<p style="margin: 0 0 14px;">${escape(subOne(p)).replace(/\n/g, "<br/>")}</p>`)
          .join("")
      : "";

  const subjectTpl =
    quiz.emailSubject?.trim() || "Your {{quizTitle}} results";
  const greetingTpl =
    quiz.emailGreeting?.trim() || "Hi {{firstName}},";
  const introTpl =
    quiz.emailIntro?.trim() ||
    "Thank you for completing the {{quizTitle}}. Your personalised report is attached as a PDF.\n\nYou scored {{percent}}% — {{outcomeTitle}}.";
  const bulletsRaw = quiz.emailBullets?.trim() || "";
  const bookingLineTpl =
    quiz.emailBookingLine?.trim() ||
    (quiz.bookingUrl
      ? "Want to talk through your results? Book a no-obligation call."
      : "");
  const signoffTpl =
    quiz.emailSignoff?.trim() || "Thanks,\n— {{ownerName}}";

  const bulletItems = bulletsRaw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bulletsHtml =
    bulletItems.length > 0
      ? `<ul style="margin: 0 0 14px; padding-left: 20px;">${bulletItems
          .map((b) => `<li style="margin-bottom: 4px;">${subEsc(b)}</li>`)
          .join("")}</ul>`
      : "";
  const bookingHtml = quiz.bookingUrl
    ? `<p style="margin: 18px 0 14px;"><a href="${escape(quiz.bookingUrl)}" style="display: inline-block; background: ${brand}; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">${escape(quiz.bookingLabel || `Book a call with ${senderName}`)}</a></p>`
    : "";

  const html = `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #0f172a; max-width: 580px; line-height: 1.5;">
      ${para(greetingTpl)}
      ${para(introTpl)}
      ${bulletsHtml}
      ${para(bookingLineTpl)}
      ${bookingHtml}
      ${para(signoffTpl)}
    </div>
  `;

  const emailResult = await sendResultEmail({
    to: submission.email,
    subject: subOne(subjectTpl),
    html,
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
    data: { pdfSentAt: new Date() },
  });

  return NextResponse.json({ ok: true, sentTo: submission.email });
}
