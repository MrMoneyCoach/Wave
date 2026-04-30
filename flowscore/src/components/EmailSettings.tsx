"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Form = {
  adminNotifyEmail: string;
  adminNotifyEnabled: boolean;
  emailSubject: string;
  emailGreeting: string;
  emailIntro: string;
  emailBullets: string;
  emailBookingLine: string;
  emailSignoff: string;
};

const TOKENS: { token: string; label: string }[] = [
  { token: "{{firstName}}", label: "First name" },
  { token: "{{lastName}}", label: "Last name" },
  { token: "{{quizTitle}}", label: "Quiz title" },
  { token: "{{percent}}", label: "Percent score" },
  { token: "{{outcomeTitle}}", label: "Outcome title" },
  { token: "{{outcomeDescription}}", label: "Outcome description" },
  { token: "{{ownerName}}", label: "Your name" },
];

const DEFAULTS = {
  emailSubject: "Your {{quizTitle}} results",
  emailGreeting: "Hi {{firstName}},",
  emailIntro:
    "Thank you for completing the {{quizTitle}}. Your personalised report is attached as a PDF.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
  emailBullets: "",
  emailBookingLine: "Want to talk through your results? Book a no-obligation call.",
  emailSignoff: "Thanks,\n— {{ownerName}}",
};

export default function EmailSettings({
  quizId,
  quizTitle,
  ownerEmail,
  initial,
}: {
  quizId: string;
  quizTitle: string;
  ownerEmail: string;
  initial: Form;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function patch(next: Partial<Form>) {
    setForm((f) => ({ ...f, ...next }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/emails`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <Link
        href={`/dashboard/quizzes/${quizId}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Scorecard home
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Build
          </p>
          <h1 className="mt-1 text-2xl font-bold">Emails</h1>
          <p className="mt-1 text-sm text-slate-500">
            Two emails go out when a respondent finishes the quiz: a notification
            to you, and a personalised report email to them. Both are editable.
          </p>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Admin notify */}
      <section className="card mt-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Admin notification</h2>
            <p className="mt-1 text-sm text-slate-500">
              You'll get a short summary email every time a respondent completes
              the quiz, with a link straight to the lead in the dashboard.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={form.adminNotifyEnabled}
              onChange={(e) => patch({ adminNotifyEnabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>
        <div>
          <label className="label">Send notifications to</label>
          <input
            type="email"
            className="input"
            value={form.adminNotifyEmail}
            onChange={(e) => patch({ adminNotifyEmail: e.target.value })}
            placeholder={ownerEmail}
            disabled={!form.adminNotifyEnabled}
          />
          <p className="mt-1 text-xs text-slate-500">
            Defaults to your account email ({ownerEmail}). Can be a shared inbox.
          </p>
        </div>
      </section>

      {/* Customer email */}
      <section className="card mt-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Customer report email</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sent to the respondent after they finish the quiz, with the PDF
            attached. Leave any field blank to use the sensible default — the
            placeholder text shows you what that default is. Tokens like{" "}
            <code>{`{{firstName}}`}</code> are replaced when the email is sent.
          </p>
        </div>

        <Field
          label="Subject"
          value={form.emailSubject}
          onChange={(v) => patch({ emailSubject: v })}
          placeholder={DEFAULTS.emailSubject}
        />
        <Field
          label="Greeting"
          value={form.emailGreeting}
          onChange={(v) => patch({ emailGreeting: v })}
          placeholder={DEFAULTS.emailGreeting}
        />
        <FieldArea
          label="Intro"
          value={form.emailIntro}
          onChange={(v) => patch({ emailIntro: v })}
          placeholder={DEFAULTS.emailIntro}
          rows={5}
        />
        <FieldArea
          label="Bullet list (one per line, optional)"
          value={form.emailBullets}
          onChange={(v) => patch({ emailBullets: v })}
          placeholder={"Financial planning\nInvestment planning\nTax planning"}
          rows={4}
        />
        <FieldArea
          label="Line above the booking button (optional)"
          value={form.emailBookingLine}
          onChange={(v) => patch({ emailBookingLine: v })}
          placeholder={DEFAULTS.emailBookingLine}
          rows={2}
        />
        <FieldArea
          label="Sign-off"
          value={form.emailSignoff}
          onChange={(v) => patch({ emailSignoff: v })}
          placeholder={DEFAULTS.emailSignoff}
          rows={2}
        />
      </section>

      {/* Tokens */}
      <section className="card mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Tokens
        </h2>
        <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
          {TOKENS.map((t) => (
            <li key={t.token} className="flex justify-between gap-3 font-mono">
              <code>{t.token}</code>
              <span className="text-slate-400">{t.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex justify-end">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 3}
      />
    </div>
  );
}
