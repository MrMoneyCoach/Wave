import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { makeSupabase } from "./supabase";
import { clearConfig, loadConfig, saveConfig } from "./storage";
import type { RecapConfig } from "./types";

type AuthCtx = {
  ready: boolean;
  config: RecapConfig | null;
  supabase: SupabaseClient | null;
  session: Session | null;
  setConfig: (cfg: RecapConfig) => Promise<void>;
  resetConfig: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfigState] = useState<RecapConfig | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await loadConfig();
      if (cancelled) return;
      if (!cfg) {
        setReady(true);
        return;
      }
      const client = makeSupabase(cfg);
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      setConfigState(cfg);
      setSupabase(client);
      setSession(data.session ?? null);
      setReady(true);
      const sub = client.auth.onAuthStateChange((_e, next) => setSession(next ?? null));
      return () => sub.data.subscription.unsubscribe();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthCtx = {
    ready,
    config,
    supabase,
    session,
    async setConfig(next) {
      await saveConfig(next);
      setConfigState(next);
      const client = makeSupabase(next);
      setSupabase(client);
      const { data } = await client.auth.getSession();
      setSession(data.session ?? null);
    },
    async resetConfig() {
      await supabase?.auth.signOut();
      await clearConfig();
      setSession(null);
      setSupabase(null);
      setConfigState(null);
    },
    async signOut() {
      await supabase?.auth.signOut();
      setSession(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
