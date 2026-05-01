import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const INTEGRATIONS = [
  { name: "Mailchimp", emoji: "🐵" },
  { name: "HubSpot", emoji: "🛰" },
  { name: "ActiveCampaign", emoji: "📨" },
  { name: "Klaviyo", emoji: "🟣" },
  { name: "Zapier", emoji: "⚡" },
  { name: "Webhooks", emoji: "🔗" },
  { name: "Google Sheets", emoji: "🟢" },
  { name: "Slack", emoji: "💬" },
  { name: "Pipedrive", emoji: "🔵" },
  { name: "Salesforce", emoji: "☁️" },
  { name: "Notion", emoji: "🗒" },
  { name: "Airtable", emoji: "🟦" },
];

export default async function IntegratePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, title: true },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Distribute
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Integrate</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Send leads from this scorecard straight into your CRM, email tool, or
            anywhere else you want them. Native integrations are coming soon.
          </p>
        </div>
        <Link
          href={`/dashboard/quizzes/${quiz.id}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Scorecard home
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 via-white to-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">In the meantime</p>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Until native integrations land, you can pull leads out via the CSV
              export on the Leads page, or wire up your own webhook receiver
              against the lead capture endpoint.
            </p>
          </div>
          <Link
            href={`/dashboard/quizzes/${quiz.id}/leads`}
            className="btn-secondary"
          >
            Go to leads
          </Link>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Available integrations</h2>
      <p className="mt-1 text-sm text-slate-500">
        These tiles are placeholders until each integration is wired up. We'll
        light them up as they roll out.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {INTEGRATIONS.map((it) => (
          <div
            key={it.name}
            className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 opacity-60"
            title="Coming soon"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-base">
                {it.emoji}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{it.name}</p>
                <p className="text-xs text-slate-500">Configure</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
