/**
 * Persistence helpers for the inbound ?ref=ABC123 code.
 *
 * The code lives in localStorage so it survives navigation between pages,
 * and is sent up with the next waitlist signup. We don't use cookies here
 * because the only thing reading the code is client-side JS.
 */

const STORAGE_KEY = "bb_ref";

export function readStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // no-op
  }
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
