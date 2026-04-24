import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { order: "asc" }, include: { options: true } },
      outcomes: true,
    },
  });
  if (!quiz || quiz.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const submissions = await prisma.submission.findMany({
    where: { quizId: quiz.id },
    orderBy: { createdAt: "desc" },
  });

  const outcomeMap = new Map(quiz.outcomes.map((o) => [o.id, o]));
  const questionOrder = quiz.questions;
  const optionMap = new Map<string, string>();
  for (const q of quiz.questions) for (const o of q.options) optionMap.set(o.id, o.text);

  const headers = [
    "Submitted at",
    "First name",
    "Last name",
    "Email",
    "Phone",
    "Company",
    "Job title",
    "Score",
    "Max",
    "Percent",
    "Outcome",
    ...questionOrder.map((q) => q.text),
  ];

  const rows = submissions.map((s) => {
    let answers: {
      questionId: string;
      optionIds: string[];
      scaleValue?: number;
      text?: string;
    }[] = [];
    try {
      answers = JSON.parse(s.answers);
    } catch {
      /* ignore */
    }
    const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
    return [
      s.createdAt.toISOString(),
      s.firstName ?? "",
      s.lastName ?? "",
      s.email ?? "",
      s.phone ?? "",
      s.company ?? "",
      s.jobTitle ?? "",
      s.score.toFixed(2),
      s.maxScore.toFixed(2),
      s.percent.toFixed(1),
      s.outcomeId ? outcomeMap.get(s.outcomeId)?.title ?? "" : "",
      ...questionOrder.map((q) => {
        const a = byQuestion.get(q.id);
        if (!a) return "";
        if (q.type === "scale") return a.scaleValue?.toString() ?? "";
        if (q.type === "text") return a.text ?? "";
        return a.optionIds.map((id) => optionMap.get(id) ?? "").join("; ");
      }),
    ];
  });

  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${quiz.slug}-leads.csv"`,
    },
  });
}
