import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { emailConfigured, sendNotification } from "@/lib/email";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: {
      user: true,
      questions: { include: { options: true } },
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
  if (submission.completedAt) {
    return NextResponse.json({ submissionId: submission.id });
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

  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      score,
      maxScore,
      percent,
      outcomeId: outcome?.id ?? null,
      answers: JSON.stringify(parsed.data.answers),
      completedAt: new Date(),
    },
  });

  // Fire admin notification email (best-effort; failures don't block the
  // response). The respondent's PDF gets sent separately by the result page.
  if (quiz.adminNotifyEnabled && emailConfigured()) {
    const adminTo = quiz.adminNotifyEmail || quiz.user.email;
    if (adminTo) {
      const fullName =
        [updated.firstName, updated.lastName].filter(Boolean).join(" ").trim() ||
        "Anonymous lead";
      const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
      const dashboardLink = `${appUrl}/dashboard/quizzes/${quiz.id}/leads/${updated.id}`;
      const html = `
        <div style="font-family: Helvetica, Arial, sans-serif; color: #0f172a; max-width: 540px;">
          <h2 style="margin: 0 0 12px;">New lead from ${escapeHtml(quiz.title)}</h2>
          <p style="margin: 0 0 16px;">A respondent just completed your scorecard.</p>
          <table style="border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Name</td><td style="padding: 4px 0;"><strong>${escapeHtml(fullName)}</strong></td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Email</td><td style="padding: 4px 0;">${escapeHtml(updated.email ?? "—")}</td></tr>
            ${updated.phone ? `<tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Phone</td><td style="padding: 4px 0;">${escapeHtml(updated.phone)}</td></tr>` : ""}
            ${updated.company ? `<tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Company</td><td style="padding: 4px 0;">${escapeHtml(updated.company)}</td></tr>` : ""}
            <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Score</td><td style="padding: 4px 0;"><strong>${percent.toFixed(1)}%</strong>${outcome ? ` — ${escapeHtml(outcome.title)}` : ""}</td></tr>
          </table>
          ${appUrl ? `<a href="${dashboardLink}" style="display: inline-block; background: #345ff2; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">View lead</a>` : ""}
        </div>
      `;
      // Fire and forget (don't block the response).
      void sendNotification({
        to: adminTo,
        subject: `New lead: ${fullName} — ${quiz.title}`,
        html,
      });
    }
  }

  return NextResponse.json({ submissionId: submission.id });
}
