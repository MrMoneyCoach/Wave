"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function LandingDesigner({
  quizId,
  brandColor,
  initialBlocks,
}: {
  quizId: string;
  brandColor: string;
  initialBlocks: Block[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBlocks[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
    setStatus(null);
    const res = await fetch(`/api/quizzes/${quizId}/design`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setStatus(`Could not save: ${j.error ?? res.statusText}`);
      return;
    }
    setStatus("Saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {status}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {blocks.length === 0
            ? "Empty page — add a block to get started."
            : `${blocks.length} block${blocks.length === 1 ? "" : "s"}.`}
        </p>
        <button
          className="btn-primary"
          onClick={save}
          disabled={busy}
          type="button"
        >
          {busy ? "Saving…" : "Save design"}
        </button>
      </div>

      <div className="space-y-2">
        {blocks.map((block) => {
          const selected = selectedId === block.id;
          return (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => {
                setDragId(block.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverId !== block.id) setDragOverId(block.id);
              }}
              onDragLeave={() => {
                if (dragOverId === block.id) setDragOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) moveTo(dragId, block.id);
                setDragId(null);
                setDragOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDragOverId(null);
              }}
              className={`rounded-xl border bg-white transition ${
                selected ? "border-brand-400 shadow-sm" : "border-slate-200"
              } ${dragId === block.id ? "opacity-50" : ""} ${
                dragOverId === block.id && dragId && dragId !== block.id
                  ? "ring-2 ring-brand-400"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(selected ? null : block.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="cursor-grab select-none text-slate-400 active:cursor-grabbing"
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
                    {block.type}
                  </span>
                  <span className="line-clamp-1 text-sm text-slate-700">
                    {summarise(block)}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {selected ? "▴" : "▾"}
                </span>
              </button>

              {selected && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <BlockSettings
                    block={block}
                    brandColor={brandColor}
                    onChange={(patch) => patchBlock(block.id, patch)}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove block
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        {showPalette ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Add a block
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BLOCK_LIBRARY.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => addBlock(b.type)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-300 hover:bg-slate-50"
                >
                  <span aria-hidden className="text-base">
                    {b.icon}
                  </span>
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setShowPalette(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPalette(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
          >
            + Add block
          </button>
        )}
      </div>
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
      return b.url || "(no image set)";
    case "list":
      return b.items.filter(Boolean).join(" · ") || "(empty list)";
    case "button":
      return `${b.label || "(no label)"} → ${b.url || "(no URL)"}`;
    case "divider":
      return "Horizontal divider";
  }
}

function BlockSettings({
  block,
  brandColor,
  onChange,
}: {
  block: Block;
  brandColor: string;
  onChange: (patch: Partial<Block>) => void;
}) {
  if (block.type === "heading") {
    return (
      <div className="space-y-3">
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
      </div>
    );
  }
  if (block.type === "paragraph") {
    return (
      <div>
        <label className="label">Text</label>
        <textarea
          className="input min-h-[100px]"
          value={block.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div className="space-y-3">
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
              className="max-h-48 w-full object-cover"
            />
          </div>
        )}
      </div>
    );
  }
  if (block.type === "list") {
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.checkmark}
            onChange={(e) => onChange({ checkmark: e.target.checked })}
          />
          Show brand-coloured tick badges
        </label>
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                value={item}
                onChange={(e) =>
                  onChange({
                    items: block.items.map((x, j) => (j === i ? e.target.value : x)),
                  })
                }
                maxLength={140}
              />
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() =>
                  onChange({ items: block.items.filter((_, j) => j !== i) })
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
      </div>
    );
  }
  if (block.type === "button") {
    return (
      <div className="space-y-3">
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
            <option value="primary">Primary (filled brand colour)</option>
            <option value="secondary">Secondary (outlined)</option>
          </select>
        </div>
        <div>
          <span className="label">Preview</span>
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
      </div>
    );
  }
  return (
    <p className="text-sm text-slate-500">
      Horizontal divider — no settings.
    </p>
  );
}
