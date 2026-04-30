"use client";

import { useState } from "react";
import Link from "next/link";

type Block =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "list"; items: string[]; checkmark: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "divider" };

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
  brandColor?: string;
  blocks?: Block[];
};

export default function ResultView({
  slug,
  quizTitle,
  submission,
  outcome,
  bookingUrl,
  bookingLabel,
  ownerName,
  brandColor = "#345ff2",
  blocks = [],
}: Props) {
  const hasBlocks = blocks.length > 0;
  const [email, setEmail] = useState(submission.email ?? "");
  const [phone, setPhone] = useState(submission.phone ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(
    submission.pdfSentAt && submission.email ? submission.email : null,
  );

  async function sendReport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/q/${slug}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: submission.id,
        email: email.trim(),
        phone: phone.trim(),
        marketingConsent: consent,
      }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "We couldn't send your report");
      return;
    }
    setSentTo(data.sentTo || email);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="card">
          {hasBlocks ? (
            <div className="space-y-6">
              {blocks.map((b) => (
                <BlockRender key={b.id} block={b} brand={brandColor} />
              ))}
            </div>
          ) : (
            <>
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
                    {submission.score.toFixed(1)} of{" "}
                    {submission.maxScore.toFixed(1)} points
                  </p>
                </div>
              </div>

              {outcome ? (
                <div className="mt-8 rounded-lg border border-brand-200 bg-brand-50 p-5">
                  <h2 className="text-xl font-semibold text-brand-800">
                    {outcome.title}
                  </h2>
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
            </>
          )}

          <div className="mt-8 border-t border-slate-100 pt-8">
            <h2 className="text-lg font-semibold">Get your full report by email</h2>

            {sentTo ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                <p className="font-medium text-green-800">
                  📬 Sent to <span className="font-semibold">{sentTo}</span>.
                </p>
                <p className="mt-1 text-green-700">
                  Check your inbox (and spam folder) in the next few minutes.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600">
                  Confirm or update where to send it. Your earlier entries are pre-filled —
                  you can change them here.
                </p>
                <form onSubmit={sendReport} className="mt-4 space-y-4">
                <div>
                  <label className="label">
                    Email <span className="text-brand-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label">
                    Phone <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 …"
                  />
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
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
                  {busy ? "Sending…" : "Send my report"}
                </button>
              </form>
              </>
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

function BlockRender({ block, brand }: { block: Block; brand: string }) {
  if (block.type === "heading") {
    const sizeCls =
      block.level === 1
        ? "text-4xl md:text-5xl"
        : block.level === 2
        ? "text-3xl md:text-4xl"
        : "text-2xl md:text-3xl";
    return (
      <h2
        className={`${sizeCls} font-semibold leading-tight tracking-tight text-slate-900`}
      >
        {block.text}
      </h2>
    );
  }
  if (block.type === "paragraph") {
    return (
      <p className="whitespace-pre-wrap text-base text-slate-600 md:text-lg">
        {block.text}
      </p>
    );
  }
  if (block.type === "image") {
    if (!block.url) return null;
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.url} alt={block.alt} className="w-full object-cover" />
      </div>
    );
  }
  if (block.type === "list") {
    const items = block.items.filter((s) => s.trim().length > 0);
    if (items.length === 0) return null;
    return (
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            {block.checkmark ? (
              <span
                aria-hidden
                className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: brand }}
              >
                ✓
              </span>
            ) : (
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400"
              />
            )}
            <span className="text-base text-slate-800 md:text-lg">{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "button") {
    if (!block.url || !block.label) return null;
    const style =
      block.style === "primary"
        ? { backgroundColor: brand, color: "white" }
        : { border: `1px solid ${brand}`, color: brand };
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-medium transition hover:opacity-90"
        style={style}
      >
        {block.label} <span aria-hidden>→</span>
      </a>
    );
  }
  if (block.type === "divider") {
    return <hr className="border-t border-slate-200" />;
  }
  return null;
}
