import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only Supabase client using the service role key.
 *
 * Bypasses RLS — never import this from a client component, and never
 * expose the service role key to the browser.
 *
 * If the env vars aren't set (e.g. during a preview deploy before the
 * Vercel env vars are configured), every call will throw a clear error
 * instead of silently misbehaving.
 */
export function getAdminClient() {
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it under Vercel → Settings → Environment Variables."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
