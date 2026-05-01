import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import LandingPricing from "@/components/LandingPricing";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-brand-50/40 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="inline-block h-7 w-7 rounded-lg bg-brand-600" />
          <span>Flowscore</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-700 md:flex">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#how" className="hover:text-slate-900">How it works</a>
          <a href="#pricing" className="hover:text-slate-900">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Start free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:py-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          25+ ready-made scorecard templates
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Turn scorecards into{" "}
          <span className="text-brand-600">qualified leads.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Build branded scorecard quizzes in minutes. Score every respondent,
          deliver a personalised PDF report, and capture warm leads on
          autopilot.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 md:flex-row">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Start free
          </Link>
          <a href="#how" className="btn-secondary px-6 py-3 text-base">
            See how it works
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Free forever — no credit card needed.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">
          Everything you need to qualify leads
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          One platform from public landing page to follow-up email — every
          touchpoint branded to you.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Ready-made templates",
              body:
                "Pick from 25+ fully-built scorecards across Finance, Sales, Marketing, Recruitment, Brand and more. Each one ships with branded landing page, questions, results, and PDF report.",
            },
            {
              title: "Drag-and-drop builder",
              body:
                "Customise every page block-by-block: hero splits, feature grids, quote cards, score displays, checklists. Or upload your own questions from Excel.",
            },
            {
              title: "Branded PDF reports",
              body:
                "Every respondent gets a personalised PDF report in their inbox, with your logo, brand colours, and outcome-specific copy.",
            },
            {
              title: "Lead capture + email",
              body:
                "Custom lead-capture fields, GDPR-compliant consent flow, and editable email templates with token substitution. Admin notifications on every new lead.",
            },
            {
              title: "Personalised results",
              body:
                "Outcome bands unlock tailored copy and calls-to-action for each segment. Different result pages for different score tiers, all editable.",
            },
            {
              title: "Analytics + integrations",
              body:
                "Completion rates, top companies, outcome distribution at a glance. Tracking pixels for FB, GA, GTM. Native CRM integrations rolling out soon.",
            },
          ].map((f) => (
            <div key={f.title} className="card">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-brand-100 font-bold text-brand-700">
                {f.title[0]}
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">
          From blank page to live scorecard in minutes
        </h2>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Pick a template",
              body:
                "Choose a fully-ready scorecard from the library, or start from blank. Edit copy, branding and outcomes in your dashboard.",
            },
            {
              step: "2",
              title: "Share anywhere",
              body:
                "Publish your scorecard and share via direct link, embed on your site (full-page, inline, or button), or post the suggested social copy.",
            },
            {
              step: "3",
              title: "Convert",
              body:
                "Capture leads, deliver a personalised PDF report, and follow up — all branded, all automated, with an admin email on every completion.",
            },
          ].map((s) => (
            <li key={s.step} className="card">
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-brand-600 font-bold text-white">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Simple, honest pricing</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Start free, upgrade when you outgrow it. Every paid plan saves 20%
          when billed annually.
        </p>
        <LandingPricing />
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-slate-900">
          Ready to turn your audience into leads?
        </h2>
        <p className="mt-3 text-slate-600">
          Pick a template, paste in your booking link, and you're live in under
          an hour. Free forever to start.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Start free
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            I already have an account
          </Link>
        </div>
      </section>

      <footer className="mx-auto mt-12 max-w-6xl border-t border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Flowscore. Built for advisors, agencies
        and operators who care about qualification.
      </footer>
    </main>
  );
}
