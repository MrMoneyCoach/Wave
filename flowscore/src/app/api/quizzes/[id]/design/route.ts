import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("heading"),
    text: z.string().max(200).default(""),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  }),
  z.object({
    id: z.string(),
    type: z.literal("paragraph"),
    text: z.string().max(2000).default(""),
  }),
  z.object({
    id: z.string(),
    type: z.literal("image"),
    url: z.string().url().or(z.literal("")).default(""),
    alt: z.string().max(200).default(""),
  }),
  z.object({
    id: z.string(),
    type: z.literal("list"),
    items: z.array(z.string().max(140)).max(12).default([]),
    checkmark: z.boolean().default(true),
  }),
  z.object({
    id: z.string(),
    type: z.literal("button"),
    label: z.string().max(80).default(""),
    url: z.string().url().or(z.literal("")).default(""),
    style: z.enum(["primary", "secondary"]).default("primary"),
  }),
  z.object({
    id: z.string(),
    type: z.literal("divider"),
  }),
  z.object({
    id: z.string(),
    type: z.literal("hero-split"),
    headline: z.string().max(200).default(""),
    body: z.string().max(2000).default(""),
    ctaLabel: z.string().max(80).default(""),
    ctaUrl: z.string().url().or(z.literal("")).default(""),
    bullets: z.array(z.string().max(140)).max(6).default([]),
    imageUrl: z.string().url().or(z.literal("")).default(""),
    imageAlt: z.string().max(200).default(""),
    imagePosition: z.enum(["left", "right"]).default("right"),
  }),
  z.object({
    id: z.string(),
    type: z.literal("feature-grid"),
    heading: z.string().max(200).default(""),
    subhead: z.string().max(500).default(""),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(4),
    items: z
      .array(
        z.object({
          id: z.string(),
          iconUrl: z.string().url().or(z.literal("")).default(""),
          title: z.string().max(120).default(""),
          body: z.string().max(500).default(""),
        }),
      )
      .max(8)
      .default([]),
  }),
  z.object({
    id: z.string(),
    type: z.literal("image-text"),
    imageUrl: z.string().url().or(z.literal("")).default(""),
    imageAlt: z.string().max(200).default(""),
    imagePosition: z.enum(["left", "right"]).default("left"),
    heading: z.string().max(200).default(""),
    body: z.string().max(2000).default(""),
    ctaLabel: z.string().max(80).default(""),
    ctaUrl: z.string().url().or(z.literal("")).default(""),
  }),
]);

const hexOrEmpty = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/i, "Use a 6-digit hex like #345ff2")
  .optional()
  .or(z.literal(""));

const themeSchema = z
  .object({
    brandColor: hexOrEmpty,
    secondaryColor: hexOrEmpty,
    logoUrl: z.string().url().optional().or(z.literal("")),
    secondaryLogoUrl: z.string().url().optional().or(z.literal("")),
    squareIconUrl: z.string().url().optional().or(z.literal("")),
    fontFamily: z.enum(["sans", "serif", "mono"]).optional().or(z.literal("")),
  })
  .optional();

const settingsSchema = z
  .object({
    metaTitle: z.string().max(120).optional().or(z.literal("")),
    metaDescription: z.string().max(300).optional().or(z.literal("")),
    customCss: z.string().max(20000).optional().or(z.literal("")),
  })
  .optional();

const schema = z.object({
  blocks: z.array(blockSchema).max(40).optional(),
  theme: themeSchema,
  settings: settingsSchema,
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

  const data: Record<string, unknown> = {};
  const { blocks, theme, settings } = parsed.data;

  if (blocks !== undefined) {
    data.landingBlocks = blocks.length > 0 ? JSON.stringify(blocks) : null;
  }
  if (theme) {
    if ("brandColor" in theme) data.brandColor = theme.brandColor || null;
    if ("secondaryColor" in theme) data.secondaryColor = theme.secondaryColor || null;
    if ("logoUrl" in theme) data.logoUrl = theme.logoUrl || null;
    if ("secondaryLogoUrl" in theme)
      data.secondaryLogoUrl = theme.secondaryLogoUrl || null;
    if ("squareIconUrl" in theme) data.squareIconUrl = theme.squareIconUrl || null;
    if ("fontFamily" in theme) data.fontFamily = theme.fontFamily || null;
  }
  if (settings) {
    if ("metaTitle" in settings) data.metaTitle = settings.metaTitle || null;
    if ("metaDescription" in settings)
      data.metaDescription = settings.metaDescription || null;
    if ("customCss" in settings) data.customCss = settings.customCss || null;
  }

  await prisma.quiz.update({ where: { id: quiz.id }, data });
  return NextResponse.json({ ok: true });
}
