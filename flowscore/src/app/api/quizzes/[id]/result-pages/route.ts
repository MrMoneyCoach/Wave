import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  outcomeId: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

const STARTER_BLOCKS = [
  {
    id: "h",
    type: "heading" as const,
    text: "Hi {{firstName}}, here's your result.",
    level: 2 as const,
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
    return NextResponse.json({ error: "Invalid result page data" }, { status: 400 });
  }

  // If this is being marked as default, demote any existing default for this quiz.
  if (parsed.data.isDefault) {
    await prisma.resultPage.updateMany({
      where: { quizId: quiz.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Validate outcomeId belongs to this quiz, if provided.
  if (parsed.data.outcomeId) {
    const outcome = await prisma.outcome.findUnique({
      where: { id: parsed.data.outcomeId },
    });
    if (!outcome || outcome.quizId !== quiz.id) {
      return NextResponse.json(
        { error: "Outcome not found on this quiz" },
        { status: 400 },
      );
    }
  }

  const rp = await prisma.resultPage.create({
    data: {
      quizId: quiz.id,
      name: parsed.data.name,
      outcomeId: parsed.data.outcomeId || null,
      isDefault: parsed.data.isDefault ?? false,
      blocks: JSON.stringify(STARTER_BLOCKS),
    },
  });

  return NextResponse.json({ id: rp.id });
}
