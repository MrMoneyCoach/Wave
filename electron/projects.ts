import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export type Project = {
  id: string;
  name: string;
  path: string;
};

function storePath(): string {
  const dir = path.join(app.getPath("userData"));
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
    return parsed;
  } catch {
    return defaultProjects();
  }
}

export function saveProjects(projects: Project[]): void {
  fs.writeFileSync(storePath(), JSON.stringify(projects, null, 2), "utf8");
}

function defaultProjects(): Project[] {
  return [
    { id: "wave", name: "Wave", path: "" },
    { id: "claude-code", name: "Claude Code", path: "" },
    { id: "solomon", name: "Solomon", path: "" },
  ];
}
