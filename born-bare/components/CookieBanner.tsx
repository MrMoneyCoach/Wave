"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "./Button";

const STORAGE_KEY = "bb_cookie_consent";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setShow(true);
    } catch {
      // no-op (private mode / storage disabled)
    }
  }, []);

  const dismiss = (value: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // no-op
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 sm:bottom-6 sm:inset-x-auto sm:right-6 sm:max-w-md z-[60] bg-earth text-bare shadow-xl"
    >
      <div className="p-6">
        <p className="text-caption text-bare/85 leading-relaxed">
          We use a small number of cookies to understand how the site is used.
          Read the{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-bare">
            privacy policy
          </Link>
          .
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="primary"
            className="bg-bare text-earth hover:bg-bare/90"
            onClick={() => dismiss("accepted")}
          >
            Accept
          </Button>
          <Button
            variant="ghost"
            className="text-bare/70 hover:text-bare"
            onClick={() => dismiss("declined")}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
