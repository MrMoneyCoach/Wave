import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { findTemplate } from "@/lib/templates";
import { slugify } from "@/lib/slug";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";
  const template = findTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const quizId = randomUUID();
  const slug = slugify(template.name);

  const questionRows = template.questions.map((q, i) => ({
    id: randomUUID(),
    quizId,
    order: i,
    text: q.text,
    type: q.type,
    required: q.required,
  }));
  const optionRows = template.questions.flatMap((q, qi) =>
    q.options.map((o, j) => ({
      id: randomUUID(),
      questionId: questionRows[qi].id,
      order: j,
      text: o.text,
      score: o.score,
      minChars: o.minChars ?? null,
    })),
  );
  const outcomeRows = template.outcomes.map((o) => ({
    quizId,
    minScore: o.minScore,
    maxScore: o.maxScore,
    title: o.title,
    description: o.description,
  }));

  try {
    await prisma.$transaction([
      prisma.quiz.create({
        data: {
          id: quizId,
          userId: user.id,
          slug,
          title: template.name,
          intro: template.intro,
          ctaLabel: template.ctaLabel,
          theme: template.theme ?? "minimal",
        },
      }),
      ...(questionRows.length
        ? [prisma.question.createMany({ data: questionRows })]
        : []),
      ...(optionRows.length
        ? [prisma.answerOption.createMany({ data: optionRows })]
        : []),
      ...(outcomeRows.length
        ? [prisma.outcome.createMany({ data: outcomeRows })]
        : []),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Could not create from template: ${message}` }, { status: 500 });
  }

  return NextResponse.json({ id: quizId, slug });
}
