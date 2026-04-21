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
  path: string;
  name: string;
  lastModified: number;
  sessionCount: number;
  lastSessionId: string | null;
}

/**
 * Scan ~/.claude/projects/ for Claude Code projects the user already has
 * sessions for. Each subdirectory corresponds to a cwd; the exact path
 * comes from the `cwd` field in the first jsonl line (encoded dir names
 * aren't reliably decodable when paths contain hyphens).
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
      const files = fs
        .readdirSync(subDir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => ({
          name: f,
          full: path.join(subDir, f),
          mtime: (() => {
            try {
              return fs.statSync(path.join(subDir, f)).mtimeMs;
            } catch {
              return 0;
            }
          })(),
        }))
        .sort((a, b) => b.mtime - a.mtime);
      if (files.length === 0) continue;

      // Read first line of newest jsonl to get the real cwd.
      const firstLine = readFirstLine(files[0].full);
      if (!firstLine) continue;
      let cwd = "";
      try {
        const obj = JSON.parse(firstLine);
        if (typeof obj.cwd === "string") cwd = obj.cwd;
      } catch {}
      if (!cwd) continue;

      const sessionId = path.basename(files[0].name, ".jsonl");
      const name = path.basename(cwd) || cwd;
      results.push({
        path: cwd,
        name,
        lastModified: files[0].mtime,
        sessionCount: files.length,
        lastSessionId: sessionId,
      });
    } catch {
      // Skip unreadable subdirs silently.
    }
  }
  // Newest first.
  results.sort((a, b) => b.lastModified - a.lastModified);
  return results;
}

function readFirstLine(file: string): string | null {
  try {
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(8192);
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const text = buf.slice(0, bytes).toString("utf8");
    const nl = text.indexOf("\n");
    return nl > 0 ? text.slice(0, nl) : text;
  } catch {
    return null;
  }
}
