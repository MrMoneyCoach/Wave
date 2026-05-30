import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Public Supabase client using the anon key.
 *
 * Safe to call from the browser. Only used for the SECURITY DEFINER RPC
 * `get_referral_status` — it can't read the waitlist table directly.
 */
export function getAnonClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars are not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
