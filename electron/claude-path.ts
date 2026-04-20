/**
 * Resolve the full path to the `claude` CLI binary.
 *
 * GUI Electron apps launched from Launchpad inherit a stripped-down PATH
 * (typically just /usr/bin:/bin:/usr/sbin:/sbin). They do not see anything
 * added by the user's shell rc files — which is where nvm, fnm, volta, and
 * custom npm prefixes (~/.npm-global, etc.) live. This module runs the
 * user's login shell once on startup to recover the real PATH, then probes
 * common install locations as fallback.
 *
 * The resolved absolute path is cached and used for both the startup
 * "is Claude installed?" check and every ClaudeSession spawn.
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let cached: { bin: string; path: string; version: string | null } | null = null;

const EXTRA_DIRS = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  path.join(os.homedir(), ".npm-global/bin"),
  path.join(os.homedir(), ".volta/bin"),
  path.join(os.homedir(), ".fnm/aliases/default/bin"),
  path.join(os.homedir(), ".bun/bin"),
  "/usr/bin",
];

function shellPath(): string {
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    const out = execSync(`${shell} -ilc 'echo -n $PATH'`, {
      encoding: "utf8",
      timeout: 4000,
    });
    return out.trim();
  } catch {
    return "";
  }
}

function nvmCandidates(): string[] {
  const nvmDir = path.join(os.homedir(), ".nvm/versions/node");
  if (!fs.existsSync(nvmDir)) return [];
  try {
    return fs
      .readdirSync(nvmDir)
      .map((v) => path.join(nvmDir, v, "bin"))
      .filter((d) => {
        try {
          return fs.statSync(d).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

function findClaudeInDir(dir: string): string | null {
  const bin = path.join(dir, "claude");
  try {
    const s = fs.statSync(bin);
    if (s.isFile() || s.isSymbolicLink()) return bin;
  } catch {}
  return null;
}

function buildSearchPath(): { dirs: string[]; joined: string } {
  const dirs: string[] = [];
  const add = (d: string) => {
    if (d && !dirs.includes(d)) dirs.push(d);
  };
  (process.env.PATH || "").split(":").forEach(add);
  shellPath().split(":").forEach(add);
  EXTRA_DIRS.forEach(add);
  nvmCandidates().forEach(add);
  return { dirs, joined: dirs.filter(Boolean).join(":") };
}

/**
 * @returns absolute path to the claude binary, or null if not found.
 * Result is cached; call `resetClaudePath()` to force a re-probe.
 */
export function resolveClaudePath(): { bin: string; path: string; version: string | null } | null {
  if (cached) return cached;

  const { dirs, joined } = buildSearchPath();

  let bin: string | null = null;
  for (const d of dirs) {
    const hit = findClaudeInDir(d);
    if (hit) {
      bin = hit;
      break;
    }
  }

  if (!bin) return null;

  let version: string | null = null;
  try {
    version = execSync(`"${bin}" --version`, {
      encoding: "utf8",
      env: { ...process.env, PATH: joined },
      timeout: 5000,
    }).trim();
  } catch {
    // Binary exists but failed to run — still report it as found so the
    // spawn path gets the same hint. The user will see errors from the
    // session instead of a generic "not installed" banner.
  }

  cached = { bin, path: joined, version };
  return cached;
}

export function resetClaudePath() {
  cached = null;
}

/**
 * Environment to use when spawning the claude CLI. Augments PATH with
 * every dir we considered so child lookups of node/npm also succeed.
 */
export function claudeEnv(): NodeJS.ProcessEnv {
  const resolved = resolveClaudePath();
  const augmented = resolved?.path || buildSearchPath().joined;
  return { ...process.env, PATH: augmented };
}
