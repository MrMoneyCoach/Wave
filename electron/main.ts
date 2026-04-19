import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import { ClaudeSession } from "./claude";
import { loadProjects, saveProjects, Project } from "./projects";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
const sessions = new Map<string, ClaudeSession>();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  for (const s of sessions.values()) s.kill();
  sessions.clear();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("projects:list", () => loadProjects());

ipcMain.handle("projects:save", (_e, projects: Project[]) => {
  saveProjects(projects);
  return true;
});

ipcMain.handle("projects:pickFolder", async () => {
  const res = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle("claude:check", () => {
  const { execSync } = require("child_process");
  try {
    const out = execSync("claude --version", {
      encoding: "utf8",
      env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` },
    });
    return { installed: true, version: out.trim() };
  } catch {
    return { installed: false, version: null };
  }
});

ipcMain.handle("chat:send", async (event, payload: { projectId: string; cwd: string; message: string }) => {
  const { projectId, cwd, message } = payload;

  if (!fs.existsSync(cwd)) {
    event.sender.send("chat:error", { projectId, error: `Folder not found: ${cwd}` });
    return { ok: false };
  }

  let session = sessions.get(projectId);
  if (!session) {
    session = new ClaudeSession(projectId, cwd);
    session.on("delta", (text) => event.sender.send("chat:delta", { projectId, text }));
    session.on("done", () => event.sender.send("chat:done", { projectId }));
    session.on("error", (err) => event.sender.send("chat:error", { projectId, error: err }));
    sessions.set(projectId, session);
  }

  session.send(message);
  return { ok: true };
});

ipcMain.handle("chat:reset", (_e, projectId: string) => {
  const s = sessions.get(projectId);
  if (s) {
    s.kill();
    sessions.delete(projectId);
  }
  return true;
});
