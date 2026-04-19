import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Project } from "./projects";

export const COMMANDER_ID = "__commander__";

/**
 * Commander is a pseudo-project that operates at the user's home level
 * and knows about every other project. Its CLAUDE.md is regenerated
 * whenever the project list changes, so Claude has up-to-date context
 * when the user asks cross-project questions like "catch me up on
 * everything" or "search LinkedIn for X".
 */
export function commanderDir(): string {
  const dir = path.join(app.getPath("home"), ".alfred", "commander");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function ensureCommanderProject(projects: Project[]): Project {
  const existing = projects.find((p) => p.id === COMMANDER_ID);
  const dir = commanderDir();
  writeClaudeMd(dir, projects);
  if (existing) {
    return { ...existing, path: dir };
  }
  return {
    id: COMMANDER_ID,
    name: "Alfred",
    path: dir,
    permissionMode: "safe",
  };
}

export function refreshCommanderContext(projects: Project[]): void {
  writeClaudeMd(commanderDir(), projects);
}

function writeClaudeMd(dir: string, projects: Project[]): void {
  const others = projects.filter((p) => p.id !== COMMANDER_ID);
  const home = os.homedir();
  const body = [
    "# Alfred — Commander",
    "",
    "You are Alfred, a personal executive assistant to the user. You orchestrate across all of the user's projects and can do general work on the web. The user is not a programmer — speak plainly and avoid jargon unless asked.",
    "",
    "## User's projects",
    "",
    others.length === 0
      ? "_(none configured yet — ask the user to set up projects in Alfred's sidebar)_"
      : others
          .map((p) => {
            const loc = p.path ? p.path.replace(home, "~") : "(folder not set)";
            return `- **${p.name}** — \`${loc}\``;
          })
          .join("\n"),
    "",
    "## How to handle requests",
    "",
    "- For cross-project questions (\"what's happening across everything?\", \"which projects have uncommitted changes?\"), iterate over the project paths above with Bash (cd + git status, git log, etc).",
    "- To work **inside** a specific project, `cd` there first, or suggest the user switch to that project's chat for deeper work.",
    "- For web searches (jobs, news, people, research), use the WebSearch and WebFetch tools. Summarize findings — don't just dump raw results.",
    "- For LinkedIn, Twitter, Gmail, or any site that requires login: explain that you can only see public pages for now. Offer the best alternative (public search, aggregator sites, etc).",
    "- When the user gives a voice command, keep the spoken response short and friendly (1-2 sentences). Put details in writing.",
    "",
    "## Style",
    "",
    "- Confident, concise, slightly British (you are Alfred, after all).",
    "- Lead with the answer, then details.",
    "- Never ask permission for read-only actions (searches, status checks). Ask before anything that changes files, sends messages, or spends money.",
  ].join("\n");
  fs.writeFileSync(path.join(dir, "CLAUDE.md"), body, "utf8");
}
