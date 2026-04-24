import Link from "next/link";
import { requireUser } from "@/lib/session";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireUser();

  const byCategory = new Map<string, typeof TEMPLATES>();
  for (const t of TEMPLATES) {
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Dashboard
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pick a starting point. You can edit everything after.
          </p>
        </div>
        <Link href="/dashboard/quizzes/new" className="btn-secondary">
          Start from blank
        </Link>
      </div>

      <div className="mt-8 space-y-10">
        {[...byCategory.entries()].map(([category, list]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {category}
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/templates/${t.id}`}
                  className="card flex h-full flex-col gap-3 transition hover:border-brand-400 hover:shadow"
                >
                  <div className="text-3xl">{t.emoji}</div>
                  <h3 className="text-lg font-semibold">{t.name}</h3>
                  <p className="text-sm text-slate-600">{t.description}</p>
                  <p className="mt-auto text-xs text-slate-400">
                    {t.questions.length} questions · {t.outcomes.length} outcomes
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
