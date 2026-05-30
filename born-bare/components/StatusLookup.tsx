"use client";

import { useState, useTransition } from "react";
import Button from "./Button";
import ShareButtons from "./ShareButtons";
import ReferralProgress from "./ReferralProgress";
import { getReferralStatus } from "@/app/actions/waitlist";

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "found"; email: string; referralCode: string; count: number }
  | { status: "error"; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StatusLookup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!emailPattern.test(trimmed)) {
      setState({ status: "error", message: "Please enter a valid email." });
      return;
    }
    setState({ status: "submitting" });

    startTransition(async () => {
      const result = await getReferralStatus({ email: trimmed });
      if (!result.ok) {
        setState({ status: "error", message: result.error });
        return;
      }
      setState({
        status: "found",
        email: trimmed,
        referralCode: result.referralCode,
        count: result.referralCount,
      });
    });
  }

  if (state.status === "found") {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${origin}/?ref=${state.referralCode}`;

    return (
      <div>
        <p className="font-sans text-caption uppercase tracking-[0.28em] text-stone mb-4">
          Found you
        </p>
        <p className="font-serif italic text-[clamp(1.4rem,2vw,1.8rem)] text-earth leading-snug">
          Welcome back, {state.email}.
        </p>

        <div className="mt-10">
          <ShareButtons url={url} />
        </div>

        <div className="mt-12 pt-10 border-t border-earth/10">
          <ReferralProgress count={state.count} />
        </div>

        <button
          type="button"
          onClick={() => {
            setEmail("");
            setState({ status: "idle" });
          }}
          className="mt-10 text-caption uppercase tracking-[0.22em] text-stone hover:text-earth transition-colors duration-300"
        >
          Look up a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex items-stretch border-b border-earth/40 focus-within:border-earth transition-colors">
        <label htmlFor="status-email" className="sr-only">
          Email address
        </label>
        <input
          id="status-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          placeholder="The email you signed up with"
          aria-invalid={state.status === "error"}
          className="flex-1 bg-transparent py-4 text-body placeholder:text-stone text-earth focus:outline-none"
        />
        <Button type="submit" disabled={state.status === "submitting"} className="shrink-0">
          {state.status === "submitting" ? "Looking…" : "Look up"}
        </Button>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-4 text-caption text-earth">
          {state.message}
        </p>
      )}
    </form>
  );
}
