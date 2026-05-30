"use client";

import { useEffect } from "react";
import { writeStoredReferralCode } from "@/lib/referralStorage";

/**
 * Mounted in the root layout. On first load it inspects the URL for a
 * ?ref=ABC123 code and pins it to localStorage so any subsequent waitlist
 * signup credits the referrer — even if the visitor navigates around
 * before signing up.
 */
export default function RefCodeCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("ref");
      if (!raw) return;
      const code = raw.toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) return;
      writeStoredReferralCode(code);
    } catch {
      // no-op
    }
  }, []);

  return null;
}
