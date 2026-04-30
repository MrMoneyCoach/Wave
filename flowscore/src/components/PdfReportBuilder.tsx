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

type Initial = {
  id: string;
  name: string;
  isDefault: boolean;
  blocks: Block[];
};

const BLOCK_LIBRARY: { type: Block["type"]; label: string; icon: string }[] = [
  { type: "heading", label: "Heading", icon: "T" },
  { type: "paragraph", label: "Paragraph", icon: "¶" },
  { type: "image", label: "Image", icon: "🖼" },
  { type: "list", label: "List", icon: "•" },
  { type: "button", label: "Button", icon: "▢" },
  { type: "divider", label: "Divider", icon: "—" },
];

const TOKENS: { token: string; label: string }[] = [
  { token: "{{firstName}}", label: "First name" },
  { token: "{{lastName}}", label: "Last name" },
  { token: "{{percent}}", label: "Percent score" },
  { token: "{{score}}", label: "Score" },
  { token: "{{maxScore}}", label: "Max score" },
  { token: "{{outcomeTitle}}", label: "Outcome title" },
  { token: "{{outcomeDescription}}", label: "Outcome description" },
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

export default function PdfReportBuilder({
  quizId,
  quizTitle,
  brandColor,
  initial,
}: {
  quizId: string;
  quizTitle: string;
  brandColor: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.blocks[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rail, setRail] = useState<Rail>("sections");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

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
    const res = await fetch(
      `/api/quizzes/${quizId}/pdf-reports/${initial.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isDefault, blocks }),
      },
    );
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
      backHref={`/dashboard/quizzes/${quizId}/pdf-reports`}
      breadcrumb={[
        { label: quizTitle || "Untitled", href: `/dashboard/quizzes/${quizId}` },
        { label: "PDF Reports", href: `/dashboard/quizzes/${quizId}/pdf-reports` },
        { label: name || "Untitled" },
      ]}
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
            name={name}
            onNameChange={setName}
            isDefault={isDefault}
            onIsDefaultChange={setIsDefault}
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
        ) : (
          <DeferredPanel rail={rail} />
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
      <div className="px-6 py-8 md:px-10 md:py-12">
        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Tokens like <code>{`{{firstName}}`}</code>, <code>{`{{percent}}`}</code>{" "}
          and <code>{`{{outcomeTitle}}`}</code> are kept as-is in this preview.
          They're swapped for real values in the PDF that gets emailed.
        </p>
        {blocks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-16 text-center text-sm text-slate-500">
            Empty PDF body. Add a block from the left to design the report.
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

function SectionsPanel(props: {
  name: string;
  onNameChange: (v: string) => void;
  isDefault: boolean;
  onIsDefaultChange: (v: boolean) => void;
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
  const {
    name,
    onNameChange,
    isDefault,
    onIsDefaultChange,
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
  } = props;

  return (
    <div>
      <EditorPanelHeading>Report settings</EditorPanelHeading>
      <div className="space-y-3 px-4 pb-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={120}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => onIsDefaultChange(e.target.checked)}
          />
          Use as the emailed PDF
        </label>
      </div>

      <EditorPanelHeading>Body blocks</EditorPanelHeading>
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
                <span className="select-none text-slate-400" aria-hidden>
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

      <EditorPanelHeading>Tokens</EditorPanelHeading>
      <div className="space-y-1 px-4 pb-4 text-xs">
        <p className="text-slate-500">
          Drop these into any text field. Replaced with real values when the PDF
          is generated.
        </p>
        <ul className="font-mono text-[11px] text-slate-700">
          {TOKENS.map((t) => (
            <li key={t.token} className="flex justify-between gap-2 py-0.5">
              <code>{t.token}</code>
              <span className="text-slate-400">{t.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeferredPanel({ rail }: { rail: Rail }) {
  return (
    <div>
      <EditorPanelHeading>{rail === "theme" ? "Theme" : "Settings"}</EditorPanelHeading>
      <p className="px-4 pb-4 text-xs text-slate-500">
        PDF-specific {rail} controls coming soon. Brand colour and logo flow
        through from the quiz Theme.
      </p>
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
                  maxLength={280}
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
            {block.items.length < 20 && (
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
    if (items.length === 0)
      return <p className="italic text-slate-400">Empty list</p>;
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
    if (!block.label && !block.url)
      return <span className="italic text-slate-400">Empty button</span>;
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
