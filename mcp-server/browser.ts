import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

/**
 * Open a URL in the user's browser. Prefers Google Chrome (the user runs
 * Chrome over Safari); falls back to the system default browser if Chrome
 * isn't installed.
 */
export async function openInBrowser(url: string): Promise<void> {
  try {
    await run("open", ["-a", "Google Chrome", url]);
    return;
  } catch {
    /* Chrome not installed — fall through. */
  }
  await run("open", [url]);
}
