"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EditorChrome, {
  EditorPanelHeading,
  type Rail,
} from "@/components/EditorChrome";

export type Block =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "list"; items: string[]; checkmark: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "divider" };

const BLOCK_LIBRARY: { type: Block["type"]; label: string; icon: string }[] = [
  { type: "heading", label: "Heading", icon: "T" },
  { type: "paragraph", label: "Paragraph", icon: "¶" },
  { type: "image", label: "Image", icon: "🖼" },
  { type: "list", label: "List", icon: "•" },
  { type: "button", label: "Button", icon: "▢" },
  { type: "divider", label: "Divider", icon: "—" },
];

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaultBlock(type: Block["type"]): Block {
  switch (type) {
    case "heading":
      return { id: newId(), type, text: "Headline", level: 2 };
    case "paragraph":
      return { id: newId(), type, text: "" };
    case "image":
      return { id: newId(), type, url: "", alt: "" };
    case "list":
      return { id: newId(), type, items: [""], checkmark: true };
    case "button":
      return { id: newId(), type, label: "Click me", url: "", style: "primary" };
    case "divider":
      return { id: newId(), type };
  }
}

export type ThemeState = {
  brandColor: string;
  secondaryColor: string;
  logoUrl: string;
  secondaryLogoUrl: string;
  squareIconUrl: string;
  fontFamily: "" | "sans" | "serif" | "mono";
};

export type SettingsState = {
  metaTitle: string;
  metaDescription: string;
  customCss: string;
};

