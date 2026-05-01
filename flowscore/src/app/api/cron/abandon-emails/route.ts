import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailConfigured, pickTextOnHex, sendNotification } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Window during which we'll try to win an abandoned respondent back. Older
 *  drop-offs are ignored — sending an email a fortnight later is creepy. */
const LOOKBACK_HOURS = 72;
/** Minimum gap between drop-off and the email so we don't pester someone
 *  who's still mid-flow. */
const MIN_AGE_MINUTES = 30;
/** Cap per cron tick so a backlog doesn't blow up. */
const BATCH_SIZE = 50;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sub(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? "");
}

function paragraphs(text: string, ctx: Record<string, string>): string {
  if (!text) return "";
  return text
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin: 0 0 14px; color: #334155;">${escapeHtml(sub(p, ctx)).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

/** Optional Bearer-auth gate. Set CRON_SECRET in Vercel and Vercel will
 *  pass it via the Authorization header on scheduled runs (configured in
 *  vercel.json). Manual hits without the right token are rejected. */
function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // not configured — leave open for now
  const got = req.headers.get("authorization") ?? "";
  return got === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: "email not configured",
    });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const minAge = new Date(now.getTime() - MIN_AGE_MINUTES * 60 * 1000);

  // Eligible submissions:
  // - never completed
  // - have an email captured
  // - opted in (marketingConsent — set automatically for "implied" quizzes
  //   in the lead route)
  // - not yet emailed
  // - inside the lookback window
  // - older than the min-age (so we don't poke someone still typing)
  // - belong to a quiz that has abandon emails enabled
  const candidates = await prisma.submission.findMany({
    where: {
      completedAt: null,
      email: { not: null },
      marketingConsent: true,
      abandonEmailSentAt: null,
      createdAt: { gte: cutoff, lte: minAge },
      quiz: { abandonEmailEnabled: true },
    },
    include: {
      quiz: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  let sent = 0;
  let failed = 0;
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

  for (const s of candidates) {
    if (!s.email) continue;
    const quiz = s.quiz;
    const ownerName =
      quiz.ownerName ||
      quiz.user.name ||
      quiz.user.email.split("@")[0];
    const ctx: Record<string, string> = {
      firstName: s.firstName ?? "there",
      lastName: s.lastName ?? "",
      quizTitle: quiz.title,
      ownerName,
    };
    const subject = sub(
      quiz.abandonEmailSubject?.trim() ||
        "{{firstName}}, you were almost there…",
      ctx,
    );
    const intro =
      quiz.abandonEmailIntro?.trim() ||
      "Hi {{firstName}},\n\nYou started the {{quizTitle}} but didn't quite finish. We'd love to send you the personalised report — it only takes a couple more minutes to complete.\n\nResume right where you left off:";
    const signoff =
      quiz.abandonEmailSignoff?.trim() || "Thanks,\n— {{ownerName}}";
    const brand = quiz.brandColor || "#345ff2";
    const onBrand = pickTextOnHex(brand);
    const resumeUrl = appUrl
      ? `${appUrl}/q/${quiz.slug}?resume=${s.id}`
      : `/q/${quiz.slug}?resume=${s.id}`;

    const html = `
      <div style="background: #f1f5f9; padding: 24px 12px; font-family: Helvetica, Arial, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 600px; width: 100%; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.06);">
          <tr>
            <td style="background: ${brand}; padding: 24px 32px; color: ${onBrand};">
              <p style="margin: 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85;">Pick up where you left off</p>
              <p style="margin: 6px 0 0; font-size: 20px; font-weight: 700; line-height: 1.25;">${escapeHtml(quiz.title)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; color: #0f172a; line-height: 1.55; font-size: 15px;">
              ${paragraphs(intro, ctx)}
              <p style="margin: 18px 0;"><a href="${escapeHtml(resumeUrl)}" style="display: inline-block; background: ${brand}; color: ${onBrand}; padding: 13px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">Continue the scorecard →</a></p>
              <div style="height: 1px; background: #e2e8f0; margin: 26px 0 22px;"></div>
              ${paragraphs(signoff, ctx)}
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 32px 22px; font-size: 11px; color: #94a3b8; text-align: center;">
              Sent via Flowscore · You'll only get this if you opted in.
            </td>
          </tr>
        </table>
      </div>
    `;

    const result = await sendNotification({
      to: s.email,
      subject,
      html,
    });
    if (result.ok) {
      sent += 1;
      await prisma.submission.update({
        where: { id: s.id },
        data: { abandonEmailSentAt: new Date() },
      });
    } else {
      failed += 1;
      console.warn("[abandon cron] send failed for %s: %s", s.id, result.error);
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    failed,
  });
}
