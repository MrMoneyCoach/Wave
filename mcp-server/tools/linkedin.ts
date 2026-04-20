import { text, ToolModule } from "./types.js";
import { openInBrowser } from "../browser.js";

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
    invitations: "/mynetwork/invitation-manager/",
    jobs: "/jobs/",
    job_alerts: "/jobs/tracker/saved-searches/",
    profile: "/in/me/",
    saved_jobs: "/my-items/saved-jobs/",
    my_posts: "/in/me/recent-activity/all/",
    analytics: "/me/analytics/",
  };
  return `https://www.linkedin.com${paths[section] ?? "/feed/"}`;
}

function peopleByCompanyUrl(args: any): string {
  const company = String(args.company ?? "");
  const title = args.title ? String(args.title) : "";
  const location = args.location ? String(args.location) : "";
  const kw = [title ? `"${title}"` : "", company ? `"${company}"` : ""].filter(Boolean).join(" ");
  const u = new URLSearchParams();
  u.set("keywords", kw);
  if (location) u.set("locationName", location);
  return `https://www.linkedin.com/search/results/people/?${u.toString()}`;
}

function alumniUrl(args: any): string {
  const school = String(args.school ?? "");
  const u = new URLSearchParams();
  u.set("keywords", `"${school}"`);
  if (args.title) u.set("title", String(args.title));
  if (args.location) u.set("locationName", String(args.location));
  return `https://www.linkedin.com/search/results/people/?${u.toString()}`;
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
        "Open a specific LinkedIn section in the user's browser. Sections: feed, messaging, notifications, mynetwork, invitations (pending connection requests), jobs, job_alerts, profile, saved_jobs, my_posts, analytics.",
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
              "invitations",
              "jobs",
              "job_alerts",
              "profile",
              "saved_jobs",
              "my_posts",
              "analytics",
            ],
          },
        },
        required: ["section"],
      },
    },
    {
      name: "linkedin_people_by_company",
      description:
        "Search LinkedIn for people at a specific company, optionally narrowed by title and location. Useful for recruiting, sales outreach, or warm intros.",
      inputSchema: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string", description: "e.g. 'Head of Engineering'" },
          location: { type: "string" },
        },
        required: ["company"],
      },
    },
    {
      name: "linkedin_alumni_search",
      description:
        "Search LinkedIn for alumni of a specific school (e.g. 'University of Cambridge'), optionally narrowed by title / location. Great for warm-intro hunts.",
      inputSchema: {
        type: "object",
        properties: {
          school: { type: "string" },
          title: { type: "string" },
          location: { type: "string" },
        },
        required: ["school"],
      },
    },
    {
      name: "linkedin_open_job",
      description:
        "Open a specific LinkedIn job posting by its numeric job ID (the last segment of a /jobs/view/<id> URL).",
      inputSchema: {
        type: "object",
        properties: { jobId: { type: "string" } },
        required: ["jobId"],
      },
    },
    {
      name: "linkedin_open_profile",
      description:
        "Open a LinkedIn profile by vanity handle ('satyanadella') or full URL. Use after a people search when you've chosen someone specific.",
      inputSchema: {
        type: "object",
        properties: {
          handleOrUrl: {
            type: "string",
            description: "Either a vanity slug or a full linkedin.com profile URL.",
          },
        },
        required: ["handleOrUrl"],
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
      await openInBrowser(url);
      return text(`Opened LinkedIn jobs: ${url}`);
    },
    async linkedin_people_search(args) {
      const url = peopleSearchUrl(args);
      await openInBrowser(url);
      return text(`Opened LinkedIn people search: ${url}`);
    },
    async linkedin_company_search(args) {
      const url = companySearchUrl(args);
      await openInBrowser(url);
      return text(`Opened LinkedIn company search: ${url}`);
    },
    async linkedin_goto(args) {
      const url = sectionUrl(String(args.section ?? "feed"));
      await openInBrowser(url);
      return text(`Opened ${url}`);
    },
    async linkedin_compose_post() {
      const url = "https://www.linkedin.com/feed/?shareActive=true&mini=true";
      await openInBrowser(url);
      return text(
        "Opened LinkedIn post composer. Use paste_text next to drop in the draft.",
      );
    },
    async linkedin_messaging(args) {
      const base = "https://www.linkedin.com/messaging/";
      const url = args.recipient
        ? `${base}?searchQuery=${encodeURIComponent(String(args.recipient))}`
        : base;
      await openInBrowser(url);
      return text(`Opened ${url}`);
    },
    async linkedin_people_by_company(args) {
      const url = peopleByCompanyUrl(args);
      await openInBrowser(url);
      return text(`Opened LinkedIn people search: ${url}`);
    },
    async linkedin_alumni_search(args) {
      const url = alumniUrl(args);
      await openInBrowser(url);
      return text(`Opened LinkedIn alumni search: ${url}`);
    },
    async linkedin_open_job(args) {
      const id = String(args.jobId ?? "").replace(/[^0-9]/g, "");
      if (!id) return text("jobId must be numeric.", true);
      const url = `https://www.linkedin.com/jobs/view/${id}/`;
      await openInBrowser(url);
      return text(`Opened ${url}`);
    },
    async linkedin_open_profile(args) {
      const raw = String(args.handleOrUrl ?? "").trim();
      if (!raw) return text("handleOrUrl required.", true);
      const url = /^https?:\/\//i.test(raw)
        ? raw
        : `https://www.linkedin.com/in/${raw.replace(/^\/+|\/+$/g, "")}/`;
      await openInBrowser(url);
      return text(`Opened ${url}`);
    },
  },
};
