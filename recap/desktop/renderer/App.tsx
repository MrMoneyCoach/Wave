import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { BUILD_DEFAULTS } from "./config";
import { makeSupabase, type RecapConfig, type Template } from "./supabase";
import { Recorder } from "./Recorder";

type Status = "loading" | "needs-config" | "signed-out" | "signed-in";

export function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [config, setConfig] = useState<RecapConfig | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await window.recap.readSettings();
      const cfg: RecapConfig = {
        webUrl: persisted.webUrl || BUILD_DEFAULTS.webUrl,
        supabaseUrl: persisted.supabaseUrl || BUILD_DEFAULTS.supabaseUrl,
        supabaseAnonKey: persisted.supabaseAnonKey || BUILD_DEFAULTS.supabaseAnonKey,
      };
      if (cancelled) return;

      if (!cfg.webUrl || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
        setConfig(cfg);
        setStatus("needs-config");
        return;
      }

      const client = makeSupabase(cfg, persisted.session ?? null);
      setSupabase(client);
      setConfig(cfg);
      const { data } = await client.auth.getSession();
      setSession(data.session ?? null);
      setStatus(data.session ? "signed-in" : "signed-out");

      const sub = client.auth.onAuthStateChange((_event, next) => {
        setSession(next ?? null);
        setStatus(next ? "signed-in" : "signed-out");
      });
      return () => sub.data.subscription.unsubscribe();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <div className="titlebar">Recap Recorder</div>

      <div className="content">
        {status === "loading" && <p>Loading…</p>}

        {status === "needs-config" && config && (
          <ConfigCard
            config={config}
            onSave={async (next) => {
              await window.recap.writeSettings(next);
              window.location.reload();
            }}
          />
        )}

        {status === "signed-out" && supabase && (
          <SignInCard supabase={supabase} />
        )}

        {status === "signed-in" && supabase && session && config && (
          <Recorder supabase={supabase} session={session} webUrl={config.webUrl} />
        )}
      </div>

      <div className="footer">
        <span>v0.1 · {session?.user.email ?? "not signed in"}</span>
        <span style={{ display: "flex", gap: 12 }}>
          {status === "signed-in" && (
            <a onClick={() => supabase?.auth.signOut()}>Sign out</a>
          )}
          <a onClick={() => setShowSettings((s) => !s)}>Settings</a>
        </span>
      </div>

      {showSettings && config && (
        <SettingsOverlay
          config={config}
          onClose={() => setShowSettings(false)}
          onSave={async (next) => {
            await window.recap.writeSettings(next);
            setShowSettings(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function ConfigCard({
  config,
  onSave,
}: {
  config: RecapConfig;
  onSave: (next: RecapConfig) => Promise<void>;
}) {
  return (
    <div className="card">
      <h1>Connect to your Recap server</h1>
      <p>
        Enter the URL of your deployed Recap web app and the Supabase project it uses. Ask
        whoever set it up if you don&apos;t know — these values are also in the README.
      </p>
      <ConfigForm initial={config} onSave={onSave} submitLabel="Connect" />
    </div>
  );
}

function SettingsOverlay({
  config,
  onClose,
  onSave,
}: {
  config: RecapConfig;
  onClose: () => void;
  onSave: (next: RecapConfig) => Promise<void>;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: "100%", maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <h1>Settings</h1>
        <p>Reconnect to a different Recap server.</p>
        <ConfigForm initial={config} onSave={onSave} submitLabel="Save & reload" />
        <div className="spacer" />
        <button className="secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function ConfigForm({
  initial,
  onSave,
  submitLabel,
}: {
  initial: RecapConfig;
  onSave: (next: RecapConfig) => Promise<void>;
  submitLabel: string;
}) {
  const [webUrl, setWebUrl] = useState(initial.webUrl);
  const [supabaseUrl, setSupabaseUrl] = useState(initial.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initial.supabaseAnonKey);

  return (
    <form
      className="col"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ webUrl: webUrl.trim(), supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: supabaseAnonKey.trim() });
      }}
    >
      <label className="label">Web URL
        <input type="text" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="https://recap.example.com" required />
      </label>
      <label className="label">Supabase URL
        <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxx.supabase.co" required />
      </label>
      <label className="label">Supabase anon key
        <input type="text" value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)} placeholder="eyJh…" required />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}

function SignInCard({ supabase }: { supabase: SupabaseClient }) {
  const [phase, setPhase] = useState<"email" | "code" | "sent">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.message);
    else setPhase("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="card col">
      <h1>Sign in</h1>
      {phase === "email" && (
        <form className="col" onSubmit={sendCode}>
          <p>We&apos;ll email you a 6-digit code.</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoFocus
          />
          <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
        </form>
      )}
      {phase === "code" && (
        <form className="col" onSubmit={verify}>
          <p>Check your inbox for <strong>{email}</strong> and paste the 6-digit code below.</p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            required
            autoFocus
          />
          <div className="row">
            <button type="submit" disabled={busy}>{busy ? "Verifying…" : "Sign in"}</button>
            <button type="button" className="secondary" onClick={() => setPhase("email")}>Use a different email</button>
          </div>
        </form>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export type { Template };
