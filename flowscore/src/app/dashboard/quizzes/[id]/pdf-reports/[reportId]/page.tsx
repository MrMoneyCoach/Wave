import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import PdfReportBuilder, { type Block } from "@/components/PdfReportBuilder";

export const dynamic = "force-dynamic";

function parseBlocks(raw: string | null): Block[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = ["heading", "paragraph", "image", "list", "button", "divider"];
    return parsed.filter((b: unknown): b is Block => {
      if (!b || typeof b !== "object" || !("type" in b) || !("id" in b)) return false;
      return valid.includes((b as { type: string }).type);
    });
  } catch {
    return [];
  }
}

export default async function PdfReportEditorPage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const rep = await prisma.pdfReport.findUnique({ where: { id: params.reportId } });
  if (!rep || rep.quizId !== quiz.id) return notFound();

  return (
    <PdfReportBuilder
      quizId={quiz.id}
      quizTitle={quiz.title}
      brandColor={quiz.brandColor || "#345ff2"}
      initial={{
        id: rep.id,
        name: rep.name,
        isDefault: rep.isDefault,
        blocks: parseBlocks(rep.blocks),
      }}
    />
  );
}
