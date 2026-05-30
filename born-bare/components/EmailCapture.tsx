"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Button from "./Button";
import WaitlistSuccess from "./WaitlistSuccess";
import { joinWaitlist } from "@/app/actions/waitlist";
import { readStoredReferralCode, clearStoredReferralCode } from "@/lib/referralStorage";
import { cn } from "@/lib/utils";

type Variant = "stacked" | "inline";

type Props = {
  source: string;
  variant?: Variant;
  consentLabel?: string;
  className?: string;
  ctaLabel?: string;
  successLabel?: string;
  placeholder?: string;
  showConsent?: boolean;
  theme?: "light" | "dark";
  /** When true, the post-signup state is the compact one (used inside perk cards). */
  compactSuccess?: boolean;
};

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; email: string; referralCode: string; alreadyJoined: boolean }
  | { status: "error"; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailCapture({
  source,
  variant = "inline",
  className,
  ctaLabel = "Join the waitlist",
  successLabel = "On the list. Welcome.",
  placeholder = "Your email",
  showConsent = true,
  theme = "light",
  compactSuccess = false,
  consentLabel = "I'm happy to receive occasional emails from Born Bare. Unsubscribe anytime.",
}: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const [, startTransition] = useTransition();

  const isDark = theme === "dark";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();

    if (!emailPattern.test(trimmed)) {
      setState({ status: "error", message: "Please enter a valid email address." });
      return;
    }
    if (showConsent && !consent) {
      setState({ status: "error", message: "Please tick the consent box to continue." });
      return;
    }

    setState({ status: "submitting" });
    const referredByCode = readStoredReferralCode() ?? undefined;

    startTransition(async () => {
      const result = await joinWaitlist({
        email: trimmed,
        source,
        gdprConsent: consent || !showConsent,
        referredByCode,
      });

      if (!result.ok) {
        setState({ status: "error", message: result.error });
        return;
      }

      if (referredByCode && !result.alreadyJoined) {
        clearStoredReferralCode();
      }

      setState({
        status: "success",
        email: trimmed,
        referralCode: result.referralCode,
        alreadyJoined: result.alreadyJoined,
      });
      setEmail("");
      setConsent(false);
    });
  }

  if (state.status === "success") {
    if (compactSuccess) {
      return (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "text-balance",
            isDark ? "text-bare/90" : "text-earth/85",
            className
          )}
        >
          <p className="font-serif italic text-[clamp(1.1rem,1.6vw,1.3rem)] leading-snug">
            {state.alreadyJoined ? "Already on the list." : successLabel}
          </p>
          <p className={cn("mt-2 text-caption", isDark ? "text-bare/55" : "text-stone")}>
            Your link: <span className="font-sans tracking-[0.1em]">{state.referralCode}</span>
          </p>
        </div>
      );
    }

    return (
      <WaitlistSuccess
        email={state.email}
        referralCode={state.referralCode}
        alreadyJoined={state.alreadyJoined}
        theme={theme}
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "w-full",
        variant === "stacked" ? "max-w-md mx-auto" : "max-w-xl",
        className
      )}
      noValidate
    >
      <div
        className={cn(
          "flex items-stretch border-b transition-colors",
          isDark
            ? "border-bare/40 focus-within:border-bare"
            : "border-earth/40 focus-within:border-earth",
          variant === "stacked" && "flex-col gap-3 border-b-0"
        )}
      >
        <label htmlFor={`email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`email-${source}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          placeholder={placeholder}
          aria-invalid={state.status === "error"}
          className={cn(
            "flex-1 bg-transparent py-4 text-body placeholder:text-stone focus:outline-none",
            isDark ? "text-bare placeholder:text-bare/45" : "text-earth",
            variant === "stacked" &&
              "border-b border-current/30 focus-within:border-current"
          )}
        />
        <Button
          type="submit"
          variant={isDark ? "secondary" : "primary"}
          className={cn(
            "shrink-0",
            isDark ? "border-bare/80 text-bare hover:bg-bare hover:text-earth" : ""
          )}
          disabled={state.status === "submitting"}
        >
          {state.status === "submitting" ? "Joining…" : ctaLabel}
        </Button>
      </div>

      {showConsent && (
        <label
          htmlFor={`consent-${source}`}
          className={cn(
            "mt-5 flex gap-3 items-start text-caption cursor-pointer select-none",
            isDark ? "text-bare/70" : "text-stone"
          )}
        >
          <input
            id={`consent-${source}`}
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (state.status === "error") setState({ status: "idle" });
            }}
            className="mt-[3px] accent-earth"
          />
          <span>
            {consentLabel}{" "}
            <Link
              href="/privacy"
              className={cn(
                "underline underline-offset-4",
                isDark ? "text-bare/85" : "text-earth/75"
              )}
            >
              Privacy policy
            </Link>
            .
          </span>
        </label>
      )}

      {state.status === "error" && (
        <p
          role="alert"
          className={cn("mt-4 text-caption", isDark ? "text-bare" : "text-earth")}
        >
          {state.message}
        </p>
      )}

      <input type="hidden" name="source" value={source} />
    </form>
  );
}
