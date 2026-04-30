"use client";

import Link from "next/link";

export type Rail = "sections" | "theme" | "settings";

export type EditorChromeProps = {
  // Top bar
  backHref: string;
  breadcrumb: { label: string; href?: string }[];
  /** Optional dropdown of pages within this scope, e.g. "Landing Page ▾" */
  pageSelector?: React.ReactNode;
  /** Optional preview link for the live page */
  previewHref?: string;
  /** Save handler. Button hidden when undefined. */
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  /** Extra buttons next to Save */
  rightActions?: React.ReactNode;

  // Device toggle
  device: "desktop" | "mobile";
  onDeviceChange: (d: "desktop" | "mobile") => void;

  // Left mini-rail
  rail: Rail;
  onRailChange: (r: Rail) => void;

  // Slots
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  /** Canvas content. If `device === "mobile"`, it's constrained to phone width. */
  children: React.ReactNode;
};

const RAILS: { key: Rail; icon: string; label: string }[] = [
  { key: "sections", icon: "▤", label: "Sections" },
  { key: "theme", icon: "🎨", label: "Theme" },
  { key: "settings", icon: "⚙", label: "Settings" },
];

export default function EditorChrome({
  backHref,
  breadcrumb,
  pageSelector,
  previewHref,
  onSave,
  saving,
  saved,
  rightActions,
  device,
  onDeviceChange,
  rail,
  onRailChange,
  leftPanel,
  rightPanel,
  children,
}: EditorChromeProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-3">
        <Link
          href={backHref}
          className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Back"
        >
          ←
        </Link>
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {b.href ? (
                <Link
                  href={b.href}
                  className="line-clamp-1 max-w-[200px] text-slate-600 hover:text-slate-900"
                >
                  {b.label}
                </Link>
              ) : (
                <span className="line-clamp-1 max-w-[260px] font-semibold text-slate-900">
                  {b.label}
                </span>
              )}
              {i < breadcrumb.length - 1 && (
                <span className="text-slate-400">›</span>
              )}
            </span>
          ))}
        </div>

        {pageSelector && (
          <div className="ml-2 hidden md:block">{pageSelector}</div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <DeviceToggle value={device} onChange={onDeviceChange} />
          {previewHref && (
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 md:inline-flex"
            >
              Preview <span aria-hidden>↗</span>
            </a>
          )}
          {rightActions}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={!!saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Mini-rail */}
        <nav
          className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-3"
          aria-label="Editor sections"
        >
          {RAILS.map((r) => {
            const active = rail === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => onRailChange(r.key)}
                title={r.label}
                aria-label={r.label}
                aria-pressed={active}
                className={`grid h-9 w-9 place-items-center rounded-md text-base transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <span aria-hidden>{r.icon}</span>
              </button>
            );
          })}
        </nav>

        {/* Left panel */}
        <aside className="hidden w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white md:flex">
          <div className="min-h-0 flex-1 overflow-auto">{leftPanel}</div>
        </aside>

        {/* Canvas */}
        <main className="min-w-0 flex-1 overflow-auto bg-slate-100">
          <div
            className={
              device === "mobile"
                ? "mx-auto my-6 w-[390px] max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                : "mx-auto my-6 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            }
          >
            {children}
          </div>
        </main>

        {/* Right panel (optional) */}
        {rightPanel && (
          <aside className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white lg:flex">
            <div className="min-h-0 flex-1 overflow-auto p-4">{rightPanel}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

function DeviceToggle({
  value,
  onChange,
}: {
  value: "desktop" | "mobile";
  onChange: (d: "desktop" | "mobile") => void;
}) {
  return (
    <div className="hidden items-center rounded-md border border-slate-200 bg-white p-0.5 md:inline-flex">
      <button
        type="button"
        onClick={() => onChange("desktop")}
        aria-pressed={value === "desktop"}
        title="Desktop preview"
        className={`grid h-7 w-7 place-items-center rounded transition ${
          value === "desktop"
            ? "bg-brand-50 text-brand-700"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <span aria-hidden>🖥</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        aria-pressed={value === "mobile"}
        title="Mobile preview"
        className={`grid h-7 w-7 place-items-center rounded transition ${
          value === "mobile"
            ? "bg-brand-50 text-brand-700"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <span aria-hidden>📱</span>
      </button>
    </div>
  );
}

/** Convenience wrapper for left-panel section headings. */
export function EditorPanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}
