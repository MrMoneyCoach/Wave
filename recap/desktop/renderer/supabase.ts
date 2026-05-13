import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RecapConfig = {
  webUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

/**
 * Creates a Supabase client wired to persist the session through the Electron
 * preload bridge (so it survives app restarts without touching localStorage,
 * which is per-window-not-app on Electron).
 */
export function makeSupabase(cfg: RecapConfig, initialSession: unknown): SupabaseClient {
  const storage = {
    getItem: (_key: string) => {
      try {
        return initialSession ? JSON.stringify(initialSession) : null;
      } catch {
        return null;
      }
    },
    setItem: async (_key: string, value: string) => {
      try {
        const parsed = JSON.parse(value);
        await window.recap.writeSettings({ session: parsed });
      } catch {
        // ignore
      }
    },
    removeItem: async (_key: string) => {
      await window.recap.clearSession();
    },
  };

  return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: storage as unknown as Storage,
      storageKey: "recap-desktop-session",
    },
  });
}

export type Template = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_premium: boolean;
};
