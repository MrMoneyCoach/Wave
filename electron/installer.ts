/**
 * In-app installer for Claude Code. Runs `npm install` into a user-owned
 * prefix (~/.npm-global) — avoiding EACCES on /usr/local/lib — then runs
 * `claude auth login --claudeai` to start the OAuth flow. Everything
 * streams to the renderer over IPC; no Terminal window ever opens.
 */
import { spawn, ChildProcess } from "child_process";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { BrowserWindow, shell } from "electron";
import { claudeEnv, resetClaudePath, resolveClaudePath, setOverride } from "./claude-path";

type Phase = "npm" | "login" | "done" | "error";

function emit(win: BrowserWindow | null, phase: Phase, line: string) {
  try {
    win?.webContents.send("installer:log", { phase, line });
  } catch {}
}

function emitState(
  win: BrowserWindow | null,
  state: { phase: Phase; running: boolean; success?: boolean; error?: string },
) {
  try {
    win?.webContents.send("installer:state", state);
  } catch {}
}

function emitUrl(win: BrowserWindow | null, url: string) {
  try {
    win?.webContents.send("installer:url", { url });
  } catch {}
}

// Pull http(s) URLs out of a chunk of CLI output. `claude auth login`
// prints the OAuth URL as plain text ("If the browser didn't open, visit:
// https://claude.com/cai/oauth/authorize?...").
const URL_RE = /https?:\/\/[^\s"'<>]+/g;
const openedUrls = new Set<string>();
function extractAndOpenUrls(win: BrowserWindow | null, text: string) {
  const matches = text.match(URL_RE);
  if (!matches) return;
  for (const raw of matches) {
    const url = raw.replace(/[.,);\]]+$/, "");
    if (openedUrls.has(url)) continue;
    openedUrls.add(url);
    emitUrl(win, url);
    shell.openExternal(url).catch(() => {});
  }
}

let loginProcess: ChildProcess | null = null;

function shellPath(): string {
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    return execSync(`${shell} -ilc 'echo -n $PATH'`, {
      encoding: "utf8",
      timeout: 4000,
    }).trim();
  } catch {
    return "";
  }
}

function findNpm(): string | null {
  const candidates: string[] = [];
  const add = (p: string) => {
    if (p && !candidates.includes(p)) candidates.push(p);
  };

  ["/usr/local/bin", "/opt/homebrew/bin"].forEach((d) => add(path.join(d, "npm")));

  const nvmDir = path.join(os.homedir(), ".nvm/versions/node");
  if (fs.existsSync(nvmDir)) {
    try {
      for (const v of fs.readdirSync(nvmDir)) {
        add(path.join(nvmDir, v, "bin", "npm"));
      }
    } catch {}
  }

  for (const dir of shellPath().split(":")) {
    if (dir) add(path.join(dir, "npm"));
  }

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}

let running = false;

function prefixDir(): string {
  return path.join(os.homedir(), ".npm-global");
}

function prefixBinDir(): string {
  return path.join(prefixDir(), "bin");
}

function ensurePrefixDir() {
  const dir = prefixDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(prefixBinDir(), { recursive: true });
  } catch {}
}

/** Check whether claude already has a valid OAuth token. */
function isAlreadyLoggedIn(claudeBin: string, env: NodeJS.ProcessEnv): boolean {
  try {
    const out = execSync(`"${claudeBin}" auth status --json`, {
      env,
      encoding: "utf8",
      timeout: 5000,
    });
    return /"loggedIn"\s*:\s*true/.test(out);
  } catch {
    return false;
  }
}

/**
 * Run `claude auth login --claudeai`. The CLI:
 *   - prints "Opening browser to sign in…" followed by an OAuth URL,
 *   - attempts to open the browser itself,
 *   - polls Anthropic for auth completion (it does NOT read stdin),
 *   - exits 0 on success.
 * We parse the URL ourselves and also call shell.openExternal so
 * browser-opening works even from a GUI-launched Electron process
 * where the CLI's own `open` invocation may not.
 */
