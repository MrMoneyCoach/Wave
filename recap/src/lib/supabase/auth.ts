import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { supabaseServer } from "./server";

/**
 * Returns a Supabase client authed as the requesting user, plus the user.
 * Accepts either:
 *   - cookie session (browser → API)
 *   - `Authorization: Bearer <access_token>` (desktop / mobile → API)
 *
 * Returns `user: null` if unauthenticated; callers should respond 401.
 */
export async function supabaseFromRequest(request: NextRequest): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearer) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await client.auth.getUser(bearer);
    if (error || !data.user) return { supabase: client, user: null };
    return { supabase: client, user: data.user };
  }

  const cookieClient = supabaseServer();
  const { data } = await cookieClient.auth.getUser();
  return { supabase: cookieClient, user: data.user ?? null };
}

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-client-info, apikey",
  "access-control-max-age": "86400",
};

export function corsHeaders() {
  return CORS_HEADERS;
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
