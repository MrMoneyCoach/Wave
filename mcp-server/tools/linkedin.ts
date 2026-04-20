import { execFile } from "child_process";
import { promisify } from "util";
import { text, ToolModule } from "./types.js";

const run = promisify(execFile);

const WORK_TYPE: Record<string, string> = { onsite: "1", remote: "2", hybrid: "3" };
// LinkedIn experience levels: 1 internship, 2 entry, 3 associate, 4 mid-senior,
// 5 director, 6 executive.
const EXPERIENCE: Record<string, string> = {
  internship: "1",
  entry: "2",
  associate: "3",
  "mid-senior": "4",
  mid: "4",
  senior: "4",
  director: "5",
  executive: "6",
};
const POSTED: Record<string, string> = {
  "24h": "r86400",
  day: "r86400",
  week: "r604800",
  month: "r2592000",
};

function jobsSearchUrl(args: any): string {
  const u = new URLSearchParams();
  if (args.query) u.set("keywords", String(args.query));
  if (args.location) u.set("location", String(args.location));
  if (args.remote && WORK_TYPE[String(args.remote)]) {
    u.set("f_WT", WORK_TYPE[String(args.remote)]);
  }
  if (args.experience && EXPERIENCE[String(args.experience)]) {
    u.set("f_E", EXPERIENCE[String(args.experience)]);
  }
  if (args.postedWithin && POSTED[String(args.postedWithin)]) {
    u.set("f_TPR", POSTED[String(args.postedWithin)]);
  }
  if (args.easyApply) u.set("f_AL", "true");
  return `https://www.linkedin.com/jobs/search/?${u.toString()}`;
}

function peopleSearchUrl(args: any): string {
  const parts = [
    args.query,
    args.title ? `"${String(args.title)}"` : "",
    args.company ? `"${String(args.company)}"` : "",
  ].filter(Boolean);
  const u = new URLSearchParams();
  u.set("keywords", parts.join(" ").trim());
  if (args.location) u.set("locationName", String(args.location));
  return `https://www.linkedin.com/search/results/people/?${u.toString()}`;
}

function companySearchUrl(args: any): string {
  const u = new URLSearchParams();
  u.set("keywords", String(args.query ?? ""));
  return `https://www.linkedin.com/search/results/companies/?${u.toString()}`;
}

function sectionUrl(section: string): string {
  const paths: Record<string, string> = {
    feed: "/feed/",
    messaging: "/messaging/",
    notifications: "/notifications/",
    mynetwork: "/mynetwork/",
    jobs: "/jobs/",
    profile: "/in/me/",
    saved_jobs: "/my-items/saved-jobs/",
    my_posts: "/in/me/recent-activity/all/",
  };
  return `https://www.linkedin.com${paths[section] ?? "/feed/"}`;
}

export const linkedin: ToolModule = {
  tools: [
    {
      name: "linkedin_jobs_search",
      description:
        "Open a LinkedIn jobs search in the user's default browser with rich filters. Uses the user's existing LinkedIn login. Prefer this over open_site_search for any job-related request.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Role / keywords (e.g. 'Swift engineer')" },
          location: { type: "string", description: "City, region, or country" },
          remote: {
            type: "string",
            enum: ["onsite", "remote", "hybrid"],
            description: "Work type filter",
          },
          experience: {
            type: "string",
            enum: [
              "internship",
              "entry",
              "associate",
              "mid",
              "mid-senior",
              "senior",
              "director",
              "executive",
            ],
          },
          postedWithin: {
            type: "string",
            enum: ["24h", "day", "week", "month"],
            description: "Filter to jobs posted within this window",
          },
          easyApply: { type: "boolean" },
        },
        required: ["query"],
      },
    },
    {
      name: "linkedin_people_search",
      description:
        "Open a LinkedIn people search for finding individuals by role / company / location. Use for 'find me a recruiter at Acme in London' or 'look up John Smith at Acme'.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          title: { type: "string", description: "Current job title (optional)" },
          company: { type: "string", description: "Current company (optional)" },
          location: { type: "string" },
        },
        required: ["query"],
      },
    },
    {
      name: "linkedin_company_search",
      description: "Search LinkedIn for a company and open the results.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    {
      name: "linkedin_goto",
      description:
        "Open a specific LinkedIn section in the user's browser (feed, messaging, notifications, mynetwork, jobs, profile, saved_jobs, my_posts).",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: [
              "feed",
              "messaging",
              "notifications",
              "mynetwork",
              "jobs",
              "profile",
              "saved_jobs",
              "my_posts",
            ],
          },
        },
        required: ["section"],
      },
    },
    {
      name: "linkedin_compose_post",
      description:
        "Open LinkedIn's post composer. Pair with paste_text to drop a drafted post into it for the user to review and share.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "linkedin_messaging",
      description: "Open LinkedIn messaging. Optionally with a recipient query to jump-start search.",
      inputSchema: {
        type: "object",
        properties: { recipient: { type: "string" } },
      },
    },
  ],
  handlers: {
    async linkedin_jobs_search(args) {
      const url = jobsSearchUrl(args);
      await run("open", [url]);
      return text(`Opened LinkedIn jobs: ${url}`);
    },
    async linkedin_people_search(args) {
      const url = peopleSearchUrl(args);
      await run("open", [url]);
      return text(`Opened LinkedIn people search: ${url}`);
    },
    async linkedin_company_search(args) {
      const url = companySearchUrl(args);
      await run("open", [url]);
      return text(`Opened LinkedIn company search: ${url}`);
    },
    async linkedin_goto(args) {
      const url = sectionUrl(String(args.section ?? "feed"));
      await run("open", [url]);
      return text(`Opened ${url}`);
    },
    async linkedin_compose_post() {
      const url = "https://www.linkedin.com/feed/?shareActive=true&mini=true";
      await run("open", [url]);
      return text(
        "Opened LinkedIn post composer. Use paste_text next to drop in the draft.",
      );
    },
    async linkedin_messaging(args) {
      const base = "https://www.linkedin.com/messaging/";
      const url = args.recipient
        ? `${base}?searchQuery=${encodeURIComponent(String(args.recipient))}`
        : base;
      await run("open", [url]);
      return text(`Opened ${url}`);
    },
  },
};
