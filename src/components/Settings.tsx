import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  onThemeChange: (t: "dark" | "light") => void;
  voiceName: string | null;
  onVoiceChange: (name: string) => void;
  voiceError: string | null;
};

export function Settings({
  open,
  onClose,
  theme,
  onThemeChange,
  voiceName,
  onVoiceChange,
  voiceError,
}: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [memory, setMemory] = useState<string>("");
  const [savingMemory, setSavingMemory] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  // Load voices when modal opens. Chromium populates them async, so keep
  // listening for voiceschanged.
  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      const list = window.speechSynthesis?.getVoices() ?? [];
      setVoices(list.filter((v) => v.lang.startsWith("en")));
    };
    refresh();
    window.speechSynthesis?.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", refresh);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.alfred.readMemory().then(setMemory).catch(() => {});
  }, [open]);

  if (!open) return null;

  const testVoice = () => {
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance("Good day. I'm Alfred, at your service.");
    const v = voices.find((vv) => vv.name === voiceName);
    if (v) u.voice = v;
    window.speechSynthesis?.speak(u);
  };

  const saveMemory = async () => {
    setSavingMemory(true);
    try {
      await window.alfred.writeMemory(memory);
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1800);
    } finally {
      setSavingMemory(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <section className="setting-row">
          <label>Theme</label>
          <div className="seg">
            <button
              className={theme === "light" ? "active" : ""}
              onClick={() => onThemeChange("light")}
            >
              Light
            </button>
            <button
              className={theme === "dark" ? "active" : ""}
              onClick={() => onThemeChange("dark")}
            >
              Dark
            </button>
          </div>
        </section>

        <section className="setting-row">
          <label>Alfred's voice</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
            <select
              value={voiceName ?? ""}
              onChange={(e) => onVoiceChange(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">(system default)</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} — {v.lang}
                </option>
              ))}
            </select>
            <button onClick={testVoice} disabled={voices.length === 0}>
              Test
            </button>
          </div>
        </section>

        {voiceError && (
          <section className="setting-row" style={{ alignItems: "flex-start" }}>
            <label>Voice status</label>
            <div style={{ color: "#f87171", fontSize: 12, lineHeight: 1.5, flex: 1 }}>
              {voiceError}
              <div style={{ color: "var(--fg-dim)", marginTop: 6 }}>
                Tip: macOS → System Settings → Privacy & Security → Microphone → enable Alfred. Then
                quit and reopen the app.
              </div>
            </div>
          </section>
        )}

        <section className="setting-row" style={{ alignItems: "flex-start" }}>
          <label style={{ marginTop: 4 }}>Memory</label>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--fg-dim)", marginBottom: 6 }}>
              Shared across every project — Claude Code auto-reads this as user-level memory from
              <code style={{ marginLeft: 4 }}>~/.claude/CLAUDE.md</code>.
            </div>
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              rows={12}
              style={{
                width: "100%",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                background: "var(--bg-2)",
                color: "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: 8,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <button onClick={saveMemory} disabled={savingMemory}>
                {savingMemory ? "Saving…" : "Save memory"}
              </button>
              {savedHint && <span style={{ fontSize: 12, color: "#4ade80" }}>Saved.</span>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
