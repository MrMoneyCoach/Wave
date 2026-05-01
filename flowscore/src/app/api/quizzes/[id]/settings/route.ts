import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/i, "Use a 6-digit hex");
const url = z.string().url();
const optStr = (max: number) => z.string().max(max).optional().or(z.literal(""));
const optHex = hex.optional().or(z.literal(""));
const optUrl = url.optional().or(z.literal(""));

const schema = z.object({
  // General
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
    .optional(),

  // Branding
  brandColor: optHex,
  secondaryColor: optHex,
  logoUrl: optUrl,
  squareIconUrl: optUrl,

  // Share appearance
  metaTitle: optStr(200),
  metaDescription: optStr(500),
  shareImageUrl: optUrl,

  // Lead form
  privacyPolicyUrl: optUrl,
  optinConsent: z.enum(["implied", "optional", "required"]).optional(),
  optinWording: optStr(500),
  privacyStatement: optStr(2000),
  formBehaviour: z.enum(["before", "after"]).optional(),
  emailValidation: z.enum(["none", "basic", "strict"]).optional(),
  leadFormFields: z.array(
    z.object({
      key: z.string().min(1).max(60),
      label: z.string().min(1).max(80),
      type: z.enum(["text", "email", "tel", "company", "url"]),
      required: z.boolean(),
    }),
  ).optional(),

  // Notifications
  adminNotifyEmail: optStr(200),
  adminNotifyEnabled: z.boolean().optional(),

  // Result email
  emailSubject: optStr(200),
  emailGreeting: optStr(200),
  emailIntro: optStr(4000),
  emailBullets: optStr(4000),
  emailBookingLine: optStr(1000),
  emailSignoff: optStr(500),

  // Abandon email
  abandonEmailEnabled: z.boolean().optional(),
  abandonEmailSubject: optStr(200),
  abandonEmailIntro: optStr(4000),
  abandonEmailSignoff: optStr(500),

  // Tracking
  facebookPixelId: optStr(80),
  googleAnalyticsCode: optStr(8000),
  googleTagManagerId: optStr(80),
  customTrackingScript: optStr(8000),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue
          ? `${issue.path.join(".") || "field"}: ${issue.message}`
          : "Invalid",
      },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const data: Record<string, unknown> = {};

  // Helper: only set fields the caller actually sent. Empty string → null.
  const set = (k: keyof typeof d, transform?: (v: string) => string | null) => {
    const v = d[k];
    if (v === undefined) return;
    if (typeof v === "string") {
      data[k] = transform ? transform(v) : (v.length === 0 ? null : v);
    } else if (typeof v === "boolean") {
      data[k] = v;
    } else if (Array.isArray(v)) {
      data[k] = v;
    }
  };

  // Slug needs uniqueness check + slugify safety.
  if (d.slug !== undefined) {
    const cleaned = slugify(d.slug);
    if (cleaned !== quiz.slug) {
      const collision = await prisma.quiz.findUnique({ where: { slug: cleaned } });
      if (collision && collision.id !== quiz.id) {
        return NextResponse.json(
          { error: "That URL is already taken" },
          { status: 409 },
        );
      }
    }
    data.slug = cleaned;
  }

  set("title");
  set("brandColor");
  set("secondaryColor");
  set("logoUrl");
  set("squareIconUrl");
  set("metaTitle");
  set("metaDescription");
  set("shareImageUrl");
  set("privacyPolicyUrl");
  if (d.optinConsent !== undefined) data.optinConsent = d.optinConsent;
  set("optinWording");
  set("privacyStatement");
  if (d.formBehaviour !== undefined) data.formBehaviour = d.formBehaviour;
  if (d.emailValidation !== undefined) data.emailValidation = d.emailValidation;
  if (d.leadFormFields !== undefined) {
    data.leadFormFields = JSON.stringify(d.leadFormFields);
  }
  set("adminNotifyEmail");
  if (d.adminNotifyEnabled !== undefined)
    data.adminNotifyEnabled = d.adminNotifyEnabled;
  set("emailSubject");
  set("emailGreeting");
  set("emailIntro");
  set("emailBullets");
  set("emailBookingLine");
  set("emailSignoff");
  if (d.abandonEmailEnabled !== undefined)
    data.abandonEmailEnabled = d.abandonEmailEnabled;
  set("abandonEmailSubject");
  set("abandonEmailIntro");
  set("abandonEmailSignoff");
  set("facebookPixelId");
  set("googleAnalyticsCode");
  set("googleTagManagerId");
  set("customTrackingScript");

  await prisma.quiz.update({ where: { id: quiz.id }, data });
  return NextResponse.json({ ok: true });
}
