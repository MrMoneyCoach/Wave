import { app, BrowserWindow, desktopCapturer, ipcMain, session, shell } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";

// Recap Recorder
// -----------------------------------------------------------------------------
// Minimal Electron app that lets a signed-in Recap user capture their meeting
// natively (system audio + mic) and upload the result to their account.
//
// Build-time configuration: WEB_URL is where the API lives, SUPABASE_URL /
// SUPABASE_ANON_KEY identify the backend. These are baked into the renderer via
// Vite's import.meta.env mechanism but we also expose them through preload so
// the renderer doesn't need a build-time .env if a user is running from source.

const DEV = process.env.RECAP_DEV === "1";

const SETTINGS_FILE = () => path.join(app.getPath("userData"), "settings.json");

type Settings = {
  webUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  /** Persisted Supabase session so the user stays signed in across launches. */
  session?: unknown;
};

function readSettings(): Settings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE(), "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(next: Settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE()), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(next, null, 2));
  } catch {
    // best-effort
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 420,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#f7f6f2",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Auto-grant the mic + screen-capture permissions we know we need.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === "media" || permission === "display-capture") return callback(true);
    callback(false);
  });

  // The key bit for native system-audio capture on macOS 13+ and Windows.
  // When the renderer calls getDisplayMedia, Electron normally pops a built-in
  // picker; we replace it with a programmatic choice of the primary screen so
  // the user only sees the OS-level screen-capture prompt (which on macOS uses
  // ScreenCaptureKit and includes audio).
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        fetchWindowIcons: false,
      });
      const screen = sources[0];
      if (!screen) return callback({});
      callback({
        video: screen,
        // `loopback` on Windows; on macOS Electron uses ScreenCaptureKit which
        // exposes system audio when the OS prompt is accepted.
        audio: "loopback",
      });
    } catch {
      callback({});
    }
  });

  if (DEV) {
    win.loadURL("http://localhost:5174");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ----- IPC handlers ----------------------------------------------------------

ipcMain.handle("settings:read", () => readSettings());
ipcMain.handle("settings:write", (_e, next: Settings) => {
  writeSettings({ ...readSettings(), ...next });
  return true;
});

ipcMain.handle("settings:clearSession", () => {
  const s = readSettings();
  delete s.session;
  writeSettings(s);
  return true;
});

ipcMain.handle("shell:openExternal", (_e, url: string) => {
  if (typeof url === "string" && /^https?:\/\//.test(url)) {
    shell.openExternal(url).catch(() => {});
  }
});

ipcMain.handle("app:platform", () => ({
  platform: process.platform,
  version: app.getVersion(),
}));
