import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export type PermissionMode = "safe" | "autonomous";

export type Project = {
  id: string;
  name: string;
  path: string;
  permissionMode?: PermissionMode;
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
