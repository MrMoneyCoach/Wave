import { useEffect, useState } from "react";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking" | "heard";

type Props = {
  state: AvatarState;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  interim?: string;
};

export function Avatar({ state, voiceEnabled, onToggleVoice, interim }: Props) {
  const [bars, setBars] = useState<number[]>([0.4, 0.6, 0.3, 0.8, 0.5]);

  // Animate speaking bars.
  useEffect(() => {
    if (state !== "speaking") return;
    const id = setInterval(() => {
      setBars(Array.from({ length: 5 }, () => 0.3 + Math.random() * 0.7));
    }, 120);
    return () => clearInterval(id);
  }, [state]);

  const label = voiceEnabled
    ? state === "heard"
      ? "Heard you…"
      : state === "thinking"
      ? "Working…"
      : state === "speaking"
      ? "Speaking"
      : "Say \"Alfred…\""
    : "Voice off";

  return (
    <div className={`avatar avatar-${state} ${voiceEnabled ? "on" : "off"}`}>
      {interim && voiceEnabled && (state === "listening" || state === "heard") && (
        <div className="avatar-interim">{interim}</div>
      )}
      <button
        className="avatar-btn"
        onClick={onToggleVoice}
        title={voiceEnabled ? "Turn voice off" : "Turn voice on"}
      >
        <svg viewBox="0 0 100 100" width="72" height="72" aria-hidden="true">
          <defs>
            <radialGradient id="orb-core" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#f4d58d" />
              <stop offset="55%" stopColor="#d4a657" />
              <stop offset="100%" stopColor="#6a4f23" />
            </radialGradient>
            <radialGradient id="orb-core-off" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#555" />
              <stop offset="100%" stopColor="#222" />
            </radialGradient>
          </defs>

          {/* outer pulse ring (listening / heard) */}
          <circle className="ring" cx="50" cy="50" r="42" fill="none" strokeWidth="1.5" />
          <circle className="ring ring-2" cx="50" cy="50" r="42" fill="none" strokeWidth="1.2" />

          {/* core */}
          <circle
            className="core"
            cx="50"
            cy="50"
            r="26"
            fill={voiceEnabled ? "url(#orb-core)" : "url(#orb-core-off)"}
          />

          {/* monogram / equalizer */}
          {state === "speaking" ? (
            <g className="eq">
              {bars.map((h, i) => {
                const barH = 14 * h;
                return (
                  <rect
                    key={i}
                    x={38 + i * 5}
                    y={50 - barH / 2}
                    width={3}
                    height={barH}
                    rx={1.5}
                    fill="#1a1a1a"
                  />
                );
              })}
            </g>
          ) : state === "thinking" ? (
            <g className="spin">
              <circle cx="50" cy="26" r="3" fill="#1a1a1a" />
            </g>
          ) : (
            <text
              x="50"
              y="57"
              textAnchor="middle"
              fontFamily="SF Pro Display, -apple-system, sans-serif"
              fontSize="22"
              fontWeight="700"
              fill="#1a1a1a"
            >
              A
            </text>
          )}
        </svg>
      </button>
      <div className="avatar-label">{label}</div>
    </div>
  );
}
