import { useEffect, useRef, useState } from "react";
import type { ClaudeDiagnostic } from "../types";

type BannerMode = "install" | "signin";

export function ClaudeBanner({
  onRecheck,
  mode = "install",
  onDismiss,
}: {
  onRecheck: () => void;
  mode?: BannerMode;
  onDismiss?: () => void;
}) {
  const [diag, setDiag] = useState<ClaudeDiagnostic | null>(null);
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string>("");
  const [installPhase, setInstallPhase] = useState<string>("");
  const [installDone, setInstallDone] = useState<boolean>(false);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const offLog = window.alfred.onInstallerLog(({ phase, line }) => {
      setInstallPhase(phase);
      setInstallLog((prev) => prev + (line.endsWith("\n") || line === "" ? line : line + "\n"));
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      });
    });
    const offState = window.alfred.onInstallerState(({ phase, running, success }) => {
      setInstallPhase(phase);
      setInstalling(running);
      if (!running && success) {
        setInstallDone(true);
        onRecheck();
      }
    });
    const offUrl = window.alfred.onInstallerUrl(({ url }) => {
      setLoginUrl(url);
    });
    return () => {
      offLog();
      offState();
      offUrl();
    };
  }, [onRecheck]);

  const runDiagnose = async () => {
    setBusy(true);
    try {
      setDiag(await window.alfred.diagnoseClaude());
    } finally {
      setBusy(false);
    }
  };

  const pickBinary = async () => {
    setBusy(true);
    try {
      const r = await window.alfred.pickClaudeBinary();
      if (r?.installed) onRecheck();
      else if (r) setDiag(await window.alfred.diagnoseClaude());
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    setInstallLog("");
    setInstalling(true);
    setInstallDone(false);
    setLoginUrl(null);
    if (mode === "signin") {
      await window.alfred.signInToClaude();
    } else {
      await window.alfred.installClaude();
    }
  };

  const primaryLabel = mode === "signin" ? "Sign in to Claude" : "Install for me";
  const busyLabel = mode === "signin" ? `Signing in… (${installPhase})` : `Installing… (${installPhase})`;

  return (
    <div className="banner">
      <strong>
        {mode === "signin" ? "Sign in to Claude" : "Claude Code isn't installed yet."}
      </strong>
      <span>
        {mode === "signin" ? (
          <>Click <b>Sign in</b> below — a browser tab will open for the Claude Max login. When you
          finish signing in, this panel will close automatically.</>
        ) : (
          <>
            Alfred needs the <code>claude</code> command to work. Click <b>Install for me</b> below
            and Alfred will install it and sign you in — no Terminal. A browser tab will open for
            the Claude Max login once the install finishes.
          </>
        )}
      </span>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={install} disabled={busy || installing} style={{ fontWeight: 600 }}>
          {installing ? busyLabel : primaryLabel}
        </button>
        <button onClick={onRecheck} disabled={busy || installing}>
          Recheck
        </button>
        {mode === "install" && (
          <>
            <button onClick={runDiagnose} disabled={busy || installing}>
              Diagnose
            </button>
            <button onClick={pickBinary} disabled={busy || installing}>
              Locate manually…
            </button>
          </>
        )}
        {mode === "signin" && onDismiss && (
          <button onClick={onDismiss} disabled={installing}>
            Close
          </button>
        )}
      </div>
      {(installing || installLog) && (
        <div style={{ marginTop: 10 }}>
          {installPhase === "login" && loginUrl && !installDone && (
            <div
              style={{
                marginBottom: 10,
                padding: 10,
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.4)",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <div style={{ marginBottom: 6 }}>
                If a browser tab didn't open automatically, click this link:
              </div>
              <div style={{ wordBreak: "break-all" }}>
                <a
                  href={loginUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#60a5fa", textDecoration: "underline" }}
                >
                  {loginUrl}
                </a>
              </div>
            </div>
          )}
          <pre
            ref={logRef}
            style={{
              maxHeight: 200,
              overflow: "auto",
              background: "rgba(0,0,0,0.3)",
              padding: 10,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {installLog || "Starting…"}
          </pre>
          {installDone && (
            <div style={{ marginTop: 6, color: "#4ade80" }}>
              Installed. You can start chatting now.
            </div>
          )}
        </div>
      )}
      {diag && <DiagnosticPanel diag={diag} />}
    </div>
  );
}

function DiagnosticPanel({ diag }: { diag: ClaudeDiagnostic }) {
  return (
    <details open style={{ marginTop: 10, fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
      <summary style={{ cursor: "pointer", fontFamily: "inherit" }}>
        Diagnostic details {diag.resolvedBin ? "— found!" : "— no claude binary on any searched path"}
      </summary>
      <div style={{ marginTop: 8, lineHeight: 1.5 }}>
        <div>
          <b>Shell:</b> {diag.shell}
        </div>
        <div>
          <b>Home:</b> {diag.home}
        </div>
        <div>
          <b>Login-shell <code>command -v claude</code>:</b>{" "}
          {diag.shellWhich ?? <i>(nothing — shell can't find claude either)</i>}
        </div>
        <div>
          <b>Override:</b> {diag.override ?? <i>(none)</i>}
        </div>
        <div>
          <b>Resolved:</b> {diag.resolvedBin ?? <i>(none)</i>}
          {diag.version ? ` — version ${diag.version}` : ""}
        </div>
        <div style={{ marginTop: 8 }}>
          <b>Directories searched:</b>
          <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
            {diag.dirs.map((d) => (
              <li key={d.dir} style={{ color: d.hasClaude ? "#4ade80" : d.exists ? undefined : "#71717a" }}>
                {d.dir}
                {d.hasClaude ? "  ← claude here" : d.exists ? "" : "  (doesn't exist)"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
