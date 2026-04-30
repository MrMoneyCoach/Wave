import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import NewResultPageButton from "@/components/NewResultPageButton";
import DeleteResultPageButton from "@/components/DeleteResultPageButton";

export const dynamic = "force-dynamic";

export default async function ResultPagesPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      resultPages: { orderBy: { createdAt: "asc" } },
      outcomes: { orderBy: { minScore: "asc" } },
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const outcomeMap = new Map(quiz.outcomes.map((o) => [o.id, o]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Build
          </p>
          <h1 className="mt-1 text-2xl font-bold">Result Pages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tailor what each respondent sees based on their outcome band. The
            Default page acts as the catch-all for any band you haven't covered.
          </p>
        </div>
        <NewResultPageButton
          quizId={quiz.id}
          outcomes={quiz.outcomes.map((o) => ({
            id: o.id,
            title: o.title,
            minScore: o.minScore,
            maxScore: o.maxScore,
          }))}
          existingDefault={quiz.resultPages.some((rp) => rp.isDefault)}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">Shown when</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quiz.resultPages.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No result pages yet. Create one to control what respondents
                  see after they submit.
                </td>
              </tr>
            )}
            {quiz.resultPages.map((rp) => {
              const outcome = rp.outcomeId ? outcomeMap.get(rp.outcomeId) : null;
              return (
                <tr key={rp.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {rp.name}
                      </span>
                      {rp.isDefault && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {outcome ? (
                      <>
                        Outcome:{" "}
                        <span className="font-medium text-slate-800">
                          {outcome.title}
                        </span>{" "}
                        <span className="text-xs text-slate-500">
                          ({outcome.minScore}–{outcome.maxScore}%)
                        </span>
                      </>
                    ) : rp.isDefault ? (
                      <span className="text-slate-500">
                        Any band (catch-all)
                      </span>
                    ) : (
                      <span className="text-slate-500">No filter</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {rp.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/quizzes/${quiz.id}/result-pages/${rp.id}`}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteResultPageButton
                        quizId={quiz.id}
                        rpId={rp.id}
                        name={rp.name}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
