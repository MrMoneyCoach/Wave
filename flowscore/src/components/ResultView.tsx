"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Block =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "list"; items: string[]; checkmark: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "divider" }
  | {
      id: string;
      type: "score-display";
      align: "left" | "center" | "right";
      label: string;
      showBar: boolean;
    }
  | {
      id: string;
      type: "hero-split";
      headline: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
      bullets: string[];
      imageUrl: string;
      imageAlt: string;
      imagePosition: "left" | "right";
    }
  | {
      id: string;
      type: "feature-grid";
      heading: string;
      subhead: string;
      columns: 2 | 3 | 4;
      items: { id: string; iconUrl: string; title: string; body: string }[];
    }
  | {
      id: string;
      type: "image-text";
      imageUrl: string;
      imageAlt: string;
      imagePosition: "left" | "right";
      heading: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
    };

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

type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; to: string }
  | { status: "error"; message: string };

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
  const alreadySent = !!submission.pdfSentAt;
  const initial: SendState = alreadySent
    ? { status: "sent", to: submission.email ?? "" }
    : { status: "idle" };
  const [send, setSend] = useState<SendState>(initial);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (alreadySent || !submission.email) return;

    setSend({ status: "sending" });
    fetch(`/api/q/${slug}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: submission.id }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSend({ status: "error", message: data.error || "Couldn't send" });
          return;
        }
        setSend({ status: "sent", to: data.sentTo || submission.email || "" });
      })
      .catch((e) => {
        setSend({
          status: "error",
          message: e instanceof Error ? e.message : "Network error",
        });
      });
  }, [alreadySent, slug, submission.email, submission.id]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="card">
          {hasBlocks ? (
            <div className="space-y-6">
              {blocks.map((b) => (
                <BlockRender
                  key={b.id}
                  block={b}
                  brand={brandColor}
                  percent={submission.percent}
                />
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
                Your Flowscore result
              </p>
              <h1 className="mt-1 text-3xl font-bold">{quizTitle}</h1>

              <div className="mt-6 flex flex-col items-center gap-4 md:flex-row">
                <ScoreDial percent={submission.percent} brand={brandColor} />
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

          {!hasBlocks && (
            <div className="mt-8 border-t border-slate-100 pt-6 text-sm">
              {send.status === "sending" && (
                <p className="text-slate-600">📨 Sending your report…</p>
              )}
              {send.status === "sent" && (
                <p className="text-green-700">
                  📬 Your full report is on its way to{" "}
                  <span className="font-semibold">{send.to || "your inbox"}</span>.
                  Check spam if it doesn't arrive in a few minutes.
                </p>
              )}
              {send.status === "error" && (
                <p className="text-red-700">
                  We couldn't send your report — {send.message}. Please contact
                  {ownerName ? ` ${ownerName}` : " the quiz owner"}.
                </p>
              )}
              {send.status === "idle" && submission.email === null && (
                <p className="text-slate-500">
                  No email captured for this submission, so we can't send a copy.
                </p>
              )}
            </div>
          )}

          {!hasBlocks && bookingUrl && (
            <div
              className="mt-10 rounded-xl p-6 text-center text-white"
              style={{ backgroundColor: brandColor }}
            >
              <p className="text-sm font-medium uppercase tracking-wide text-white/80">
                Next step
              </p>
              <h2 className="mt-1 text-2xl font-bold">{bookingLabel}</h2>
              <p className="mt-2 text-white/90">
                Walk through your result one-to-one and get tailored next steps.
              </p>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold transition hover:bg-slate-100"
                style={{ color: brandColor }}
              >
                Book a call →
              </a>
            </div>
          )}

          {!hasBlocks && (
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href={`/q/${slug}`} className="btn-secondary">
                Retake
              </Link>
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by Flowscore</p>
      </div>
    </main>
  );
}

function ScoreDial({ percent, brand }: { percent: number; brand: string }) {
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
        stroke={brand}
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

function BlockRender({
  block,
  brand,
  percent = 0,
}: {
  block: Block;
  brand: string;
  percent?: number;
}) {
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
  if (block.type === "score-display") {
    const alignCls =
      block.align === "center"
        ? "text-center"
        : block.align === "right"
        ? "text-right"
        : "text-left";
    const barWrapAlign =
      block.align === "center"
        ? "mx-auto"
        : block.align === "right"
        ? "ml-auto"
        : "";
    const pct = Math.max(0, Math.min(100, percent));
    return (
      <div className={alignCls}>
        <div
          className="text-6xl font-bold leading-none tracking-tight md:text-7xl"
          style={{ color: brand }}
        >
          {pct.toFixed(0)}%
        </div>
        {block.showBar && (
          <div className={`mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100 ${barWrapAlign}`}>
            <div
              className="h-full"
              style={{ width: `${pct}%`, backgroundColor: brand }}
            />
          </div>
        )}
        {block.label && (
          <p className="mt-2 text-xl font-bold" style={{ color: brand }}>
            {block.label}
          </p>
        )}
      </div>
    );
  }
  if (block.type === "hero-split") {
    const text = (
      <div className="flex flex-col justify-center">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
          {block.headline}
        </h2>
        {block.body && (
          <p className="mt-5 whitespace-pre-wrap text-base text-slate-600 md:text-lg">
            {block.body}
          </p>
        )}
        {block.bullets.filter(Boolean).length > 0 && (
          <ul className="mt-6 space-y-3">
            {block.bullets.filter(Boolean).map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: brand }}
                >
                  ✓
                </span>
                <span className="text-base text-slate-800">{b}</span>
              </li>
            ))}
          </ul>
        )}
        {block.ctaLabel && block.ctaUrl && (
          <a
            href={block.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex max-w-max items-center gap-2 rounded-lg px-6 py-3 text-base font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: brand }}
          >
            {block.ctaLabel} <span aria-hidden>→</span>
          </a>
        )}
      </div>
    );
    if (!block.imageUrl) return text;
    const image = (
      <div className="overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.imageUrl}
          alt={block.imageAlt}
          className="h-full w-full object-contain"
        />
      </div>
    );
    return (
      <div className="grid items-center gap-8 md:grid-cols-2">
        {block.imagePosition === "left" ? (
          <>
            {image}
            {text}
          </>
        ) : (
          <>
            {text}
            {image}
          </>
        )}
      </div>
    );
  }
  if (block.type === "feature-grid") {
    const colsClass =
      block.columns === 2
        ? "md:grid-cols-2"
        : block.columns === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-4";
    return (
      <div>
        {(block.heading || block.subhead) && (
          <div className="mx-auto mb-10 max-w-2xl text-center">
            {block.heading && (
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
                {block.heading}
              </h2>
            )}
            {block.subhead && (
              <p className="mt-3 whitespace-pre-wrap text-base text-slate-600 md:text-lg">
                {block.subhead}
              </p>
            )}
          </div>
        )}
        <div className={`grid gap-8 ${colsClass}`}>
          {block.items.map((item) => (
            <div key={item.id} className="text-center">
              {item.iconUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.iconUrl}
                  alt=""
                  className="mx-auto mb-4 h-16 w-16 object-contain"
                />
              ) : (
                <div
                  className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-white"
                  style={{ backgroundColor: brand }}
                  aria-hidden
                >
                  ◆
                </div>
              )}
              {item.title && (
                <h3 className="text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
              )}
              {item.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {item.body}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (block.type === "image-text") {
    const text = (
      <div className="flex flex-col justify-center">
        {block.heading && (
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
            {block.heading}
          </h2>
        )}
        {block.body && (
          <p className="mt-4 whitespace-pre-wrap text-base text-slate-600 md:text-lg">
            {block.body}
          </p>
        )}
        {block.ctaLabel && block.ctaUrl && (
          <a
            href={block.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex max-w-max items-center gap-2 rounded-lg px-6 py-3 text-base font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: brand }}
          >
            {block.ctaLabel} <span aria-hidden>→</span>
          </a>
        )}
      </div>
    );
    if (!block.imageUrl) return text;
    const image = (
      <div className="overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.imageUrl}
          alt={block.imageAlt}
          className="h-full w-full object-cover"
        />
      </div>
    );
    return (
      <div className="grid items-center gap-8 md:grid-cols-2">
        {block.imagePosition === "left" ? (
          <>
            {image}
            {text}
          </>
        ) : (
          <>
            {text}
            {image}
          </>
        )}
      </div>
    );
  }
  if (block.type === "divider") {
    return <hr className="border-t border-slate-200" />;
  }
  return null;
}