function startLogin(
  win: BrowserWindow | null,
  claudeBin: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  emit(win, "login", "");
  emit(
    win,
    "login",
    "Signing you in. A browser tab will open — log in with your Claude Max account. When you're done, this panel will close automatically.",
  );
  emitState(win, { phase: "login", running: true });
  openedUrls.clear();

  // Short-circuit if already authenticated.
  if (isAlreadyLoggedIn(claudeBin, env)) {
    emit(win, "done", "Already signed in.");
    emitState(win, { phase: "done", running: false, success: true });
    return Promise.resolve();
  }

  const args = ["auth", "login", "--claudeai"];
  emit(win, "login", `> ${claudeBin} ${args.join(" ")}`);

  return new Promise<void>((resolve) => {
    const login = spawn(claudeBin, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    loginProcess = login;

    let sawOutput = false;
    let finished = false;
    const finish = (success: boolean, errMsg?: string) => {
      if (finished) return;
      finished = true;
      if (success) {
        emit(win, "done", "Signed in. You can close this panel and start chatting.");
        emitState(win, { phase: "done", running: false, success: true });
      } else {
        emit(
          win,
          "error",
          errMsg ??
            "Login didn't complete. If the browser didn't open, click the URL above. If you already signed in, click Recheck.",
        );
        emitState(win, {
          phase: "error",
          running: false,
          success: false,
          error: errMsg ?? "login failed",
        });
      }
    };

    const silentTimer = setTimeout(() => {
      if (!sawOutput) {
        emit(
          win,
          "login",
          "(no output yet — this usually means the browser is opening. Hang tight.)",
        );
      }
    }, 6000);

    const handleOutput = (b: Buffer) => {
      sawOutput = true;
      const text = b.toString("utf8");
      if (text.trim()) emit(win, "login", text);
      extractAndOpenUrls(win, text);
    };

    login.stdout?.on("data", handleOutput);
    login.stderr?.on("data", handleOutput);
    login.on("error", (err) => {
      clearTimeout(silentTimer);
      loginProcess = null;
      finish(false, `claude failed to start: ${err.message}`);
      resolve();
    });
    login.on("close", (exitCode) => {
      clearTimeout(silentTimer);
      loginProcess = null;
      // Belt-and-braces: confirm auth status rather than trusting exit code alone.
      const ok = exitCode === 0 && isAlreadyLoggedIn(claudeBin, env);
      if (ok) {
        finish(true);
      } else {
        finish(
          false,
          exitCode === 0
            ? "claude exited 0 but auth status still shows logged out. Please try again."
            : `claude exited with code ${exitCode}.`,
        );
      }
      resolve();
    });
  });
}

/**
 * Run just the login flow. Used when claude is already installed but the
 * user needs to (re-)authenticate. Triggered by the Alfred → Sign in to
 * Claude… menu item.
 */
export async function runSignIn(win: BrowserWindow | null): Promise<void> {
  if (running) return;
  const found = resolveClaudePath();
  if (!found) {
    emit(
      win,
      "error",
      "claude isn't installed yet. Click 'Install for me' on the banner instead.",
    );
    emitState(win, {
      phase: "error",
      running: false,
      success: false,
      error: "claude binary missing",
    });
    return;
  }
  running = true;
  const env = {
    ...claudeEnv(),
    PATH: `${prefixBinDir()}:${claudeEnv().PATH || ""}`,
  };
  try {
    await startLogin(win, found.bin, env);
  } finally {
    running = false;
  }
}

export async function runInstall(win: BrowserWindow | null): Promise<void> {
  if (running) return;
  running = true;

  // If claude is already installed, skip npm entirely and just re-run login.
  const existing = resolveClaudePath();
  if (existing) {
    const env = {
      ...claudeEnv(),
      PATH: `${prefixBinDir()}:${claudeEnv().PATH || ""}`,
    };
    emit(win, "npm", `claude already installed at ${existing.bin} — skipping install.`);
    try {
      await startLogin(win, existing.bin, env);
    } finally {
      running = false;
    }
    return;
  }

  emitState(win, { phase: "npm", running: true });

  const npm = findNpm();
  if (!npm) {
    running = false;
    emit(
      win,
      "error",
      "Couldn't find npm. Please install Node.js from https://nodejs.org first, then quit Alfred and reopen it.",
    );
    emitState(win, {
      phase: "error",
      running: false,
      success: false,
      error: "npm not found — install Node.js first",
    });
    return;
  }

  ensurePrefixDir();
  const prefix = prefixDir();

  emit(win, "npm", `Using npm at ${npm}`);
  emit(win, "npm", `Installing into ${prefix} (no admin password needed)…`);
  emit(win, "npm", "");

  // Augment PATH with the prefix bin dir so the post-install binary is
  // immediately resolvable by every subsequent spawn (including claude login).
  const env = {
    ...claudeEnv(),
    PATH: `${prefixBinDir()}:${claudeEnv().PATH || ""}`,
  };

  await new Promise<void>((resolve) => {
    const child = spawn(
      npm,
      ["install", "-g", "--prefix", prefix, "@anthropic-ai/claude-code"],
      { env },
    );
    child.stdout.on("data", (b: Buffer) => emit(win, "npm", b.toString("utf8")));
    child.stderr.on("data", (b: Buffer) => emit(win, "npm", b.toString("utf8")));
    child.on("error", (err) => {
      emit(win, "error", `npm failed to start: ${err.message}`);
      emitState(win, { phase: "error", running: false, success: false, error: err.message });
      running = false;
      resolve();
    });
    child.on("close", async (code) => {
      if (code !== 0) {
        emit(
          win,
          "error",
          `npm install exited with code ${code}. If you see EACCES errors above, try the Locate manually button — you may already have claude installed somewhere else.`,
        );
        emitState(win, {
          phase: "error",
          running: false,
          success: false,
          error: `npm exit ${code}`,
        });
        running = false;
        resolve();
        return;
      }

      // After a successful prefix install, the binary is at
      // ~/.npm-global/bin/claude. Pin that via override so we never have to
      // probe again.
      const installedBin = path.join(prefixBinDir(), "claude");
      if (fs.existsSync(installedBin)) setOverride(installedBin);

      resetClaudePath();
      const found = resolveClaudePath();
      if (!found) {
        emit(
          win,
          "error",
          "npm reported success but Alfred still can't find the claude binary. Click 'Locate manually' on the banner to point Alfred at it.",
        );
        emitState(win, {
          phase: "error",
          running: false,
          success: false,
          error: "claude binary missing after install",
        });
        running = false;
        resolve();
        return;
      }

      emit(win, "npm", `claude installed at ${found.bin}`);
      await startLogin(win, found.bin, env);
      running = false;
      resolve();
    });
  });
}
