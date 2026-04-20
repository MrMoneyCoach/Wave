#!/usr/bin/env node
/**
 * Alfred MCP server — local tools for the user's Mac.
 *
 * Launched as a stdio subprocess by the `claude` CLI via the per-session
 * --mcp-config written by the Electron app. Runs with the user's
 * privileges, so every command is gated to a small whitelist of shell
 * verbs with argv-escaped inputs.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { osascript, asStringLiteral, asAppleScriptDate } from "./applescript.js";

const run = promisify(execFile);

const TOOLS = [
  /* ---------------- Web / files / apps ---------------- */
  {
    name: "open_url",
    description:
      "Open a URL in the user's default web browser. Use this when the user wants to visit a page.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "open_site_search",
    description:
      "Open a search URL on a well-known site (LinkedIn, Google, YouTube, Amazon, Wikipedia, Reddit, X/Twitter, GitHub) in the user's default browser. Because it opens in their real browser, any existing login (e.g. LinkedIn) is reused — use this whenever the user asks to 'search X on LinkedIn' or similar.",
    inputSchema: {
      type: "object",
      properties: {
        site: {
          type: "string",
          enum: [
            "linkedin_jobs",
            "linkedin",
            "google",
            "youtube",
            "amazon",
            "wikipedia",
            "reddit",
            "twitter",
            "github",
          ],
        },
        query: { type: "string" },
      },
      required: ["site", "query"],
    },
  },
  {
    name: "find_files",
    description:
      "Search the user's Mac for files by name or content using Spotlight (mdfind). Returns absolute paths.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        onlyIn: {
          type: "string",
          description: "Optional absolute directory to scope the search",
        },
        limit: { type: "number", default: 20 },
      },
      required: ["query"],
    },
  },
  {
    name: "reveal_file",
    description: "Reveal a file or folder in Finder.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "open_file",
    description: "Open a file or folder with its default Mac application.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "open_app",
    description:
      "Launch a Mac application by name (e.g. 'Safari', 'Xcode', 'Notion', 'Messages', 'Mail').",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },

  /* ---------------- Calendar ---------------- */
  {
    name: "calendar_create_event",
    description:
      "Create an event in the user's Mac Calendar. Dates use ISO 8601 (e.g. '2026-04-25T14:00'). If end is omitted, the event is one hour long.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start: { type: "string", description: "ISO 8601 start" },
        end: { type: "string", description: "ISO 8601 end (optional)" },
        notes: { type: "string" },
        location: { type: "string" },
        calendar: { type: "string", description: "Calendar name (default: first)" },
      },
      required: ["title", "start"],
    },
  },
  {
    name: "calendar_list_events",
    description:
      "List Calendar events between two ISO 8601 timestamps. Defaults to today if both omitted.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        calendar: { type: "string" },
      },
    },
  },

  /* ---------------- Reminders ---------------- */
  {
    name: "reminder_create",
    description: "Create a reminder in the Reminders app.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        due: { type: "string", description: "ISO 8601 due date (optional)" },
        list: { type: "string", description: "List name (default: Reminders)" },
        notes: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "reminder_list",
    description: "List incomplete reminders, optionally filtered to a list.",
    inputSchema: {
      type: "object",
      properties: {
        list: { type: "string" },
        limit: { type: "number", default: 25 },
      },
    },
  },

  /* ---------------- Notes ---------------- */
  {
    name: "note_create",
    description: "Create a new note in the Notes app. Body supports basic HTML (e.g. <b>, <br>).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        folder: { type: "string", description: "Folder name (default: Notes)" },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "note_append",
    description: "Append text to an existing note (matched by title). Creates it if missing.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        text: { type: "string" },
        folder: { type: "string" },
      },
      required: ["title", "text"],
    },
  },

  /* ---------------- Clipboard / dictation ---------------- */
  {
    name: "clipboard_get",
    description: "Return the current clipboard text.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "clipboard_set",
    description: "Replace the clipboard with the given text.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "paste_text",
    description:
      "Type text into whatever app the user was using before Alfred. Switches to the previous app (Cmd+Tab) and pastes via the clipboard. Use this when the user says things like 'type this into the email I'm writing' or 'paste this into my document'. Requires Accessibility permission in System Settings.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
];

/* ---------------- Helpers ---------------- */

