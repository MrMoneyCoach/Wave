/**
 * Unified memory: a single markdown file at ~/.claude/CLAUDE.md that
 * Claude Code auto-reads as user-level memory in every session. Editing
 * this file from Alfred means preferences persist across every project
 * without having to repeat them.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function memoryPath(): string {
  return path.join(os.homedir(), ".claude", "CLAUDE.md");
}

function seed(): string {
  return [
    "# Alfred memory",
    "",
    "Shared preferences & context that apply to every project. Claude reads this",
    "automatically when starting a session from anywhere.",
    "",
    "## About me",
    "- (your name, role, anything worth remembering)",
    "",
    "## Tools I use",
    "- Browser: Chrome",
    "- Email: Microsoft Outlook",
    "- Documents: Microsoft Word",
    "- Spreadsheets: Microsoft Excel",
    "",
    "## How to speak to me",
    "- Be concise.",
    "- Prefer short confirmations over long explanations.",
    "",
  ].join("\n");
}

export function readMemory(): string {
  const p = memoryPath();
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return seed();
  }
}

export function writeMemory(content: string): void {
  const p = memoryPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}
