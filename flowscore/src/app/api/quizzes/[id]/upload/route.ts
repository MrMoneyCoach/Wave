import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parseWorkbook } from "@/lib/excel";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = parseWorkbook(buffer);
  } catch (e) {
    return NextResponse.json({ error: "Could not read spreadsheet" }, { status: 400 });
  }

  if (parsed.questions.length === 0) {
    return NextResponse.json(
      {
        error:
          "No questions found. Your sheet needs at least columns for Question, Option and Score.",
        warnings: parsed.warnings,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(parsed);
}
