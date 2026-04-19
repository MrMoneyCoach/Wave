#!/usr/bin/env node
/**
 * Alfred MCP server — local tools for the user's Mac.
 *
 * Launched as a stdio subprocess by the `claude` CLI via the per-session
 * --mcp-config written by the Electron app. Runs with the user's
 * privileges, so every command is gated to a small whitelist of shell
 * verbs (open, mdfind) with argv-escaped inputs.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

const TOOLS = [
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
        query: { type: "string", description: "Spotlight query" },
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
];

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

const server = new Server(
  { name: "alfred", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    switch (name) {
      case "open_url": {
        const url = String((args as any).url ?? "");
        if (!isSafeUrl(url)) return text("Only http/https URLs are allowed.", true);
        await run("open", [url]);
        return text(`Opened ${url}`);
      }
      case "open_site_search": {
        const url = buildSiteSearchUrl(
          String((args as any).site ?? "google"),
          String((args as any).query ?? ""),
        );
        await run("open", [url]);
        return text(`Opened ${url}`);
      }
      case "find_files": {
        const query = String((args as any).query ?? "");
        const limit = Number((args as any).limit ?? 20);
        const onlyIn = (args as any).onlyIn ? String((args as any).onlyIn) : null;
        const argv = onlyIn ? ["-onlyin", onlyIn, query] : [query];
        const { stdout } = await run("mdfind", argv, { maxBuffer: 4_000_000 });
        const lines = stdout.split("\n").filter(Boolean).slice(0, limit);
        return text(lines.length === 0 ? "No files found." : lines.join("\n"));
      }
      case "reveal_file": {
        const p = String((args as any).path ?? "");
        await run("open", ["-R", p]);
        return text(`Revealed ${p}`);
      }
      case "open_file": {
        const p = String((args as any).path ?? "");
        await run("open", [p]);
        return text(`Opened ${p}`);
      }
      case "open_app": {
        const n = String((args as any).name ?? "");
        await run("open", ["-a", n]);
        return text(`Launched ${n}`);
      }
      default:
        return text(`Unknown tool: ${name}`, true);
    }
  } catch (err) {
    return text((err as Error).message ?? String(err), true);
  }
});

await server.connect(new StdioServerTransport());
