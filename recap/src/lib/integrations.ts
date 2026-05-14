import type { Template, TemplateSection } from "@/lib/types";

// Outbound integrations. Both are deliberately "bring your own credential":
//  - Slack: a user-pasted Incoming Webhook URL (no OAuth app to maintain).
//  - Notion: a user-pasted internal integration token + a parent page id.
// Credentials live on the profile row, readable only by the owner via RLS.

type SummaryForExport = {
  title: string;
  template: Pick<Template, "name" | "sections"> | null;
  summary: Record<string, string> | null;
  shareUrl: string | null;
};

/** Sections that actually have content (skips "None"). */
function meaningfulSections(
  template: Pick<Template, "sections"> | null,
  summary: Record<string, string> | null,
): { section: TemplateSection; value: string }[] {
  if (!template || !summary) return [];
  return template.sections
    .map((section) => ({ section, value: summary[section.key] ?? "" }))
    .filter(({ value }) => value && value.trim().toLowerCase() !== "none");
}

// ---- Slack ------------------------------------------------------------------

export async function postToSlack(webhookUrl: string, data: SummaryForExport): Promise<void> {
  const sections = meaningfulSections(data.template, data.summary);
  const lines: string[] = [`*${data.title}*`];
  if (data.template) lines.push(`_${data.template.name} summary_`);
  for (const { section, value } of sections) {
    lines.push("", `*${section.label}*`, value.trim());
  }
  if (data.shareUrl) lines.push("", `<${data.shareUrl}|Open in Recap>`);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Slack rejected the message (${res.status}): ${body.slice(0, 200)}`);
  }
}

// ---- Notion -----------------------------------------------------------------

const NOTION_VERSION = "2022-06-28";

type NotionBlock = Record<string, unknown>;

function richText(content: string) {
  // Notion rejects text runs longer than 2000 chars; chunk just in case.
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += 1900) chunks.push(content.slice(i, i + 1900));
  return (chunks.length ? chunks : [""]).map((text) => ({
    type: "text",
    text: { content: text },
  }));
}

function blocksForSummary(data: SummaryForExport): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  const sections = meaningfulSections(data.template, data.summary);

  for (const { section, value } of sections) {
    blocks.push({
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: richText(section.label) },
    });
    for (const rawLine of value.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("- ") || line.startsWith("* ")) {
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: richText(line.slice(2)) },
        });
      } else {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: richText(line) },
        });
      }
    }
  }

  if (data.shareUrl) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Open in Recap", link: { url: data.shareUrl } },
          },
        ],
      },
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: richText("No summary content yet.") },
    });
  }
  // Notion caps children at 100 blocks per request.
  return blocks.slice(0, 100);
}

export async function exportToNotion(
  args: { token: string; parentPageId: string },
  data: SummaryForExport,
): Promise<{ url: string }> {
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.token}`,
      "notion-version": NOTION_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      parent: { page_id: args.parentPageId },
      properties: {
        title: { title: richText(data.title) },
      },
      children: blocksForSummary(data),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!res.ok) {
    throw new Error(`Notion rejected the page (${res.status}): ${json.message ?? "unknown error"}`);
  }
  return { url: json.url ?? "" };
}
