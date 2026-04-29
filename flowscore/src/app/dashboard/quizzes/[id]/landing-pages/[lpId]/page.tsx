import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import LandingPageEditor from "@/components/LandingPageEditor";

export const dynamic = "force-dynamic";

function parseHighlights(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    /* ignore */
  }
  return [];
}

export default async function VariantEditPage({
  params,
}: {
  params: { id: string; lpId: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) return notFound();
  const lp = await prisma.landingPage.findUnique({ where: { id: params.lpId } });
  if (!lp || lp.quizId !== quiz.id) return notFound();

  return (
    <div>
      <Link
        href={`/dashboard/quizzes/${quiz.id}/landing-pages`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← All landing pages
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Variant
          </p>
          <h1 className="mt-1 text-2xl font-bold">{lp.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            URL: <code>/q/{quiz.slug}/{lp.slug}</code>
          </p>
        </div>
      </div>

      <LandingPageEditor
        quizId={quiz.id}
        lpId={lp.id}
        initial={{
          name: lp.name,
          headline: lp.headline ?? "",
          subheadline: lp.subheadline ?? "",
          ctaLabel: lp.ctaLabel ?? "",
          brandColor: lp.brandColor ?? "",
          logoUrl: lp.logoUrl ?? "",
          heroImageUrl: lp.heroImageUrl ?? "",
          videoUrl: lp.videoUrl ?? "",
          highlights: parseHighlights(lp.highlights),
        }}
        primary={{
          headline: quiz.title,
          subheadline: quiz.intro,
          ctaLabel: quiz.ctaLabel,
          brandColor: quiz.brandColor ?? "",
          logoUrl: quiz.logoUrl ?? "",
          heroImageUrl: quiz.heroImageUrl ?? "",
          videoUrl: quiz.videoUrl ?? "",
        }}
      />
    </div>
  );
}
