/**
 * In-app installer for Claude Code. Runs `npm install` into a user-owned
 * prefix (~/.npm-global) — avoiding EACCES on /usr/local/lib — then runs
 * `claude login`. Everything streams to the renderer over IPC; no Terminal
 * window ever opens.
 */
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
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

// Pull the first http(s) URL out of a chunk of CLI output. Claude's TUI
// prints the OAuth URL inline; regex catches it whether there's ANSI
// decoration around it or not (the URL itself is plain text).
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

// Strip ANSI escape sequences (SGR, cursor moves, OSC titles) so the log
// panel doesn't fill with garbage when we're driving the TUI.
const ANSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[=>]|\r(?!\n)/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

let loginProcess: ChildProcessWithoutNullStreams | null = null;

export function submitLoginCode(code: string): boolean {
  if (!loginProcess || !loginProcess.stdin.writable) return false;
  try {
    // \r is the Enter key under a pty (which is what we're using).
    loginProcess.stdin.write(code.trim() + "\r");
    return true;
  } catch {
    return false;
  }
}

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

function startLogin(
  win: BrowserWindow | null,
  claudeBin: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  emit(win, "login", "");
  emit(
    win,
    "login",
    "Launching Claude and signing you in. A browser tab will open shortly — log in with your Claude Max account, then paste the authorization code below.",
  );
  emitState(win, { phase: "login", running: true });
  openedUrls.clear();

  // `claude login` is NOT a real subcommand — OAuth login lives behind the
  // interactive /login slash command inside claude's TUI. So we launch
  // claude under a pty (via macOS `script`), then type /login into its
  // stdin as if the user had. Stdin stays open so the user can paste the
  // authorization code back through submitLoginCode().
  const isMac = process.platform === "darwin";
  let cmd: string;
  let args: string[];
  if (isMac) {
    cmd = "/usr/bin/script";
    args = ["-q", "/dev/null", claudeBin];
  } else {
    cmd = claudeBin;
    args = [];
  }
  emit(win, "login", `> ${cmd} ${args.join(" ")}`);

  return new Promise<void>((resolve) => {
    const login = spawn(cmd, args, {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    loginProcess = login;

    let sawOutput = false;
    let loggedIn = false;
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

    // After the TUI has started, type /login. The short delay gives the
    // app time to finish its startup render.
    const loginTimer = setTimeout(() => {
      try {
        login.stdin.write("/login\r");
      } catch {}
    }, 1500);

    const silentTimer = setTimeout(() => {
      if (!sawOutput) {
        emit(
          win,
          "login",
          "(no output yet — claude may be slow to start. If this hangs, click Close and try again.)",
        );
      }
    }, 8000);

    const handleOutput = (b: Buffer) => {
      sawOutput = true;
      const raw = b.toString("utf8");
      const clean = stripAnsi(raw);
      if (clean.trim()) emit(win, "login", clean);
      extractAndOpenUrls(win, raw);

      // Detect a successful login from the TUI output, then quit cleanly.
      if (!loggedIn && /(logged in|login successful|you are now logged in)/i.test(clean)) {
        loggedIn = true;
        setTimeout(() => {
          try {
            login.stdin.write("/quit\r");
          } catch {}
          setTimeout(() => {
            try {
              login.kill();
            } catch {}
          }, 1500);
        }, 300);
      }
    };

    login.stdout.on("data", handleOutput);
    login.stderr.on("data", handleOutput);
    login.on("error", (err) => {
      clearTimeout(loginTimer);
      clearTimeout(silentTimer);
      loginProcess = null;
      finish(false, `claude failed to start: ${err.message}`);
      resolve();
    });
    login.on("close", (exitCode) => {
      clearTimeout(loginTimer);
      clearTimeout(silentTimer);
      loginProcess = null;
      if (loggedIn || exitCode === 0) {
        finish(true);
      } else {
        finish(false, `claude exited with code ${exitCode}.`);
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
