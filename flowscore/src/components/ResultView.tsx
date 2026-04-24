"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  slug: string;
  quizTitle: string;
  submission: {
    id: string;
    firstName: string | null;
    email: string | null;
    phone: string | null;
    percent: number;
    score: number;
    maxScore: number;
    marketingConsent: boolean;
    pdfSentAt: string | null;
  };
  outcome: { title: string; description: string } | null;
  bookingUrl: string | null;
  bookingLabel: string;
  ownerName: string | null;
};

export default function ResultView({
  slug,
  quizTitle,
  submission,
  outcome,
  bookingUrl,
  bookingLabel,
  ownerName,
}: Props) {
  const [emailConfirm, setEmailConfirm] = useState("");
  const [phoneConfirm, setPhoneConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { emailed: boolean; downloadUrl: string; emailError?: string }
    | null
  >(null);

  async function requestPdf(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/q/${slug}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: submission.id,
        emailConfirm,
        phoneConfirm,
        marketingConsent: consent,
      }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not send the PDF");
      return;
    }
    setResult({
      emailed: !!data.emailed,
      downloadUrl: data.downloadUrl,
      emailError: data.emailError,
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="card">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            Your Flowscore result
          </p>
          <h1 className="mt-1 text-3xl font-bold">{quizTitle}</h1>

          <div className="mt-6 flex flex-col items-center gap-4 md:flex-row">
            <ScoreDial percent={submission.percent} />
            <div>
              <p className="text-5xl font-bold text-slate-900">
                {submission.percent.toFixed(1)}%
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {submission.score.toFixed(1)} of {submission.maxScore.toFixed(1)} points
              </p>
            </div>
          </div>

          {outcome ? (
            <div className="mt-8 rounded-lg border border-brand-200 bg-brand-50 p-5">
              <h2 className="text-xl font-semibold text-brand-800">{outcome.title}</h2>
              {outcome.description && (
                <p className="mt-2 whitespace-pre-wrap text-brand-900/90">
                  {outcome.description}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-6 text-slate-600">
              Thanks for completing the quiz — your score has been recorded.
            </p>
          )}

          <div className="mt-8 border-t border-slate-100 pt-8">
            <h2 className="text-lg font-semibold">Get your results by email</h2>
            <p className="mt-1 text-sm text-slate-600">
              We'll send you a PDF of your full report. Re-enter your email and phone so
              we know we've got it right, and confirm you're happy to be contacted.
            </p>

            {result ? (
              <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                {result.emailed ? (
                  <p className="font-medium text-green-800">
                    📬 Sent to {emailConfirm}. Check your inbox (and spam) in the next
                    few minutes.
                  </p>
                ) : (
                  <p className="font-medium text-green-800">
                    ✅ Your PDF is ready. You can download it below.
                    {result.emailError && (
                      <span className="ml-2 block text-xs font-normal text-green-700">
                        (email delivery isn't configured yet — {result.emailError})
                      </span>
                    )}
                  </p>
                )}
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  className="btn-secondary mt-3 inline-flex"
                >
                  Download PDF
                </a>
              </div>
            ) : (
              <form onSubmit={requestPdf} className="mt-5 space-y-4">
                <div>
                  <label className="label">Confirm your email</label>
                  <input
                    type="email"
                    required
                    className="input"
                    value={emailConfirm}
                    onChange={(e) => setEmailConfirm(e.target.value)}
                    placeholder={submission.email ?? "you@example.com"}
                  />
                </div>
                <div>
                  <label className="label">
                    Confirm your phone
                    {submission.phone && (
                      <span className="ml-1 font-normal text-slate-400">
                        (must match the one you gave earlier)
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    required
                    className="input"
                    value={phoneConfirm}
                    onChange={(e) => setPhoneConfirm(e.target.value)}
                    placeholder="+44 7…"
                  />
                </div>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                  />
                  <span>
                    I'd like to receive my results PDF
                    {ownerName ? ` and occasional follow-up from ${ownerName}` : ""}.
                    I can unsubscribe at any time.{" "}
                    <span className="text-brand-600">(required)</span>
                  </span>
                </label>
                {error && (
                  <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button className="btn-primary w-full" disabled={busy}>
                  {busy ? "Sending…" : "Send me the PDF"}
                </button>
              </form>
            )}
          </div>

          {bookingUrl && (
            <div className="mt-10 rounded-xl border border-brand-200 bg-brand-600 p-6 text-center text-white">
              <p className="text-sm font-medium uppercase tracking-wide text-brand-100">
                Next step
              </p>
              <h2 className="mt-1 text-2xl font-bold">{bookingLabel}</h2>
              <p className="mt-2 text-brand-50">
                Walk through your result one-to-one and get tailored next steps.
              </p>
              <a
                href={bookingUrl}
                target="_blank"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                Book a call →
              </a>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            <Link href={`/q/${slug}`} className="btn-secondary">
              Retake
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by Flowscore</p>
      </div>
    </main>
  );
}

function ScoreDial({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="none" />
      <circle
        cx="70"
        cy="70"
        r={radius}
        stroke="#345ff2"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
      />
    </svg>
  );
}
