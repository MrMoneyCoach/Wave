import { app } from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type PermissionMode = "safe" | "autonomous";

export type Project = {
  id: string;
  name: string;
  path: string;
  permissionMode?: PermissionMode;
  /** Last Claude Code session ID for this project, used with --resume. */
  lastSessionId?: string | null;
};

function storePath(): string {
  const dir = app.getPath("userData");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "projects.json");
}

export function loadProjects(): Project[] {
  const file = storePath();
  if (!fs.existsSync(file)) return defaultProjects();
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultProjects();
    return parsed.map(normalize);
  } catch {
    return defaultProjects();
  }
}

export function saveProjects(projects: Project[]): void {
  fs.writeFileSync(storePath(), JSON.stringify(projects.map(normalize), null, 2), "utf8");
}

function normalize(p: Project): Project {
  return { permissionMode: "safe", ...p };
}

function defaultProjects(): Project[] {
  return [
    { id: "wave", name: "Wave", path: "", permissionMode: "safe" },
    { id: "claude-code", name: "Claude Code", path: "", permissionMode: "safe" },
    { id: "solomon", name: "Solomon", path: "", permissionMode: "safe" },
  ];
}

export interface DiscoveredProject {
  /** Every chat is its own "project" — one per jsonl file. */
  sessionId: string;
  /** Absolute cwd the session was started in. */
  path: string;
  /** Short display title (first user message, truncated). */
  title: string;
  /** Folder name the session lives under, for grouping. */
  folder: string;
  lastModified: number;
}

/**
 * Scan ~/.claude/projects/ and return one entry per chat (jsonl file).
 * Each entry's title is the first user message, so users recognise their
 * past conversations instead of seeing N anonymous folders.
 */
export function discoverClaudeProjects(): DiscoveredProject[] {
  const dir = path.join(os.homedir(), ".claude", "projects");
  if (!fs.existsSync(dir)) return [];
  const results: DiscoveredProject[] = [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  for (const sub of entries) {
    const subDir = path.join(dir, sub);
    try {
      const stat = fs.statSync(subDir);
      if (!stat.isDirectory()) continue;
      const files = fs.readdirSync(subDir).filter((f) => f.endsWith(".jsonl"));
      for (const f of files) {
        const full = path.join(subDir, f);
        let mtime = 0;
        try {
          mtime = fs.statSync(full).mtimeMs;
        } catch {
          continue;
        }
        const meta = readSessionMeta(full);
        if (!meta.cwd) continue;
        results.push({
          sessionId: path.basename(f, ".jsonl"),
          path: meta.cwd,
          title: meta.firstUserText
            ? truncate(meta.firstUserText, 70)
            : path.basename(meta.cwd) || meta.cwd,
          folder: path.basename(meta.cwd) || meta.cwd,
          lastModified: mtime,
        });
      }
    } catch {
      // Skip unreadable subdirs silently.
    }
  }
  results.sort((a, b) => b.lastModified - a.lastModified);
  return results;
}

/** Read a jsonl header line for cwd, plus the first user message text. */
function readSessionMeta(file: string): { cwd: string; firstUserText: string | null } {
  let cwd = "";
  let firstUserText: string | null = null;
  try {
    // Read a generous chunk — enough to cover the metadata line plus the
    // first user message, without streaming the whole file.
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(64 * 1024);
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const text = buf.slice(0, bytes).toString("utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (!cwd && typeof obj.cwd === "string") cwd = obj.cwd;
      if (firstUserText) continue;
      const msg = obj.message;
      if (!msg || msg.role !== "user") continue;
      const content = msg.content;
      if (typeof content === "string") {
        firstUserText = content;
      } else if (Array.isArray(content)) {
        const textBlock = content.find(
          (b: any) => b && b.type === "text" && typeof b.text === "string",
        );
        if (textBlock) firstUserText = textBlock.text;
      }
      if (firstUserText) firstUserText = firstUserText.trim();
      if (cwd && firstUserText) break;
    }
  } catch {
    // fall through
  }
  return { cwd, firstUserText };
}

function truncate(s: string, n: number): string {
  const cleaned = s.replace(/\s+/g, " ").trim();
  return cleaned.length > n ? cleaned.slice(0, n - 1).trimEnd() + "…" : cleaned;
}
