"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
  quizId: string;
  quizTitle: string;
  published: boolean;
  brandColor: string | null;
  metaDescription: string | null;
  publicUrl: string;
};

function CopyButton({
  value,
  size = "sm",
  label = "Copy",
}: {
  value: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  const cls =
    size === "md"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      : "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100";
  return (
    <button type="button" onClick={copy} className={cls}>
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect
          x="5.5"
          y="5.5"
          width="9"
          height="9"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3 11V4a1 1 0 0 1 1-1h7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {copied ? "Copied" : label}
    </button>
  );
}

function ShareIcon({ kind }: { kind: "facebook" | "x" | "linkedin" | "email" }) {
  const d: Record<string, string> = {
    facebook:
      "M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.8 3.7-3.8 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z",
    x:
      "M18.9 2H22l-7.2 8.2L23 22h-6.7l-5.2-6.8L4.9 22H1.8l7.7-8.8L1 2h6.8l4.7 6.2L18.9 2zm-1 18h1.7L7.2 4H5.4l12.5 16z",
    linkedin:
      "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.3 18V10H5.7v8h2.6zM7 8.7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.3 18v-4.4c0-2.4-1.3-3.5-3-3.5-1.4 0-2 .8-2.3 1.3V10h-2.6v8h2.6v-4.4c0-.2 0-.5.1-.7.2-.5.7-1 1.5-1 1 0 1.4.8 1.4 2V18h2.3z",
    email:
      "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.5l8 5 8-5V6H4zm16 2.5L12.5 13a1 1 0 0 1-1 0L4 8.5V18h16V8.5z",
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={d[kind]} />
    </svg>
  );
}

export default function EmbedAndShare({
  quizId,
  quizTitle,
  published,
  brandColor,
  metaDescription,
  publicUrl,
}: Props) {
  const description =
    metaDescription ||
    "Take a 3-minute scorecard and get a personalised PDF report.";

  const shareLinks = useMemo(() => {
    const u = encodeURIComponent(publicUrl);
    const t = encodeURIComponent(quizTitle);
    const d = encodeURIComponent(description);
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      email: `mailto:?subject=${t}&body=${d}%20${u}`,
    };
  }, [publicUrl, quizTitle, description]);

  const fullPageEmbed = `<iframe src="${publicUrl}" style="width:100%; height:100vh; border:0;" loading="lazy" allow="autoplay; fullscreen" title="${escapeAttr(quizTitle)}"></iframe>`;
  const inlineEmbed = `<iframe src="${publicUrl}" style="width:100%; min-height:720px; border:0;" loading="lazy" allow="autoplay" title="${escapeAttr(quizTitle)}"></iframe>`;
  const popupEmbed = `<a href="${publicUrl}" target="_blank" rel="noopener" style="display:inline-block; background:${brandColor || "#345ff2"}; color:#fff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:600;">Take the scorecard →</a>`;

  const tweetCopy = `${quizTitle} — discover where you stand in 3 minutes. Take the scorecard now: ${publicUrl}`;
  const facebookCopy = `Curious where you actually stand? ${quizTitle} is a quick 3-minute scorecard that gives you a personalised PDF report.\n\n${description}\n\nTake it here: ${publicUrl}`;
  const linkedinCopy = `${quizTitle}\n\n${description}\n\nIf this is on your radar right now, you can take the scorecard in 3 minutes and get a personalised report straight back: ${publicUrl}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Distribute
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Embed and share</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Building your scorecard is only part of the job. Use the link, embeds
            and ready-made social posts below to launch and promote it.
          </p>
        </div>
        <Link
          href={`/dashboard/quizzes/${quizId}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Scorecard home
        </Link>
      </div>

      {!published && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This scorecard is in draft mode — the link won't work for visitors yet.
          Publish it from the scorecard home before sharing.
        </div>
      )}

      {/* Share your link */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Share your link</h2>
        <div className="card mt-4 grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  published
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    published ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {published ? "Live" : "Draft"}
              </span>
              <p className="font-semibold text-slate-900">{quizTitle}</p>
            </div>
            <code className="block break-all rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {publicUrl}
            </code>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={publicUrl} size="md" label="Copy link" />
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open ↗
              </a>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Share to
            </p>
            <div className="flex gap-2">
              {(
                [
                  { kind: "facebook", label: "Facebook", color: "#1877f2" },
                  { kind: "x", label: "X / Twitter", color: "#000000" },
                  { kind: "linkedin", label: "LinkedIn", color: "#0a66c2" },
                  { kind: "email", label: "Email", color: "#475569" },
                ] as const
              ).map((s) => (
                <a
                  key={s.kind}
                  href={shareLinks[s.kind]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Share to ${s.label}`}
                  className="grid h-9 w-9 place-items-center rounded-md text-white transition hover:opacity-90"
                  style={{ backgroundColor: s.color }}
                >
                  <ShareIcon kind={s.kind} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Embed on your website */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Embed on your website</h2>
        <p className="mt-1 text-sm text-slate-500">
          Drop this scorecard into your existing site. Pick the embed style and
          paste the snippet wherever you can add HTML.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EmbedTile
            title="Full page"
            description="Take over the screen with a full-screen iframe."
            snippet={fullPageEmbed}
          />
          <EmbedTile
            title="Inline"
            description="Embed inside an existing page section, like a regular block."
            snippet={inlineEmbed}
          />
          <EmbedTile
            title="Button / Pop-up"
            description="A branded button that opens the scorecard in a new tab."
            snippet={popupEmbed}
            preview={
              <a
                aria-disabled
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-block rounded-md px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: brandColor || "#345ff2" }}
              >
                Take the scorecard →
              </a>
            }
          />
        </div>
      </section>

      {/* Suggested social posts */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Suggested social posts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Edit and copy ready-made copy for the channels that work best for you.
        </p>
        <div className="mt-4 space-y-4">
          <SocialBlock
            kind="x"
            label="X / Twitter"
            color="#000000"
            initial={tweetCopy}
          />
          <SocialBlock
            kind="facebook"
            label="Facebook"
            color="#1877f2"
            initial={facebookCopy}
          />
          <SocialBlock
            kind="linkedin"
            label="LinkedIn"
            color="#0a66c2"
            initial={linkedinCopy}
          />
        </div>
      </section>
    </div>
  );
}

function EmbedTile({
  title,
  description,
  snippet,
  preview,
}: {
  title: string;
  description: string;
  snippet: string;
  preview?: React.ReactNode;
}) {
  return (
    <div className="card flex h-full flex-col">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {preview && (
        <div className="mt-3 grid place-items-center rounded-md border border-slate-200 bg-slate-50 px-4 py-6">
          {preview}
        </div>
      )}
      <div className="mt-3 flex-1">
        <pre className="max-h-32 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
          <code>{snippet}</code>
        </pre>
      </div>
      <div className="mt-3">
        <CopyButton value={snippet} size="md" label="Copy snippet" />
      </div>
    </div>
  );
}

function SocialBlock({
  kind,
  label,
  color,
  initial,
}: {
  kind: "x" | "facebook" | "linkedin";
  label: string;
  color: string;
  initial: string;
}) {
  const [text, setText] = useState(initial);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-white"
        style={{ backgroundColor: color }}
      >
        <span className="inline-flex items-center gap-2">
          <ShareIcon kind={kind} />
          {label}
        </span>
        <CopyButton value={text} label="Copy post" size="sm" />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={kind === "x" ? 3 : 5}
        className="block w-full resize-none border-0 px-4 py-3 text-sm text-slate-800 outline-none"
      />
    </div>
  );
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
