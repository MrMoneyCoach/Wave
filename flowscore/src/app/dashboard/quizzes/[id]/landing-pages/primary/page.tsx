import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import LandingDesigner, { type Block } from "@/components/LandingDesigner";

export const dynamic = "force-dynamic";

function parseBlocks(raw: string | null): Block[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b: unknown): b is Block => {
      if (!b || typeof b !== "object" || !("type" in b) || !("id" in b)) return false;
      const t = (b as { type: string }).type;
      return ["heading", "paragraph", "image", "list", "button", "divider"].includes(t);
    });
  } catch {
    return [];
  }
}

export default async function PrimaryDesignerPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const initialBlocks = parseBlocks(quiz.landingBlocks);

  return (
    <div>
      <Link
        href={`/dashboard/quizzes/${quiz.id}/landing-pages`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← All landing pages
      </Link>
      <div className="mt-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Primary landing page · Designer
        </p>
        <h1 className="mt-1 text-2xl font-bold">{quiz.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Drag blocks to reorder, click to edit, and save when you're done.
        </p>
      </div>

      <div className="mt-6">
        <LandingDesigner
          quizId={quiz.id}
          brandColor={quiz.brandColor || "#345ff2"}
          initialBlocks={initialBlocks}
        />
      </div>
    </div>
  );
}