function buildSiteSearchUrl(site: string, query: string): string {
  const q = encodeURIComponent(query);
  switch (site) {
    case "linkedin_jobs":
      return `https://www.linkedin.com/jobs/search/?keywords=${q}`;
    case "linkedin":
      return `https://www.linkedin.com/search/results/all/?keywords=${q}`;
    case "google":
      return `https://www.google.com/search?q=${q}`;
    case "youtube":
      return `https://www.youtube.com/results?search_query=${q}`;
    case "amazon":
      return `https://www.amazon.com/s?k=${q}`;
    case "wikipedia":
      return `https://en.wikipedia.org/w/index.php?search=${q}`;
    case "reddit":
      return `https://www.reddit.com/search/?q=${q}`;
    case "twitter":
      return `https://x.com/search?q=${q}`;
    case "github":
      return `https://github.com/search?q=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function text(s: string, isError = false) {
  return { isError, content: [{ type: "text", text: s }] };
}

function addHour(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function todayRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { from, to };
}

/* ---------------- Tool handlers ---------------- */

async function handleTool(name: string, args: any) {
  switch (name) {
    case "open_url": {
      const url = String(args.url ?? "");
      if (!isSafeUrl(url)) return text("Only http/https URLs are allowed.", true);
      await run("open", [url]);
      return text(`Opened ${url}`);
    }
    case "open_site_search": {
      const url = buildSiteSearchUrl(String(args.site ?? "google"), String(args.query ?? ""));
      await run("open", [url]);
      return text(`Opened ${url}`);
    }
    case "find_files": {
      const query = String(args.query ?? "");
      const limit = Number(args.limit ?? 20);
      const onlyIn = args.onlyIn ? String(args.onlyIn) : null;
      const argv = onlyIn ? ["-onlyin", onlyIn, query] : [query];
      const { stdout } = await run("mdfind", argv, { maxBuffer: 4_000_000 });
      const lines = stdout.split("\n").filter(Boolean).slice(0, limit);
      return text(lines.length === 0 ? "No files found." : lines.join("\n"));
    }
    case "reveal_file": {
      await run("open", ["-R", String(args.path ?? "")]);
      return text(`Revealed ${args.path}`);
    }
    case "open_file": {
      await run("open", [String(args.path ?? "")]);
      return text(`Opened ${args.path}`);
    }
    case "open_app": {
      await run("open", ["-a", String(args.name ?? "")]);
      return text(`Launched ${args.name}`);
    }

    /* ---------- Calendar ---------- */
    case "calendar_create_event": {
      const title = String(args.title ?? "");
      const start = String(args.start ?? "");
      const end = args.end ? String(args.end) : addHour(start, 1);
      const notes = args.notes ? String(args.notes) : "";
      const location = args.location ? String(args.location) : "";
      const cal = args.calendar ? String(args.calendar) : "";

      const script = `
${asAppleScriptDate(start, "s")}
${asAppleScriptDate(end, "e")}
tell application "Calendar"
  ${cal ? `set theCal to calendar ${asStringLiteral(cal)}` : `set theCal to first calendar whose writable is true`}
  tell theCal
    set newEvent to make new event with properties {summary: ${asStringLiteral(title)}, start date: s, end date: e${notes ? `, description: ${asStringLiteral(notes)}` : ""}${location ? `, location: ${asStringLiteral(location)}` : ""}}
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(`Event "${title}" created from ${new Date(start).toLocaleString()} to ${new Date(end).toLocaleString()}.`);
    }
    case "calendar_list_events": {
      const range = args.from || args.to ? null : todayRange();
      const from = String(args.from ?? range?.from ?? "");
      const to = String(args.to ?? range?.to ?? "");
      const calClause = args.calendar
        ? `calendar ${asStringLiteral(String(args.calendar))}`
        : `calendars`;
      const script = `
${asAppleScriptDate(from, "s")}
${asAppleScriptDate(to, "e")}
set output to ""
tell application "Calendar"
  repeat with c in (${calClause})
    repeat with ev in (every event of c whose start date is greater than or equal to s and start date is less than e)
      set output to output & (summary of ev) & " | " & (start date of ev as text) & linefeed
    end repeat
  end repeat
end tell
return output
`;
      const out = await osascript(script);
      return text(out.trim() || "No events in that range.");
    }

    /* ---------- Reminders ---------- */
    case "reminder_create": {
      const title = String(args.title ?? "");
      const list = args.list ? String(args.list) : "Reminders";
      const notes = args.notes ? String(args.notes) : "";
      const dueBlock = args.due
        ? `${asAppleScriptDate(String(args.due), "d")}\nset due date of newRem to d`
        : "";
      const script = `
tell application "Reminders"
  tell list ${asStringLiteral(list)}
    set newRem to make new reminder with properties {name: ${asStringLiteral(title)}${notes ? `, body: ${asStringLiteral(notes)}` : ""}}
    ${dueBlock}
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(`Reminder "${title}" added to ${list}${args.due ? ` (due ${new Date(String(args.due)).toLocaleString()})` : ""}.`);
    }
    case "reminder_list": {
      const limit = Number(args.limit ?? 25);
      const listClause = args.list
        ? `tell list ${asStringLiteral(String(args.list))}`
        : `tell default list`;
      const script = `
set output to ""
tell application "Reminders"
  ${listClause}
    set rems to (every reminder whose completed is false)
    repeat with r in rems
      set output to output & (name of r) & linefeed
    end repeat
  end tell
end tell
return output
`;
      const out = await osascript(script);
      const lines = out.split("\n").filter(Boolean).slice(0, limit);
      return text(lines.length === 0 ? "No open reminders." : lines.join("\n"));
    }

    /* ---------- Notes ---------- */
    case "note_create": {
      const title = String(args.title ?? "");
      const body = String(args.body ?? "");
      const folder = args.folder ? String(args.folder) : "Notes";
      const html = `<div><h1>${escapeHtml(title)}</h1>${body}</div>`;
      const script = `
tell application "Notes"
  set targetFolder to missing value
  repeat with f in folders
    if name of f is ${asStringLiteral(folder)} then set targetFolder to f
  end repeat
  if targetFolder is missing value then set targetFolder to default folder
  tell targetFolder
    make new note with properties {name: ${asStringLiteral(title)}, body: ${asStringLiteral(html)}}
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(`Note "${title}" created.`);
    }
    case "note_append": {
      const title = String(args.title ?? "");
      const appendText = String(args.text ?? "");
      const folder = args.folder ? String(args.folder) : "Notes";
      const appendHtml = `<div><br>${escapeHtml(appendText).replace(/\n/g, "<br>")}</div>`;
      const script = `
tell application "Notes"
  set targetFolder to missing value
  repeat with f in folders
    if name of f is ${asStringLiteral(folder)} then set targetFolder to f
  end repeat
  if targetFolder is missing value then set targetFolder to default folder
  tell targetFolder
    set matches to (every note whose name is ${asStringLiteral(title)})
    if (count of matches) > 0 then
      set n to item 1 of matches
      set body of n to (body of n) & ${asStringLiteral(appendHtml)}
    else
      make new note with properties {name: ${asStringLiteral(title)}, body: ${asStringLiteral(`<div><h1>${escapeHtml(title)}</h1>${appendHtml}</div>`)}}
    end if
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(`Appended to note "${title}".`);
    }

    /* ---------- Clipboard / dictation ---------- */
    case "clipboard_get": {
      const { stdout } = await run("pbpaste", []);
      return text(stdout || "(clipboard is empty)");
    }
    case "clipboard_set": {
      await pbcopy(String(args.text ?? ""));
      return text("Clipboard set.");
    }
    case "paste_text": {
      const payload = String(args.text ?? "");
      if (!payload) return text("Nothing to paste.", true);
      await pbcopy(payload);
      // Cmd+Tab to the previous app, short wait, Cmd+V.
      const script = `
tell application "System Events"
  key code 48 using {command down}
  delay 0.25
  keystroke "v" using {command down}
end tell
return "ok"
`;
      try {
        await osascript(script);
        return text("Pasted into the previous app.");
      } catch (err) {
        return text(
          `Couldn't paste automatically (${(err as Error).message}). Text is on your clipboard — press ⌘V to paste.`,
          true,
        );
      }
    }

    default:
      return text(`Unknown tool: ${name}`, true);
  }
}

async function pbcopy(s: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = execFile("pbcopy", [], (err) => (err ? reject(err) : resolve()));
    child.stdin?.end(s);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const server = new Server(
  { name: "alfred", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    return await handleTool(name, args);
  } catch (err) {
    return text((err as Error).message ?? String(err), true);
  }
});

await server.connect(new StdioServerTransport());