export default function LandingDesigner({
  quizId,
  quizTitle,
  quizSlug,
  published,
  initialBlocks,
  initialTheme,
  initialSettings,
}: {
  quizId: string;
  quizTitle: string;
  quizSlug: string;
  published: boolean;
  initialBlocks: Block[];
  initialTheme: ThemeState;
  initialSettings: SettingsState;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [theme, setTheme] = useState<ThemeState>(initialTheme);
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBlocks[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rail, setRail] = useState<Rail>("sections");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const brandColor = theme.brandColor || "#345ff2";
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function patchBlock(id: string, patch: Partial<Block>) {
    setBlocks((b) =>
      b.map((bl) => (bl.id === id ? ({ ...bl, ...patch } as Block) : bl)),
    );
  }
  function removeBlock(id: string) {
    setBlocks((b) => b.filter((bl) => bl.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  function addBlock(type: Block["type"]) {
    const block = defaultBlock(type);
    setBlocks((b) => [...b, block]);
    setSelectedId(block.id);
    setShowPalette(false);
  }
  function moveTo(fromId: string, toId: string) {
    if (fromId === toId) return;
    setBlocks((b) => {
      const from = b.findIndex((x) => x.id === fromId);
      const to = b.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0) return b;
      const copy = [...b];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/design`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks, theme, settings }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(`Could not save: ${j.error ?? res.statusText}`);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <EditorChrome
      backHref={`/dashboard/quizzes/${quizId}/landing-pages`}
      breadcrumb={[
        {
          label: quizTitle || "Untitled",
          href: `/dashboard/quizzes/${quizId}`,
        },
        { label: "Landing Page" },
      ]}
      previewHref={published ? `/q/${quizSlug}` : undefined}
      onSave={save}
      saving={busy}
      saved={saved}
      device={device}
      onDeviceChange={setDevice}
      rail={rail}
      onRailChange={setRail}
      leftPanel={
        rail === "sections" ? (
          <SectionsPanel
            blocks={blocks}
            selectedId={selectedId}
            dragId={dragId}
            dragOverId={dragOverId}
            showPalette={showPalette}
            onSelect={setSelectedId}
            onDragStart={setDragId}
            onDragOver={setDragOverId}
            onDrop={moveTo}
            onDragEnd={() => {
              setDragId(null);
              setDragOverId(null);
            }}
            onAdd={addBlock}
            onShowPalette={setShowPalette}
          />
        ) : rail === "theme" ? (
          <ThemePanel theme={theme} onChange={setTheme} />
        ) : (
          <SettingsPanel
            quizSlug={quizSlug}
            settings={settings}
            onChange={setSettings}
          />
        )
      }
      rightPanel={
        selected ? (
          <BlockSettings
            block={selected}
            brandColor={brandColor}
            onChange={(patch) => patchBlock(selected.id, patch)}
            onRemove={() => removeBlock(selected.id)}
          />
        ) : (
          <div className="text-sm text-slate-500">
            Select a block on the left to edit it.
          </div>
        )
      }
    >
      {/* Canvas */}
      <div className="px-6 py-8 md:px-10 md:py-12">
        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {blocks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-16 text-center text-sm text-slate-500">
            Empty landing page. Add a block from the left to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {blocks.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`relative cursor-pointer rounded-lg outline-none transition ${
                  selectedId === b.id
                    ? "ring-2 ring-brand-400 ring-offset-4 ring-offset-white"
                    : "hover:ring-2 hover:ring-slate-200 hover:ring-offset-4 hover:ring-offset-white"
                }`}
              >
                <BlockRender block={b} brand={brandColor} />
              </div>
            ))}
          </div>
        )}
      </div>
    </EditorChrome>
  );
}

function SectionsPanel({
  blocks,
  selectedId,
  dragId,
  dragOverId,
  showPalette,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onAdd,
  onShowPalette,
}: {
  blocks: Block[];
  selectedId: string | null;
  dragId: string | null;
  dragOverId: string | null;
  showPalette: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (fromId: string, toId: string) => void;
  onDragEnd: () => void;
  onAdd: (type: Block["type"]) => void;
  onShowPalette: (v: boolean) => void;
}) {
  return (
    <div>
      <EditorPanelHeading>Sections</EditorPanelHeading>
      {blocks.length === 0 && (
        <p className="px-4 pb-2 text-xs text-slate-500">
          No blocks yet. Add one below.
        </p>
      )}
      <ul className="space-y-0.5 px-2">
        {blocks.map((block) => {
          const active = selectedId === block.id;
          return (
            <li key={block.id}>
              <div
                draggable
                onDragStart={(e) => {
                  onDragStart(block.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverId !== block.id) onDragOver(block.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === block.id) onDragOver("");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) onDrop(dragId, block.id);
                  onDragEnd();
                }}
                onDragEnd={onDragEnd}
                onClick={() => onSelect(block.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-slate-50"
                } ${dragId === block.id ? "opacity-50" : ""} ${
                  dragOverId === block.id && dragId && dragId !== block.id
                    ? "ring-2 ring-brand-400"
                    : ""
                }`}
              >
                <span
                  className="select-none text-slate-400"
                  aria-hidden
                  title="Drag to reorder"
                >
                  ⋮⋮
                </span>
                <span className="line-clamp-1 flex-1">{summarise(block)}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                  {block.type}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="px-2 pb-4 pt-2">
        {showPalette ? (
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Add a block
            </p>
            <div className="grid grid-cols-2 gap-1">
              {BLOCK_LIBRARY.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => onAdd(b.type)}
                  className="flex items-center gap-2 rounded px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <span aria-hidden>{b.icon}</span>
                  {b.label}
                </button>
              ))}
            </div>
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={() => onShowPalette(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onShowPalette(true)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
          >
            + Add block
          </button>
        )}
      </div>
    </div>
  );
}

function ThemePanel({
  theme,
  onChange,
}: {
  theme: ThemeState;
  onChange: (next: ThemeState) => void;
}) {
  function patch(next: Partial<ThemeState>) {
    onChange({ ...theme, ...next });
  }
  return (
    <div>
      <EditorPanelHeading>Theme</EditorPanelHeading>

      <details open className="border-b border-slate-100 px-4 pb-4">
        <summary className="cursor-pointer py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Logos
        </summary>
        <div className="space-y-3 pt-1">
          <LogoField
            label="Main logo"
            value={theme.logoUrl}
            onChange={(v) => patch({ logoUrl: v })}
          />
          <LogoField
            label="Secondary logo"
            value={theme.secondaryLogoUrl}
            onChange={(v) => patch({ secondaryLogoUrl: v })}
          />
          <LogoField
            label="Square icon"
            value={theme.squareIconUrl}
            onChange={(v) => patch({ squareIconUrl: v })}
            square
          />
        </div>
      </details>

      <details open className="border-b border-slate-100 px-4 pb-4">
        <summary className="cursor-pointer py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Colours
        </summary>
        <div className="space-y-3 pt-1">
          <ColourField
            label="Primary"
            value={theme.brandColor}
            onChange={(v) => patch({ brandColor: v })}
            placeholder="#345ff2"
          />
          <ColourField
            label="Secondary"
            value={theme.secondaryColor}
            onChange={(v) => patch({ secondaryColor: v })}
            placeholder="#1f3087"
          />
        </div>
      </details>

      <details className="px-4 pb-4">
        <summary className="cursor-pointer py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Typography
        </summary>
        <div className="space-y-3 pt-1">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Font family
            </label>
            <select
              className="input"
              value={theme.fontFamily}
              onChange={(e) =>
                patch({
                  fontFamily: e.target.value as ThemeState["fontFamily"],
                })
              }
            >
              <option value="">System default</option>
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Applied to the public landing page.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

function LogoField({
  label,
  value,
  onChange,
  square,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  square?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
      <input
        type="url"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
      />
      {value && (
        <div className="mt-2 inline-block rounded border border-slate-200 bg-slate-50 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className={square ? "h-8 w-8 object-contain" : "h-8 w-auto"}
          />
        </div>
      )}
    </div>
  );
}

function ColourField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded border border-slate-300"
          value={value || placeholder || "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="input flex-1 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SettingsPanel({
  quizSlug,
  settings,
  onChange,
}: {
  quizSlug: string;
  settings: SettingsState;
  onChange: (next: SettingsState) => void;
}) {
  function patch(next: Partial<SettingsState>) {
    onChange({ ...settings, ...next });
  }
  return (
    <div>
      <EditorPanelHeading>Settings</EditorPanelHeading>

      <details open className="border-b border-slate-100 px-4 pb-4">
        <summary className="cursor-pointer py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          General
        </summary>
        <div className="space-y-3 pt-1">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">Public URL</p>
            <code className="block break-all rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
              /q/{quizSlug}
            </code>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Title tag (SEO)
            </label>
            <input
              className="input"
              value={settings.metaTitle}
              onChange={(e) => patch({ metaTitle: e.target.value })}
              placeholder="Inherits the quiz title"
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Meta description (SEO)
            </label>
            <textarea
              className="input min-h-[80px] text-xs"
              value={settings.metaDescription}
              onChange={(e) => patch({ metaDescription: e.target.value })}
              placeholder="Shown in search results."
              maxLength={300}
            />
          </div>
        </div>
      </details>

      <details className="px-4 pb-4">
        <summary className="cursor-pointer py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Custom CSS
        </summary>
        <div className="pt-1">
          <textarea
            className="input min-h-[140px] font-mono text-xs"
            value={settings.customCss}
            onChange={(e) => patch({ customCss: e.target.value })}
            placeholder="/* Add CSS that runs on the public page */"
            maxLength={20000}
          />
          <p className="mt-1 text-xs text-slate-500">
            Injected as a &lt;style&gt; tag on the public landing page.
          </p>
        </div>
      </details>
    </div>
  );
}

function summarise(b: Block): string {
  switch (b.type) {
    case "heading":
      return b.text || "(empty heading)";
    case "paragraph":
      return b.text || "(empty paragraph)";
    case "image":
      return b.url ? "Image" : "(no image set)";
    case "list":
      return b.items.filter(Boolean).join(" · ") || "(empty list)";
    case "button":
      return b.label || "(no label)";
    case "divider":
      return "Horizontal divider";
  }
}

function BlockSettings({
  block,
  brandColor,
  onChange,
  onRemove,
}: {
  block: Block;
  brandColor: string;
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {block.type} settings
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-red-600 hover:text-red-700"
        >
          Remove
        </button>
      </div>

      {block.type === "heading" && (
        <>
          <div>
            <label className="label">Text</label>
            <input
              className="input"
              value={block.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Size</label>
            <select
              className="input"
              value={block.level}
              onChange={(e) =>
                onChange({ level: Number(e.target.value) as 1 | 2 | 3 })
              }
            >
              <option value={1}>H1 — extra large</option>
              <option value={2}>H2 — large</option>
              <option value={3}>H3 — medium</option>
            </select>
          </div>
        </>
      )}

      {block.type === "paragraph" && (
        <div>
          <label className="label">Text</label>
          <textarea
            className="input min-h-[120px]"
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </div>
      )}

      {block.type === "image" && (
        <>
          <div>
            <label className="label">Image URL</label>
            <input
              type="url"
              className="input"
              value={block.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div>
            <label className="label">Alt text</label>
            <input
              className="input"
              value={block.alt}
              onChange={(e) => onChange({ alt: e.target.value })}
              placeholder="What's in the image?"
            />
          </div>
          {block.url && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.url}
                alt={block.alt}
                className="max-h-40 w-full object-cover"
              />
            </div>
          )}
        </>
      )}

      {block.type === "list" && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.checkmark}
              onChange={(e) => onChange({ checkmark: e.target.checked })}
            />
            Brand-coloured tick badges
          </label>
          <div className="space-y-2">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={item}
                  onChange={(e) =>
                    onChange({
                      items: block.items.map((x, j) =>
                        j === i ? e.target.value : x,
                      ),
                    })
                  }
                  maxLength={140}
                />
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() =>
                    onChange({
                      items: block.items.filter((_, j) => j !== i),
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            {block.items.length < 12 && (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => onChange({ items: [...block.items, ""] })}
              >
                + Add item
              </button>
            )}
          </div>
        </>
      )}

      {block.type === "button" && (
        <>
          <div>
            <label className="label">Label</label>
            <input
              className="input"
              value={block.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </div>
          <div>
            <label className="label">URL</label>
            <input
              type="url"
              className="input"
              value={block.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="label">Style</label>
            <select
              className="input"
              value={block.style}
              onChange={(e) =>
                onChange({ style: e.target.value as "primary" | "secondary" })
              }
            >
              <option value="primary">Primary (filled)</option>
              <option value="secondary">Secondary (outlined)</option>
            </select>
          </div>
          <div>
            <p className="label">Preview</p>
            <span
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              style={
                block.style === "primary"
                  ? { backgroundColor: brandColor, color: "white" }
                  : { border: `1px solid ${brandColor}`, color: brandColor }
              }
            >
              {block.label || "Click me"}
            </span>
          </div>
        </>
      )}

      {block.type === "divider" && (
        <p className="text-sm text-slate-500">No settings.</p>
      )}
    </div>
  );
}

function BlockRender({ block, brand }: { block: Block; brand: string }) {
  if (block.type === "heading") {
    const sizeCls =
      block.level === 1
        ? "text-4xl md:text-5xl"
        : block.level === 2
        ? "text-3xl md:text-4xl"
        : "text-2xl md:text-3xl";
    return (
      <h2
        className={`${sizeCls} font-semibold leading-tight tracking-tight text-slate-900`}
      >
        {block.text || (
          <span className="italic text-slate-400">Empty heading</span>
        )}
      </h2>
    );
  }
  if (block.type === "paragraph") {
    return (
      <p className="whitespace-pre-wrap text-base text-slate-600 md:text-lg">
        {block.text || (
          <span className="italic text-slate-400">Empty paragraph</span>
        )}
      </p>
    );
  }
  if (block.type === "image") {
    if (!block.url) {
      return (
        <div className="grid h-40 place-items-center rounded-lg border-2 border-dashed border-slate-200 text-sm italic text-slate-400">
          No image set
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.url} alt={block.alt} className="w-full object-cover" />
      </div>
    );
  }
  if (block.type === "list") {
    const items = block.items.filter((s) => s.trim().length > 0);
    if (items.length === 0) {
      return (
        <p className="italic text-slate-400">Empty list</p>
      );
    }
    return (
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            {block.checkmark ? (
              <span
                aria-hidden
                className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: brand }}
              >
                ✓
              </span>
            ) : (
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400"
              />
            )}
            <span className="text-base text-slate-800">{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "button") {
    if (!block.label && !block.url) {
      return (
        <span className="italic text-slate-400">Empty button</span>
      );
    }
    const style =
      block.style === "primary"
        ? { backgroundColor: brand, color: "white" }
        : { border: `1px solid ${brand}`, color: brand };
    return (
      <span
        className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-medium"
        style={style}
      >
        {block.label || "Click me"} <span aria-hidden>→</span>
      </span>
    );
  }
  if (block.type === "divider") {
    return <hr className="border-t border-slate-200" />;
  }
  return null;
}
