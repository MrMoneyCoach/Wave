"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Template, TemplateSection } from "@/lib/types";

type Mode = { kind: "new" } | { kind: "edit"; id: string };

type Props = {
  mode: Mode;
  initial: {
    name: string;
    description: string;
    sections: TemplateSection[];
    prompt: string;
  };
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function defaultSections(): TemplateSection[] {
  return [
    { key: "overview", label: "Overview" },
    { key: "actions", label: "Action items" },
  ];
}

export function emptyInitial(): Props["initial"] {
  return {
    name: "",
    description: "",
    sections: defaultSections(),
    prompt: "",
  };
}

export function initialFrom(template: Template): Props["initial"] {
  return {
    name: template.name,
    description: template.description ?? "",
    sections: template.sections.length ? template.sections : defaultSections(),
    prompt: template.prompt,
  };
}

export default function TemplateEditor({ mode, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [sections, setSections] = useState<TemplateSection[]>(initial.sections);
  const [prompt, setPrompt] = useState(initial.prompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSectionLabel(i: number, label: string) {
    setSections((curr) => {
      const next = [...curr];
      const slug = slugify(label) || `section-${i + 1}`;
      next[i] = { key: slug, label };
      return next;
    });
  }

  function addSection() {
    setSections((curr) =>
      curr.length >= 12
        ? curr
        : [...curr, { key: `section-${curr.length + 1}`, label: "Untitled section" }],
    );
  }

  function removeSection(i: number) {
    setSections((curr) => (curr.length <= 1 ? curr : curr.filter((_, idx) => idx !== i)));
  }

  function moveSection(i: number, delta: -1 | 1) {
    setSections((curr) => {
      const j = i + delta;
      if (j < 0 || j >= curr.length) return curr;
      const next = [...curr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      // Ensure section keys are unique.
      const seen = new Set<string>();
      const cleaned: TemplateSection[] = sections.map((s, i) => {
        let key = s.key || slugify(s.label) || `section-${i + 1}`;
        let dedupe = 1;
        const base = key;
        while (seen.has(key)) {
          dedupe += 1;
          key = `${base}-${dedupe}`;
        }
        seen.add(key);
        return { key, label: s.label.trim() || `Section ${i + 1}` };
      });

      const body = {
        name: name.trim(),
        description: description.trim() || null,
        sections: cleaned,
        prompt: prompt.trim(),
      };

      const res = await fetch(
        mode.kind === "new" ? "/api/templates" : `/api/templates/${mode.id}`,
        {
          method: mode.kind === "new" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (res.status === 402) {
        router.push("/dashboard/billing");
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save");
      router.push("/dashboard/templates");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme weekly sync"
            maxLength={80}
            className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One-line description of what this template is for"
            maxLength={280}
            className="mt-1 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Sections</h2>
          <button
            type="button"
            onClick={addSection}
            disabled={sections.length >= 12}
            className="rounded border border-ink/15 bg-white px-2.5 py-1 text-xs hover:bg-ink/5 disabled:opacity-50"
          >
            + Add section
          </button>
        </div>
        <p className="mt-1 text-xs text-ink/60">
          Each section becomes a heading in the generated summary. Keep them tight — 3 to 6 sections usually reads best.
        </p>
        <div className="mt-3 space-y-2">
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-ink/10 bg-white p-2">
              <span className="w-6 text-center text-xs text-ink/50">{i + 1}</span>
              <input
                type="text"
                value={s.label}
                onChange={(e) => setSectionLabel(i, e.target.value)}
                placeholder="Section name"
                className="min-w-0 flex-1 rounded border border-ink/15 px-2 py-1 text-sm outline-none focus:border-ink"
              />
              <span className="hidden font-mono text-[11px] text-ink/40 sm:inline">{s.key}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0} className="rounded px-2 text-sm text-ink/60 hover:bg-ink/5 disabled:opacity-30" aria-label="Move up">↑</button>
                <button type="button" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} className="rounded px-2 text-sm text-ink/60 hover:bg-ink/5 disabled:opacity-30" aria-label="Move down">↓</button>
                <button type="button" onClick={() => removeSection(i)} disabled={sections.length <= 1} className="rounded px-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-30" aria-label="Delete">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Prompt</span>
        <p className="mt-1 text-xs text-ink/60">
          Instructions Claude follows when filling the sections. Be specific — e.g. &ldquo;Treat this as a customer
          discovery interview. Quote the participant verbatim where possible. Stay neutral.&rdquo;
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={4000}
          rows={6}
          className="mt-2 block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || !name.trim() || !prompt.trim() || sections.length === 0}
          className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : mode.kind === "new" ? "Create template" : "Save changes"}
        </button>
        <Link href="/dashboard/templates" className="text-sm text-ink/60 hover:text-ink">
          Cancel
        </Link>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
