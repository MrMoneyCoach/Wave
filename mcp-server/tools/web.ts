import { execFile } from "child_process";
import { promisify } from "util";
import { text, ToolModule } from "./types.js";
import { openInBrowser } from "../browser.js";

const run = promisify(execFile);

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

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

export const web: ToolModule = {
  tools: [
    {
      name: "open_url",
      description: "Open a URL in the user's default web browser.",
      inputSchema: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
    {
      name: "open_site_search",
      description:
        "Open a search URL on a well-known site (Google, YouTube, Amazon, Wikipedia, Reddit, X/Twitter, GitHub) in the user's default browser. For LinkedIn specifically, prefer the specialised linkedin_* tools.",
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
          onlyIn: { type: "string" },
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
      description: "Launch a Mac application by name.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  ],
  handlers: {
    async open_url(args) {
      const url = String(args.url ?? "");
      if (!isSafeUrl(url)) return text("Only http/https URLs are allowed.", true);
      await openInBrowser(url);
      return text(`Opened ${url} in Chrome.`);
    },
    async open_site_search(args) {
      const url = buildSiteSearchUrl(String(args.site ?? "google"), String(args.query ?? ""));
      await openInBrowser(url);
      return text(`Opened ${url} in Chrome.`);
    },
    async find_files(args) {
      const query = String(args.query ?? "");
      const limit = Number(args.limit ?? 20);
      const onlyIn = args.onlyIn ? String(args.onlyIn) : null;
      const argv = onlyIn ? ["-onlyin", onlyIn, query] : [query];
      const { stdout } = await run("mdfind", argv, { maxBuffer: 4_000_000 });
      const lines = stdout.split("\n").filter(Boolean).slice(0, limit);
      return text(lines.length === 0 ? "No files found." : lines.join("\n"));
    },
    async reveal_file(args) {
      await run("open", ["-R", String(args.path ?? "")]);
      return text(`Revealed ${args.path}`);
    },
    async open_file(args) {
      await run("open", [String(args.path ?? "")]);
      return text(`Opened ${args.path}`);
    },
    async open_app(args) {
      await run("open", ["-a", String(args.name ?? "")]);
      return text(`Launched ${args.name}`);
    },
  },
};
