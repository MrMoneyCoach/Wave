import { supabaseServer } from "@/lib/supabase/server";
import BillingActions from "./BillingActions";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { session_id?: string; canceled?: string; intent?: string };
}) {
  const supabase = supabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_current_period_end, stripe_customer_id")
    .maybeSingle();

  const plan = (profile?.plan as "free" | "pro" | undefined) ?? "free";
  const hasCustomer = !!profile?.stripe_customer_id;
  const renewsAt = profile?.plan_current_period_end
    ? new Date(profile.plan_current_period_end).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-ink/60">
        You&apos;re currently on the <strong>{plan === "pro" ? "Pro" : "Free"}</strong> plan.
        {plan === "pro" && renewsAt ? ` Renews ${renewsAt}.` : null}
      </p>

      {searchParams.session_id && plan === "free" && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Thanks for upgrading — we&apos;re waiting on Stripe&apos;s webhook to flip your plan to
          Pro. Refresh in a few seconds.
        </p>
      )}
      {searchParams.canceled && (
        <p className="mt-3 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70">
          Checkout was cancelled. Nothing was charged.
        </p>
      )}
      {searchParams.intent === "custom_templates" && plan === "free" && (
        <p className="mt-3 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70">
          Custom templates need the Pro plan. Upgrade below and you&apos;ll be back at the editor in seconds.
        </p>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          subtitle="for casual use"
          highlight={plan === "free"}
          features={[
            "Unlimited uploads",
            "8 built-in summary templates",
            "Browser, desktop & mobile recorders",
            "Meeting bot for Zoom/Meet/Teams",
            "Pay-as-you-go transcription costs apply at scale",
          ]}
          cta={null}
        />
        <PlanCard
          name="Pro"
          price="$19"
          subtitle="/ month"
          highlight={plan === "pro"}
          features={[
            "Everything in Free",
            "Custom summary templates (your sections, your prompt)",
            "Priority support",
            "First access to upcoming features (sharing, integrations)",
          ]}
          cta={
            <BillingActions plan={plan} hasCustomer={hasCustomer} />
          }
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  subtitle,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  subtitle: string;
  features: string[];
  cta: React.ReactNode;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-5 ${
        highlight ? "border-ink shadow-sm" : "border-ink/10"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{name}</h2>
        {highlight && (
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-paper">
            Current
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-semibold">{price}</span>
        <span className="text-sm text-ink/60">{subtitle}</span>
      </div>
      <ul className="mt-4 space-y-1 text-sm text-ink/70">
        {features.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}
