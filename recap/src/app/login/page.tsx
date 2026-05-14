"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink">
        ← Recap
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-ink/60">
        We&apos;ll email you a magic link. No password to remember.
      </p>
      {children}
    </main>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const supabase = supabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/api/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <LoginShell>
      {status === "sent" ? (
        <div className="mt-8 rounded-md border border-ink/15 bg-white p-4 text-sm">
          Check <strong>{email}</strong> — we just sent a sign-in link. You can close this tab.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-md bg-ink py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Email me a magic link"}
          </button>
          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        </form>
      )}
    </LoginShell>
  );
}
