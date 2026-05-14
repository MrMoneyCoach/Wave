// Build-time defaults from Vite env. Users running from source can override
// these at runtime via the Settings dialog (persisted in app data).

export const BUILD_DEFAULTS = {
  webUrl: import.meta.env.VITE_RECAP_WEB_URL ?? "",
  supabaseUrl: import.meta.env.VITE_RECAP_SUPABASE_URL ?? "",
  supabaseAnonKey: import.meta.env.VITE_RECAP_SUPABASE_ANON_KEY ?? "",
};
