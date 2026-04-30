import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("heading"),
    text: z.string().max(2000).default(""),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  }),
  z.object({
    id: z.string(),
    type: z.literal("paragraph"),
    text: z.string().max(4000).default(""),
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
    items: z.array(z.string().max(280)).max(20).default([]),
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
    type: z.literal("score-display"),
    align: z.enum(["left", "center", "right"]).default("right"),
    label: z.string().max(200).default(""),
    showBar: z.boolean().default(true),
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
    imagePosition: z.enum(["left", "right"]).default("right"),
    heading: z.string().max(200).default(""),
    body: z.string().max(2000).default(""),
    ctaLabel: z.string().max(80).default(""),
    ctaUrl: z.string().url().or(z.literal("")).default(""),
  }),
]);

const putSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  outcomeId: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  blocks: z.array(blockSchema).max(60).optional(),
});

async function authOwned(quizId: string, rpId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.userId !== user.id)
    return { error: "Not found" as const, status: 404 };
  const rp = await prisma.resultPage.findUnique({ where: { id: rpId } });
  if (!rp || rp.quizId !== quiz.id)
    return { error: "Result page not found" as const, status: 404 };
  return { quiz, rp };
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; rpId: string } },
) {
  const r = await authOwned(params.id, params.rpId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
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

  // Promoting to default? Demote any existing default.
  if (parsed.data.isDefault) {
    await prisma.resultPage.updateMany({
      where: { quizId: r.quiz.id, isDefault: true, NOT: { id: r.rp.id } },
      data: { isDefault: false },
    });
  }

  // Validate outcomeId belongs to this quiz, if provided.
  if (parsed.data.outcomeId) {
    const outcome = await prisma.outcome.findUnique({
      where: { id: parsed.data.outcomeId },
    });
    if (!outcome || outcome.quizId !== r.quiz.id) {
      return NextResponse.json(
        { error: "Outcome not found on this quiz" },
        { status: 400 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.outcomeId !== undefined) data.outcomeId = parsed.data.outcomeId || null;
  if (parsed.data.isDefault !== undefined) data.isDefault = parsed.data.isDefault;
  if (parsed.data.blocks !== undefined) {
    data.blocks =
      parsed.data.blocks.length > 0 ? JSON.stringify(parsed.data.blocks) : null;
  }

  await prisma.resultPage.update({ where: { id: r.rp.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; rpId: string } },
) {
  const r = await authOwned(params.id, params.rpId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  await prisma.resultPage.delete({ where: { id: r.rp.id } });
  return NextResponse.json({ ok: true });
}
