import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import NewPdfReportButton from "@/components/NewPdfReportButton";
import DeletePdfReportButton from "@/components/DeletePdfReportButton";

export const dynamic = "force-dynamic";

export default async function PdfReportsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { pdfReports: { orderBy: { createdAt: "asc" } } },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Build
          </p>
          <h1 className="mt-1 text-2xl font-bold">PDF Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Customise the PDF that gets emailed to respondents. Until you create
            one, the built-in default report layout is used.
          </p>
        </div>
        <NewPdfReportButton
          quizId={quiz.id}
          existingDefault={quiz.pdfReports.some((r) => r.isDefault)}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quiz.pdfReports.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No PDF reports yet. The built-in template is used until you
                  create one.
                </td>
              </tr>
            )}
            {quiz.pdfReports.map((rep) => (
              <tr key={rep.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{rep.name}</td>
                <td className="px-4 py-3">
                  {rep.isDefault ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Default
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {rep.createdAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/dashboard/quizzes/${quiz.id}/pdf-reports/${rep.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeletePdfReportButton
                      quizId={quiz.id}
                      reportId={rep.id}
                      name={rep.name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
