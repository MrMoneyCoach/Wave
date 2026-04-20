import { useState } from "react";
import type { ClaudeDiagnostic } from "../types";

export function ClaudeBanner({ onRecheck }: { onRecheck: () => void }) {
  const [diag, setDiag] = useState<ClaudeDiagnostic | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="banner">
      <strong>Claude Code CLI not found.</strong>
      <span>
        Alfred can't find the <code>claude</code> command. If you haven't installed it yet,
        double-click <code>scripts/mac/install-claude-code.command</code> from the repo. If you
        already installed it, click <b>Diagnose</b> to see where Alfred looked, or <b>Locate
        manually</b> to point Alfred at the binary.
      </span>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button onClick={runDiagnose} disabled={busy}>
          Diagnose
        </button>
        <button onClick={pickBinary} disabled={busy}>
          Locate manually…
        </button>
        <button onClick={onRecheck} disabled={busy}>
          Recheck
        </button>
      </div>
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
        {!diag.resolvedBin && (
          <div style={{ marginTop: 10, color: "#fbbf24" }}>
            If <code>command -v claude</code> returned nothing above, claude-code isn't actually
            installed — double-click <code>install-claude-code.command</code> and watch for errors
            at the end of the Terminal window.
          </div>
        )}
      </div>
    </details>
  );
}
