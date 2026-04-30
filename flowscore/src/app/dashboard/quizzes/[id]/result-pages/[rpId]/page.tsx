import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import ResultPageBuilder, {
  type Block,
  type Outcome,
} from "@/components/ResultPageBuilder";

export const dynamic = "force-dynamic";

function parseBlocks(raw: string | null): Block[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = ["heading", "paragraph", "image", "list", "button", "divider"];
    return parsed.filter((b: unknown): b is Block => {
      if (!b || typeof b !== "object" || !("type" in b) || !("id" in b)) return false;
      const t = (b as { type: string }).type;
      return valid.includes(t);
    });
  } catch {
    return [];
  }
}

export default async function ResultPageEditorPage({
  params,
}: {
  params: { id: string; rpId: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { outcomes: { orderBy: { minScore: "asc" } } },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const rp = await prisma.resultPage.findUnique({ where: { id: params.rpId } });
  if (!rp || rp.quizId !== quiz.id) return notFound();

  const outcomes: Outcome[] = quiz.outcomes.map((o) => ({
    id: o.id,
    title: o.title,
    minScore: o.minScore,
    maxScore: o.maxScore,
  }));

  return (
    <ResultPageBuilder
      quizId={quiz.id}
      quizTitle={quiz.title}
      quizSlug={quiz.slug}
      published={quiz.published}
      brandColor={quiz.brandColor || "#345ff2"}
      outcomes={outcomes}
      initial={{
        id: rp.id,
        name: rp.name,
        outcomeId: rp.outcomeId,
        isDefault: rp.isDefault,
        blocks: parseBlocks(rp.blocks),
      }}
    />
  );
}
