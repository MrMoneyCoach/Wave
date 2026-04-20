/**
 * In-app installer for Claude Code. Runs `npm install` into a user-owned
 * prefix (~/.npm-global) — avoiding EACCES on /usr/local/lib — then runs
 * `claude login`. Everything streams to the renderer over IPC; no Terminal
 * window ever opens.
 */
import { spawn } from "child_process";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { BrowserWindow } from "electron";
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

export async function runInstall(win: BrowserWindow | null): Promise<void> {
  if (running) return;
  running = true;
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
    child.on("close", (code) => {
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
      emit(win, "login", "");
      emit(
        win,
        "login",
        "Now signing you in. A browser tab will open — log in with your Claude Max account, then come back here.",
      );
      emitState(win, { phase: "login", running: true });

      const login = spawn(found.bin, ["login"], { env });
      login.stdout.on("data", (b: Buffer) => emit(win, "login", b.toString("utf8")));
      login.stderr.on("data", (b: Buffer) => emit(win, "login", b.toString("utf8")));
      login.on("error", (err) => {
        emit(win, "error", `claude login failed to start: ${err.message}`);
        emitState(win, { phase: "error", running: false, success: false, error: err.message });
        running = false;
        resolve();
      });
      login.on("close", (loginCode) => {
        if (loginCode !== 0) {
          emit(
            win,
            "error",
            `claude login exited with code ${loginCode}. You may need to finish signing in in your browser and then click Recheck.`,
          );
          emitState(win, {
            phase: "error",
            running: false,
            success: false,
            error: `login exit ${loginCode}`,
          });
        } else {
          emit(win, "done", "All done. You can close this panel and start chatting.");
          emitState(win, { phase: "done", running: false, success: true });
        }
        running = false;
        resolve();
      });
    });
  });
}
