"use client";

import { useState } from "react";
import Link from "next/link";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { formatDate, formatSeconds, speakerColor } from "@/lib/format";
import {
  DEMO_COMMENTS,
  DEMO_MEETING,
  DEMO_MEETING_LIST,
  DEMO_SEGMENTS,
  DEMO_SHARES,
  DEMO_TEMPLATES,
  type MeetingListRow,
} from "@/lib/demo-data";
import type { Meeting } from "@/lib/types";

type Screen =
  | "dashboard"
  | "meeting"
  | "record"
  | "templates"
  | "billing"
  | "settings"
  | "share";

const TABS: { key: Screen; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "meeting", label: "Meeting" },
  { key: "record", label: "Record" },
  { key: "templates", label: "Templates" },
  { key: "billing", label: "Billing" },
  { key: "settings", label: "Settings" },
  { key: "share", label: "Public link" },
];

export default function PreviewApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");

  return (
    <div className="min-h-screen">
      {/* Preview banner */}
      <div className="bg-ink px-4 py-2 text-center text-xs text-paper">
        Preview mode — demo data, nothing is saved.{" "}
        <Link href="/" className="underline">
          Back to landing
        </Link>
      </div>

      {/* Faux app header */}
      <header className="border-b border-ink/10 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide">Recap</span>
            <span className="text-xs text-ink/50">you@yourcompany.com</span>
          </div>
          <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setScreen(t.key)}
                className={
                  screen === t.key
                    ? "font-medium text-ink"
                    : "text-ink/55 hover:text-ink"
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7">
        {screen === "dashboard" && <DashboardScreen onOpen={() => setScreen("meeting")} />}
        {screen === "meeting" && <MeetingScreen />}
        {screen === "record" && <RecordScreen />}
        {screen === "templates" && <TemplatesScreen />}
        {screen === "billing" && <BillingScreen />}
        {screen === "settings" && <SettingsScreen />}
        {screen === "share" && <ShareScreen />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-12 pt-4 text-xs text-ink/45">
        This is a static tour. To run the real app — with live transcription, your own
        recordings and accounts — see the setup steps in the repo&apos;s{" "}
        <code className="rounded bg-ink/5 px-1">recap/README.md</code>.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: Meeting["status"] }) {
  const map: Record<Meeting["status"], { label: string; className: string }> = {
    uploading: { label: "Uploading", className: "bg-ink/10 text-ink/70" },
    queued: { label: "Queued", className: "bg-ink/10 text-ink/70" },
    transcribing: { label: "Transcribing", className: "bg-amber-100 text-amber-900" },
    transcribed: { label: "Transcribed", className: "bg-amber-100 text-amber-900" },
    summarizing: { label: "Summarizing", className: "bg-amber-100 text-amber-900" },
    ready: { label: "Ready", className: "bg-emerald-100 text-emerald-900" },
    failed: { label: "Failed", className: "bg-red-100 text-red-900" },
  };
  const { label, className } = map[status];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function sourceLabel(source: Meeting["source"]) {
  return {
    upload: "Upload",
    browser_record: "Browser",
    desktop_app: "Desktop",
    mobile_app: "Mobile",
    meeting_bot: "Bot",
  }[source];
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-ink/20 bg-white px-3 py-2 text-xs text-ink/55">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function DashboardScreen({ onOpen }: { onOpen: () => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your meetings</h1>
        <div className="flex flex-wrap gap-2">
          <FauxButton variant="ghost">Upload</FauxButton>
          <FauxButton variant="ghost">Send bot</FauxButton>
          <FauxButton>Record</FauxButton>
        </div>
      </div>

      <div className="mt-6 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
        {DEMO_MEETING_LIST.map((m: MeetingListRow) => (
          <button
            key={m.id}
            onClick={m.id === "demo" ? onOpen : undefined}
            className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left ${
              m.id === "demo" ? "hover:bg-ink/5" : "cursor-default"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.title}</div>
              <div className="mt-0.5 text-xs text-ink/60">
                {formatDate(m.created_at)} · {formatSeconds(m.duration_seconds)} ·{" "}
                {sourceLabel(m.source)}
              </div>
            </div>
            <StatusPill status={m.status} />
          </button>
        ))}
      </div>
      <SectionHint>
        <strong>Tip:</strong> tap &ldquo;Customer call — Northwind Traders&rdquo; (the top row) to
        open a fully populated meeting.
      </SectionHint>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meeting detail
// ---------------------------------------------------------------------------

function MeetingScreen() {
  const [tab, setTab] = useState<"summary" | "transcript">("summary");
  const meeting = DEMO_MEETING;
  const template = DEMO_TEMPLATES.find((t) => t.id === meeting.template_id)!;
  const speakerCount = new Set(DEMO_SEGMENTS.map((s) => s.speaker)).size;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {formatDate(meeting.created_at)} · {formatSeconds(meeting.duration_seconds)} ·{" "}
            {speakerCount} speakers
          </p>
        </div>
        <StatusPill status={meeting.status} />
      </div>

      <div className="mt-6 flex gap-2 border-b border-ink/10">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Summary
        </TabButton>
        <TabButton active={tab === "transcript"} onClick={() => setTab("transcript")}>
          Transcript
        </TabButton>
      </div>

      {tab === "summary" ? (
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_240px]">
          <div>
            <SummaryDisplay sections={template.sections} summary={meeting.summary!} />
          </div>
          <aside>
            <div className="text-xs font-medium uppercase tracking-widest text-ink/50">
              Template
            </div>
            <div className="mt-2 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm">
              {template.name}
            </div>
            <p className="mt-2 text-xs text-ink/60">{template.description}</p>
            <p className="mt-2 text-xs text-ink/45">
              In the real app this is a dropdown — switch templates to instantly re-summarise the
              same transcript.
            </p>
          </aside>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {DEMO_SEGMENTS.map((s) => (
            <div key={s.id} className="flex items-start gap-3">
              <span className="w-12 shrink-0 pt-0.5 text-xs text-ink/40">
                {formatSeconds(s.start_seconds)}
              </span>
              <div className="flex-1">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${speakerColor(s.speaker)}`}
                >
                  Speaker {s.speaker + 1}
                </span>
                <p className="mt-1 text-sm leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
          <SectionHint>
            Speaker labels come from Deepgram diarization. In the real app you click a chip to
            rename a speaker once and it sticks everywhere.
          </SectionHint>
        </div>
      )}

      {/* Export */}
      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="text-sm font-semibold">Export</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <FauxButton variant="ghost">Post to Slack</FauxButton>
          <FauxButton variant="ghost">Export to Notion</FauxButton>
        </div>
      </section>

      {/* Share */}
      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="text-sm font-semibold">Share</h2>
        <div className="mt-3 rounded-md border border-ink/10 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Public link</div>
              <div className="text-xs text-ink/60">
                Anyone with the link can view the summary and transcript — no sign-in.
              </div>
            </div>
            <FauxButton variant="ghost">Disable</FauxButton>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value="https://recap.app/share/demo-share-token"
              className="min-w-0 flex-1 rounded border border-ink/15 bg-paper px-2 py-1 text-xs"
            />
            <FauxButton variant="ghost">Copy</FauxButton>
          </div>
        </div>
        <div className="mt-3 rounded-md border border-ink/10 bg-white p-4">
          <div className="text-sm font-medium">Shared with teammates</div>
          <ul className="mt-3 space-y-1">
            {DEMO_SHARES.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded bg-paper px-2 py-1 text-sm"
              >
                <span>{s.shared_with_email}</span>
                <span className="text-xs text-ink/45">added {formatDate(s.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comments */}
      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="text-sm font-semibold">
          Comments <span className="text-ink/40">({DEMO_COMMENTS.length})</span>
        </h2>
        <div className="mt-3 space-y-3">
          {DEMO_COMMENTS.map((c) => (
            <div key={c.id} className="rounded-md border border-ink/10 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{c.author_email}</span>
                <span className="text-xs text-ink/40">{formatDate(c.created_at)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
        <textarea
          readOnly
          rows={3}
          placeholder="Add a comment…"
          className="mt-4 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Record
// ---------------------------------------------------------------------------

function RecordScreen() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Record a meeting</h1>
      <p className="mt-1 text-sm text-ink/60">
        Captures both sides of a video call by mixing your microphone with the tab/screen audio.
      </p>
      <div className="mt-6 max-w-xl">
        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-ink/50">
                Ready
              </div>
              <div className="mt-1 font-mono text-3xl tabular-nums">0:00</div>
            </div>
            <div className="h-3 w-3 rounded-full bg-ink/20" />
          </div>
          <div className="mt-5">
            <FauxButton>Start recording</FauxButton>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <LabeledInput label="Title" placeholder="Customer call — Acme Co" />
          <LabeledSelect label="Summary template" value="Sales call" />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-medium">Capture other participants&apos; audio</span>
              <span className="mt-0.5 block text-xs text-ink/60">
                The browser asks you to share a tab — tick &ldquo;Share audio&rdquo; so we hear the
                whole call.
              </span>
            </span>
          </label>
        </div>
        <SectionHint>
          There are four other ways to capture a meeting: upload a file, send a bot to a
          Zoom/Meet/Teams call, the downloadable desktop recorder, and the mobile app.
        </SectionHint>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function TemplatesScreen() {
  const own = DEMO_TEMPLATES.filter((t) => t.owner_id !== null);
  const builtIn = DEMO_TEMPLATES.filter((t) => t.owner_id === null);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="mt-1 text-sm text-ink/60">
            Templates shape the summary your team reads. Free plan includes 8 built-ins; Pro adds
            custom templates with your own sections + prompt.
          </p>
        </div>
        <FauxButton>New custom template</FauxButton>
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">
          Your templates
        </h2>
        <div className="mt-3 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
          {own.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="mt-0.5 text-xs text-ink/60">{t.description}</div>
                <div className="mt-1 text-xs text-ink/50">
                  {t.sections.map((s) => s.label).join(" · ")}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <FauxButton variant="ghost" small>
                  Edit
                </FauxButton>
                <FauxButton variant="ghost" small>
                  Delete
                </FauxButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">Built-in</h2>
        <div className="mt-3 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
          {builtIn.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="mt-0.5 text-xs text-ink/60">{t.description}</div>
                <div className="mt-1 text-xs text-ink/50">
                  {t.sections.map((s) => s.label).join(" · ")}
                </div>
              </div>
              <FauxButton variant="ghost" small>
                Duplicate &amp; edit
              </FauxButton>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

function BillingScreen() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-ink/60">
        You&apos;re currently on the <strong>Free</strong> plan.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          subtitle="for casual use"
          highlight
          features={[
            "Unlimited uploads",
            "8 built-in summary templates",
            "Browser, desktop & mobile recorders",
            "Meeting bot for Zoom/Meet/Teams",
          ]}
        />
        <PlanCard
          name="Pro"
          price="$19"
          subtitle="/ month"
          features={[
            "Everything in Free",
            "Custom summary templates",
            "Priority support",
            "First access to upcoming features",
          ]}
          cta={<FauxButton>Upgrade to Pro</FauxButton>}
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
  cta?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-5 ${highlight ? "border-ink shadow-sm" : "border-ink/10"}`}
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

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function SettingsScreen() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-ink/60">
        Connect Slack and Notion so you can push a meeting summary out with one click.
      </p>
      <div className="mt-6 max-w-xl space-y-8">
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Profile</h2>
          <LabeledInput label="Display name" placeholder="Sam Rivera" />
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Slack</h2>
          <p className="text-xs text-ink/60">
            Paste an Incoming Webhook URL — &ldquo;Post to Slack&rdquo; then sends the summary to
            that channel.
          </p>
          <LabeledInput
            label=""
            placeholder="https://hooks.slack.com/services/T000/B000/xxxx"
          />
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Notion</h2>
          <p className="text-xs text-ink/60">
            Paste an internal-integration token + a parent page ID — &ldquo;Export to
            Notion&rdquo; creates a child page with the summary.
          </p>
          <LabeledInput label="" placeholder="secret_xxxxxxxx" />
          <LabeledInput label="" placeholder="Parent page ID" />
        </section>
        <FauxButton>Save settings</FauxButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public share page
// ---------------------------------------------------------------------------

function ShareScreen() {
  const meeting = DEMO_MEETING;
  const template = DEMO_TEMPLATES.find((t) => t.id === meeting.template_id)!;
  const speakerCount = new Set(DEMO_SEGMENTS.map((s) => s.speaker)).size;

  return (
    <div>
      <SectionHint>
        This is what someone sees when you send them a public share link — no account, no sign-in.
        Read-only.
      </SectionHint>
      <div className="mt-5 rounded-lg border border-ink/10 bg-white p-6">
        <div className="text-xs uppercase tracking-widest text-ink/50">Shared via Recap</div>
        <h1 className="mt-2 text-2xl font-semibold">{meeting.title}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {formatDate(meeting.created_at)} · {formatSeconds(meeting.duration_seconds)} ·{" "}
          {speakerCount} speakers
        </p>
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">
            {template.name} summary
          </h2>
          <div className="mt-2">
            <SummaryDisplay sections={template.sections} summary={meeting.summary!} />
          </div>
        </section>
        <section className="mt-8 border-t border-ink/10 pt-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">
            Transcript
          </h2>
          <div className="mt-3 space-y-3">
            {DEMO_SEGMENTS.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-start gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-xs text-ink/40">
                  {formatSeconds(s.start_seconds)}
                </span>
                <div className="flex-1">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${speakerColor(s.speaker)}`}
                  >
                    Speaker {s.speaker + 1}
                  </span>
                  <p className="mt-1 text-sm leading-relaxed">{s.text}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-ink/45">…transcript continues.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny faux UI primitives (non-functional — this is a static tour)
// ---------------------------------------------------------------------------

function FauxButton({
  children,
  variant = "primary",
  small,
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  small?: boolean;
}) {
  const base = small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm";
  const tone =
    variant === "ghost"
      ? "border border-ink/15 bg-white text-ink hover:bg-ink/5"
      : "bg-ink text-paper hover:opacity-90";
  return (
    <span
      title="Demo — not wired up in the preview"
      className={`inline-block cursor-default rounded-md font-medium ${base} ${tone}`}
    >
      {children}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm ${
        active ? "border-ink font-medium" : "border-transparent text-ink/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function LabeledInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      {label && <span className="text-sm font-medium">{label}</span>}
      <input
        readOnly
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

function LabeledSelect({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex items-center justify-between rounded-md border border-ink/15 bg-white px-3 py-2 text-sm">
        <span>{value}</span>
        <span className="text-ink/40">▾</span>
      </div>
    </label>
  );
}
