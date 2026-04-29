import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; lpId: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lp = await prisma.landingPage.findUnique({ where: { id: params.lpId } });
  if (!lp || lp.quizId !== quiz.id) {
    return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
  }
  if (lp.isPrimary) {
    return NextResponse.json(
      { error: "The primary landing page can't be deleted." },
      { status: 400 },
    );
  }

  await prisma.landingPage.delete({ where: { id: lp.id } });
  return NextResponse.json({ ok: true });
}
