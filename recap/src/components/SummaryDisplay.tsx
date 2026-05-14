import type { TemplateSection } from "@/lib/types";

/**
 * Renders a template-driven summary. The markdown subset Claude returns is
 * just paragraphs, "- " bullets, and **bold** — so we render it without a
 * markdown dependency.
 */
export function SummaryDisplay({
  sections,
  summary,
}: {
  sections: TemplateSection[];
  summary: Record<string, string>;
}) {
  const visible = sections.filter((sec) => {
    const value = summary[sec.key];
    return value && value.trim().toLowerCase() !== "none";
  });

  if (visible.length === 0) {
    return <p className="text-sm text-ink/60">No summary content.</p>;
  }

  return (
    <div className="prose-recap">
      {visible.map((sec) => (
        <section key={sec.key} className="mt-2">
          <h2>{sec.label}</h2>
          <MarkdownBlock text={summary[sec.key]} />
        </section>
      ))}
    </div>
  );
}

export function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let counter = 0;

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {bullets.map((b, idx) => (
            <li key={idx}>{renderInline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      bullets.push(line.slice(2));
    } else {
      flush();
      blocks.push(<p key={`p-${counter++}`}>{renderInline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
