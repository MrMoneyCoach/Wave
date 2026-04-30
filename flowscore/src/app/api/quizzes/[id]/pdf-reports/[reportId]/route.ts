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
]);

const putSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
  blocks: z.array(blockSchema).max(80).optional(),
});

async function authOwned(quizId: string, reportId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.userId !== user.id)
    return { error: "Not found" as const, status: 404 };
  const rep = await prisma.pdfReport.findUnique({ where: { id: reportId } });
  if (!rep || rep.quizId !== quiz.id)
    return { error: "PDF report not found" as const, status: 404 };
  return { quiz, rep };
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; reportId: string } },
) {
  const r = await authOwned(params.id, params.reportId);
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

  if (parsed.data.isDefault) {
    await prisma.pdfReport.updateMany({
      where: { quizId: r.quiz.id, isDefault: true, NOT: { id: r.rep.id } },
      data: { isDefault: false },
    });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.isDefault !== undefined) data.isDefault = parsed.data.isDefault;
  if (parsed.data.blocks !== undefined) {
    data.blocks =
      parsed.data.blocks.length > 0 ? JSON.stringify(parsed.data.blocks) : null;
  }

  await prisma.pdfReport.update({ where: { id: r.rep.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; reportId: string } },
) {
  const r = await authOwned(params.id, params.reportId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  await prisma.pdfReport.delete({ where: { id: r.rep.id } });
  return NextResponse.json({ ok: true });
}
