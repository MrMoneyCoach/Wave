import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { emailConfigured, pickTextOnHex, sendNotification } from "@/lib/email";

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
      const brand = quiz.brandColor || "#345ff2";
      const onBrand = pickTextOnHex(brand);
      const row = (label: string, value: string, strong = false) =>
        `<tr><td style="padding: 8px 16px 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: top;">${escapeHtml(label)}</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${strong ? `<strong>${value}</strong>` : value}</td></tr>`;
      const html = `
        <div style="background: #f1f5f9; padding: 24px 12px; font-family: Helvetica, Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 600px; width: 100%; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.06);">
            <tr>
              <td style="background: ${brand}; padding: 22px 28px; color: ${onBrand};">
                <p style="margin: 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85;">New lead</p>
                <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700;">${escapeHtml(quiz.title)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 26px 28px 8px;">
                <p style="margin: 0 0 18px; color: #334155; font-size: 14px;">A respondent just completed your scorecard.</p>
                <table style="border-collapse: collapse; width: 100%;">
                  ${row("Name", escapeHtml(fullName), true)}
                  ${row("Email", escapeHtml(updated.email ?? "—"))}
                  ${updated.phone ? row("Phone", escapeHtml(updated.phone)) : ""}
                  ${updated.company ? row("Company", escapeHtml(updated.company)) : ""}
                  ${row("Score", `<strong style="color: ${brand};">${percent.toFixed(1)}%</strong>${outcome ? ` <span style="color: #64748b;">— ${escapeHtml(outcome.title)}</span>` : ""}`)}
                </table>
              </td>
            </tr>
            ${appUrl ? `<tr><td style="padding: 8px 28px 28px;"><a href="${dashboardLink}" style="display: inline-block; background: ${brand}; color: ${onBrand}; padding: 11px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">View lead →</a></td></tr>` : ""}
            <tr>
              <td style="padding: 14px 28px 20px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
                Sent via Flowscore
              </td>
            </tr>
          </table>
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
