import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

/**
 * Run an AppleScript source string via osascript. Returns stdout.
 *
 * IMPORTANT: AppleScript source is passed via `-e`, never via a shell,
 * so callers must still make sure any user input is safely escaped into
 * the script with `asStringLiteral()`.
 */
export async function osascript(script: string): Promise<string> {
  const { stdout } = await run("osascript", ["-e", script], { maxBuffer: 4_000_000 });
  return stdout.trim();
}

/** Escape a JS string into an AppleScript string literal. */
export function asStringLiteral(s: string): string {
  // AppleScript literals: wrap in double quotes, escape backslash and quote.
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Turn an ISO 8601 string into an AppleScript `date` expression. */
export function asAppleScriptDate(iso: string, varName = "d"): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  const hh = dt.getHours();
  const mm = dt.getMinutes();
  return [
    `set ${varName} to (current date)`,
    `set year of ${varName} to ${y}`,
    `set month of ${varName} to ${m}`,
    `set day of ${varName} to ${d}`,
    `set hours of ${varName} to ${hh}`,
    `set minutes of ${varName} to ${mm}`,
    `set seconds of ${varName} to 0`,
  ].join("\n");
}
