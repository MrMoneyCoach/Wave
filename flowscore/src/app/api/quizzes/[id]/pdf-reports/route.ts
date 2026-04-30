import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().optional().default(false),
});

const STARTER_BLOCKS = [
  {
    id: "h",
    type: "heading" as const,
    text: "{{firstName}} — your report",
    level: 1 as const,
  },
  {
    id: "p1",
    type: "paragraph" as const,
    text: "You scored {{percent}}% — {{outcomeTitle}}.",
  },
  {
    id: "p2",
    type: "paragraph" as const,
    text: "{{outcomeDescription}}",
  },
];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PDF report data" }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.pdfReport.updateMany({
      where: { quizId: quiz.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const rep = await prisma.pdfReport.create({
    data: {
      quizId: quiz.id,
      name: parsed.data.name,
      isDefault: parsed.data.isDefault ?? false,
      blocks: JSON.stringify(STARTER_BLOCKS),
    },
  });

  return NextResponse.json({ id: rep.id });
}
