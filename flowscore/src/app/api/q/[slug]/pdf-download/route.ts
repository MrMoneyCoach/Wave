import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf";
import { buildPdfData } from "@/lib/submissionPdf";
import { verifyPdfToken } from "@/lib/pdfToken";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get("sid");
  const token = searchParams.get("t");
  if (!sid || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  if (!verifyPdfToken(sid, token)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: {
      user: true,
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      outcomes: true,
    },
  });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const submission = await prisma.submission.findUnique({ where: { id: sid } });
  if (!submission || submission.quizId !== quiz.id) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const ownerName =
    quiz.ownerName || quiz.user.name || quiz.user.email.split("@")[0];

  const pdfData = buildPdfData({
    quiz: {
      title: quiz.title,
      ownerName,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      })),
      outcomes: quiz.outcomes.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
      })),
    },
    submission,
  });

  const buffer = await generatePdfBuffer(pdfData);
  const body = new Uint8Array(buffer);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quiz.slug}-result.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
