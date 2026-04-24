import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-brand-50 to-white">
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
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">Start free</Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:py-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          New: upload questions from Excel in one click
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Turn quizzes into <span className="text-brand-600">qualified leads.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Build branded scorecard quizzes in minutes. Score every respondent, deliver a personalised
          result, and capture the right leads with the right insight, automatically.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 md:flex-row">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Build your first quiz</Link>
          <a href="#how" className="btn-secondary px-6 py-3 text-base">See how it works</a>
        </div>
        <p className="mt-4 text-sm text-slate-500">Free during beta — no credit card.</p>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Everything you need to qualify leads</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Scorecard builder",
              body:
                "Single-choice, multi-choice and scale questions. Weight every answer. Set outcome bands that tell each respondent exactly where they stand.",
            },
            {
              title: "Excel upload",
              body:
                "Paste your questions into a spreadsheet and upload. Flowscore detects your columns, groups answers, and spins up the quiz in seconds.",
            },
            {
              title: "Shareable quizzes",
              body: "Every quiz gets a public link. Share it on social, embed it, or send it by email — no setup.",
            },
            {
              title: "Lead capture",
              body: "Capture name and email before delivering the result. Every lead is tagged with their score and answers.",
            },
            {
              title: "Personalised results",
              body: "Outcome bands unlock tailored copy and calls-to-action for each segment of respondents.",
            },
            {
              title: "Analytics",
              body: "See completions, average score, and conversion rates at a glance. Export leads to CSV any time.",
            },
          ].map((f) => (
            <div key={f.title} className="card">
              <div className="mb-3 h-10 w-10 rounded-lg bg-brand-100 text-brand-700 grid place-items-center font-bold">
                {f.title[0]}
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">From blank page to live quiz in minutes</h2>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Build",
              body:
                "Create questions in the dashboard — or upload them from Excel. Define outcomes for every score band.",
            },
            {
              step: "2",
              title: "Share",
              body: "Publish your quiz and share the link anywhere. Respondents answer in a clean, focused flow.",
            },
            {
              step: "3",
              title: "Convert",
              body: "Capture contact details, show a personalised result, and follow up with leads that are already warm.",
            },
          ].map((s) => (
            <li key={s.step} className="card">
              <div className="mb-3 h-8 w-8 rounded-full bg-brand-600 text-white grid place-items-center font-bold">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
        <p className="mt-3 text-center text-slate-600">Start free. Upgrade when you outgrow it.</p>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="card">
            <h3 className="text-xl font-semibold">Starter</h3>
            <p className="mt-1 text-3xl font-bold">Free</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>Up to 2 quizzes</li>
              <li>100 leads / month</li>
              <li>Excel upload</li>
              <li>CSV export</li>
            </ul>
            <Link href="/signup" className="btn-secondary mt-6 w-full">Get started</Link>
          </div>
          <div className="card border-brand-500 ring-2 ring-brand-200">
            <h3 className="text-xl font-semibold text-brand-700">Growth</h3>
            <p className="mt-1 text-3xl font-bold">£39 / mo</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>Unlimited quizzes</li>
              <li>Unlimited leads</li>
              <li>Custom branding</li>
              <li>Integrations (coming soon)</li>
            </ul>
            <Link href="/signup" className="btn-primary mt-6 w-full">Start 14-day trial</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-12 max-w-6xl border-t border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Flowscore. Built for marketers who care about qualification.
      </footer>
    </main>
  );
}
