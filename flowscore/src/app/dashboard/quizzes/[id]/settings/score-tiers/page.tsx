import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function bandColour(min: number, max: number): { bg: string; label: string } {
  const mid = (min + max) / 2;
  if (mid < 34) return { bg: "#fecaca", label: "Low" };
  if (mid < 67) return { bg: "#fed7aa", label: "Mid" };
  if (mid < 85) return { bg: "#d9f99d", label: "Good" };
  return { bg: "#bbf7d0", label: "High" };
}

export default async function ScoreTiersPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      outcomes: { orderBy: { minScore: "asc" } },
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Score tiers are the outcome bands a respondent's score falls into.
        They're edited alongside your questions on the{" "}
        <Link
          href={`/dashboard/quizzes/${quiz.id}/edit`}
          className="font-medium text-brand-600 hover:underline"
        >
          Edit page
        </Link>
        . When scores are displayed, each tier is colour-coded based on its
        range using a traffic-light style.
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3">Colour</th>
              <th className="px-4 py-3">Tier</th>
              <th className="w-32 px-4 py-3">From</th>
              <th className="w-32 px-4 py-3">To</th>
            </tr>
          </thead>
          <tbody>
            {quiz.outcomes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No score tiers defined yet.{" "}
                  <Link
                    href={`/dashboard/quizzes/${quiz.id}/edit`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Add some on the Edit page
                  </Link>
                  .
                </td>
              </tr>
            )}
            {quiz.outcomes.map((o) => {
              const c = bandColour(o.minScore, o.maxScore);
              return (
                <tr
                  key={o.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <span
                      aria-hidden
                      className="block h-8 w-12 rounded-md"
                      style={{ backgroundColor: c.bg }}
                      title={c.label}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{o.title}</p>
                    {o.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {o.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.minScore}%</td>
                  <td className="px-4 py-3 text-slate-700">{o.maxScore}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Link
        href={`/dashboard/quizzes/${quiz.id}/edit`}
        className="btn-primary inline-flex"
      >
        Edit tiers on the Edit page →
      </Link>
    </div>
  );
}
