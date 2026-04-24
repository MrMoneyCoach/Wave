import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { findTemplate } from "@/lib/templates";
import UseTemplateButton from "@/components/UseTemplateButton";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const template = findTemplate(params.id);
  if (!template) return notFound();

  return (
    <div>
      <Link
        href="/dashboard/templates"
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← All templates
      </Link>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {template.category}
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold">
            <span aria-hidden>{template.emoji}</span>
            {template.name}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">{template.description}</p>
        </div>
        <UseTemplateButton templateId={template.id} />
      </div>

      <section className="card mt-8">
        <h2 className="text-lg font-semibold">Intro</h2>
        <p className="mt-2 whitespace-pre-wrap text-slate-700">{template.intro}</p>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Questions ({template.questions.length})</h2>
        <ol className="mt-4 space-y-5">
          {template.questions.map((q, i) => (
            <li key={i}>
              <p className="text-sm font-medium text-slate-500">
                Q{i + 1} · {typeLabel(q.type)}
                {!q.required && " · optional"}
              </p>
              <p className="mt-1 font-medium text-slate-900">{q.text}</p>
              {q.options.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {q.options.map((o, j) => (
                    <li key={j} className="flex items-baseline justify-between gap-3">
                      <span>
                        {o.minChars !== undefined ? `≥${o.minChars} chars` : o.text}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {o.score} pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Outcomes ({template.outcomes.length})</h2>
        <div className="mt-4 space-y-3">
          {template.outcomes.map((o, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{o.title}</p>
                <span className="text-xs text-slate-500">
                  {o.minScore}–{o.maxScore}%
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{o.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <UseTemplateButton templateId={template.id} />
      </div>
    </div>
  );
}

function typeLabel(t: string) {
  if (t === "multi") return "Multiple choice";
  if (t === "scale") return "Scale 0–10";
  if (t === "text") return "Free text";
  return "Single choice";
}
