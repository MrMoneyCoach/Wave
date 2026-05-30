"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

const joinSchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(80).optional(),
  gdprConsent: z.boolean(),
  referredByCode: z
    .string()
    .regex(/^[A-Z0-9]{6}$/)
    .optional(),
});

export type JoinResult =
  | { ok: true; referralCode: string; alreadyJoined: boolean }
  | { ok: false; error: string };

export async function joinWaitlist(input: unknown): Promise<JoinResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }

  const { email, source, gdprConsent, referredByCode } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err) {
    console.error("Supabase admin client unavailable", err);
    return {
      ok: false,
      error:
        "We can't save your email right now. We're already working on it — please try again shortly.",
    };
  }

  // Check if this email has already joined
  const { data: existing } = await supabase
    .from("waitlist")
    .select("referral_code, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return { ok: true, referralCode: existing.referral_code, alreadyJoined: true };
  }

  // Validate referral code if provided — and reject self-referrals
  let validatedReferralCode: string | null = null;
  if (referredByCode) {
    const { data: referrer } = await supabase
      .from("waitlist")
      .select("email, referral_code")
      .eq("referral_code", referredByCode)
      .maybeSingle();

    if (referrer && referrer.email !== normalizedEmail) {
      validatedReferralCode = referrer.referral_code;
    }
  }

  // Generate a fresh referral code for this new signup
  const { data: codeRow, error: codeErr } = await supabase.rpc(
    "generate_referral_code"
  );
  if (codeErr || !codeRow) {
    console.error("Failed to generate referral code", codeErr);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  const newReferralCode = codeRow as unknown as string;

  // Capture the user-agent for basic analytics
  const userAgent = (await headers()).get("user-agent") ?? null;

  const { error: insertErr } = await supabase.from("waitlist").insert({
    email: normalizedEmail,
    referral_code: newReferralCode,
    referred_by_code: validatedReferralCode,
    source: source ?? null,
    gdpr_consent: gdprConsent,
    user_agent: userAgent,
  });

  if (insertErr) {
    // Unique-violation race condition: someone signed up the same email
    // between our existence check and the insert. Treat as already joined.
    if (insertErr.code === "23505") {
      const { data: retry } = await supabase
        .from("waitlist")
        .select("referral_code")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (retry) {
        return { ok: true, referralCode: retry.referral_code, alreadyJoined: true };
      }
    }
    console.error("Waitlist insert failed", insertErr);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // Increment the referrer's count atomically via the SECURITY DEFINER RPC
  if (validatedReferralCode) {
    const { error: incErr } = await supabase.rpc("increment_referral_count", {
      p_code: validatedReferralCode,
    });
    if (incErr) {
      console.error("Failed to increment referral count", incErr);
      // Non-fatal — the signup still succeeded.
    }
  }

  return { ok: true, referralCode: newReferralCode, alreadyJoined: false };
}

const statusSchema = z.object({ email: z.string().email().max(254) });

export type StatusResult =
  | { ok: true; referralCode: string; referralCount: number }
  | { ok: false; error: string };

export async function getReferralStatus(input: unknown): Promise<StatusResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err) {
    console.error("Supabase admin client unavailable", err);
    return { ok: false, error: "We can't check that right now. Please try again shortly." };
  }

  const { data, error } = await supabase.rpc("get_referral_status", {
    p_email: parsed.data.email.trim().toLowerCase(),
  });

  if (error) {
    console.error("get_referral_status RPC failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return {
      ok: false,
      error: "We don't have that email on the waitlist yet — sign up to start.",
    };
  }

  return {
    ok: true,
    referralCode: row.referral_code,
    referralCount: row.referral_count ?? 0,
  };
}
