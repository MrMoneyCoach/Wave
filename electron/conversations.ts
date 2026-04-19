import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export type MessageBlock =
  | { kind: "text"; text: string }
  | {
      kind: "tool_use";
      id: string;
      name: string;
      input: unknown;
      status?: "running" | "done" | "error";
    }
  | { kind: "tool_result"; toolUseId: string; content: string; isError?: boolean };

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  blocks: MessageBlock[];
  createdAt: number;
  pending?: boolean;
};

function dir(): string {
  const d = path.join(app.getPath("userData"), "conversations");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function file(projectId: string): string {
  const safe = projectId.replace(/[^a-z0-9_-]/gi, "_");
  return path.join(dir(), `${safe}.json`);
}

export function load(projectId: string): StoredMessage[] {
  const f = file(projectId);
  if (!fs.existsSync(f)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

export function save(projectId: string, messages: StoredMessage[]): void {
  fs.writeFileSync(file(projectId), JSON.stringify(messages, null, 2), "utf8");
}

export function clear(projectId: string): void {
  const f = file(projectId);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}
