import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sessionStorageAdapter } from "./storage";
import type { RecapConfig } from "./types";

export function makeSupabase(cfg: RecapConfig): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      storage: sessionStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
