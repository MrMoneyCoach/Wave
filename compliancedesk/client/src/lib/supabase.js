import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced in console during dev — keeps the UI shell rendering even before env vars are wired up.
  // eslint-disable-next-line no-console
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing');
}

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'public-anon-key');
