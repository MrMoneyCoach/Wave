"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "./Button";
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
};

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; email: string }
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
  consentLabel = "I'm happy to receive occasional emails from Born Bare. Unsubscribe anytime.",
}: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });

  const isDark = theme === "dark";

  async function onSubmit(e: React.FormEvent) {
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

    // Phase 3 will replace this with a real Supabase insert through a server action.
    await new Promise((res) => setTimeout(res, 600));

    setState({ status: "success", email: trimmed });
    setEmail("");
    setConsent(false);
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "text-balance text-body",
          isDark ? "text-bare/90" : "text-earth/85",
          className
        )}
      >
        <p className="font-serif italic text-[clamp(1.25rem,2vw,1.5rem)] leading-snug">
          {successLabel}
        </p>
        <p
          className={cn(
            "mt-3 text-caption",
            isDark ? "text-bare/55" : "text-stone"
          )}
        >
          We&rsquo;ll be in touch at {state.email}.
        </p>
      </div>
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
            isDark
              ? "border-bare/80 text-bare hover:bg-bare hover:text-earth"
              : ""
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
          className={cn(
            "mt-4 text-caption",
            isDark ? "text-bare" : "text-earth"
          )}
        >
          {state.message}
        </p>
      )}

      <input type="hidden" name="source" value={source} />
    </form>
  );
}
