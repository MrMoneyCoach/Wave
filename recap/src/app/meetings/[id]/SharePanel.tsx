"use client";

import { useMemo, useState } from "react";
import type { MeetingShare } from "@/lib/types";

type ShareState = {
  public_share_token: string | null;
  shares: MeetingShare[];
};

type Props = {
  meetingId: string;
  initial: ShareState;
};

export default function SharePanel({ meetingId, initial }: Props) {
  const [state, setState] = useState<ShareState>(initial);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(
    () =>
      state.public_share_token
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${state.public_share_token}`
        : null,
    [state.public_share_token],
  );

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setState(json);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    const ok = await call({ action: "add_email", email: email.trim() });
    if (ok) setEmail("");
  }

  return (
    <section className="mt-10 border-t border-ink/10 pt-6">
      <h2 className="text-sm font-semibold">Share</h2>

      <div className="mt-3 rounded-md border border-ink/10 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Public link</div>
            <div className="text-xs text-ink/60">
              Anyone with the link can view the summary and transcript — no sign-in needed.
            </div>
          </div>
          <button
            onClick={() =>
              call({ action: state.public_share_token ? "disable_public" : "enable_public" })
            }
            disabled={busy}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
              state.public_share_token
                ? "border border-ink/15 bg-white hover:bg-ink/5"
                : "bg-ink text-paper hover:opacity-90"
            }`}
          >
            {state.public_share_token ? "Disable" : "Create link"}
          </button>
        </div>

        {shareUrl && (
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded border border-ink/15 bg-paper px-2 py-1 text-xs"
            />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded border border-ink/15 bg-white px-3 py-1 text-xs hover:bg-ink/5"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-md border border-ink/10 bg-white p-4">
        <div className="text-sm font-medium">Share with teammates</div>
        <div className="text-xs text-ink/60">
          They&apos;ll see this meeting in their own Recap dashboard when they sign in with that email.
        </div>
        <form onSubmit={addEmail} className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="min-w-0 flex-1 rounded border border-ink/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {state.shares.length > 0 && (
          <ul className="mt-3 space-y-1">
            {state.shares.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded bg-paper px-2 py-1 text-sm"
              >
                <span className="truncate">{s.shared_with_email}</span>
                <button
                  onClick={() => call({ action: "remove_email", share_id: s.id })}
                  disabled={busy}
                  className="shrink-0 text-xs text-red-700 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
