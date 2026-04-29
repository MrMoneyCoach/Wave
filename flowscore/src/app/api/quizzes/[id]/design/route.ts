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
]);

const schema = z.object({
  blocks: z.array(blockSchema).max(40),
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
      { error: issue ? `${issue.path.join(".") || "field"}: ${issue.message}` : "Invalid" },
      { status: 400 },
    );
  }

  await prisma.quiz.update({
    where: { id: quiz.id },
    data: {
      landingBlocks:
        parsed.data.blocks.length > 0 ? JSON.stringify(parsed.data.blocks) : null,
    },
  });
  return NextResponse.json({ ok: true });
}
