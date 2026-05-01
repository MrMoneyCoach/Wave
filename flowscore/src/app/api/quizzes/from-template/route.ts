import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  DEFAULT_LANDING_BLOCKS,
  DEFAULT_PDF_BLOCKS,
  DEFAULT_RESULT_BLOCKS,
  findTemplate,
} from "@/lib/templates";
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

  // Templates can override the default design; fall back to the system-wide
  // defaults so every quiz ends up with a polished landing/result/PDF flow.
  const landingBlocks = template.landingBlocks?.length
    ? template.landingBlocks
    : DEFAULT_LANDING_BLOCKS;
  const resultBlocks = template.resultBlocks?.length
    ? template.resultBlocks
    : DEFAULT_RESULT_BLOCKS;
  const pdfBlocks = template.pdfBlocks?.length
    ? template.pdfBlocks
    : DEFAULT_PDF_BLOCKS;
  const landingBlocksJson = JSON.stringify(landingBlocks);
  const resultBlocksJson = JSON.stringify(resultBlocks);
  const pdfBlocksJson = JSON.stringify(pdfBlocks);

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
          brandColor: template.brandColor ?? null,
          bookingLabel: template.bookingLabel ?? null,
          landingBlocks: landingBlocksJson,
          emailSubject: template.email?.subject ?? null,
          emailGreeting: template.email?.greeting ?? null,
          emailIntro: template.email?.intro ?? null,
          emailBullets: template.email?.bullets ?? null,
          emailBookingLine: template.email?.bookingLine ?? null,
          emailSignoff: template.email?.signoff ?? null,
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
      prisma.resultPage.create({
        data: {
          quizId,
          name: "Default result page",
          isDefault: true,
          blocks: resultBlocksJson,
        },
      }),
      prisma.pdfReport.create({
        data: {
          quizId,
          name: "Default PDF report",
          isDefault: true,
          blocks: pdfBlocksJson,
        },
      }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not create from template: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: quizId, slug });
}
