import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import NewLandingPageButton from "@/components/NewLandingPageButton";
import DeleteLandingPageButton from "@/components/DeleteLandingPageButton";

export const dynamic = "force-dynamic";

export default async function LandingPagesPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      landingPages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Build
          </p>
          <h1 className="mt-1 text-2xl font-bold">Landing Pages</h1>
          <p className="mt-1 text-sm text-slate-500">
            The Primary lives at <code>/q/{quiz.slug}</code>. Each variant gets its
            own URL and inherits any field it doesn't override.
          </p>
        </div>
        <NewLandingPageButton quizId={quiz.id} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">Primary</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Live
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  The default landing page everyone sees first.
                </p>
              </td>
              <td className="px-4 py-3 text-slate-600">
                <code className="text-xs">/q/{quiz.slug}</code>
              </td>
              <td className="px-4 py-3 text-slate-500">—</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/dashboard/quizzes/${quiz.id}/edit`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  Edit design
                </Link>
              </td>
            </tr>

            {quiz.landingPages.map((lp) => (
              <tr key={lp.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{lp.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Variant
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <code className="text-xs">
                    /q/{quiz.slug}/{lp.slug}
                  </code>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {lp.createdAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/dashboard/quizzes/${quiz.id}/landing-pages/${lp.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteLandingPageButton
                      quizId={quiz.id}
                      lpId={lp.id}
                      name={lp.name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quiz.landingPages.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          No variants yet. Variants are great for A/B testing different hooks against
          the same questions.
        </p>
      )}
    </div>
  );
}
