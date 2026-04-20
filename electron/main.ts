import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification } from "electron";
import * as path from "path";
import * as fs from "fs";
import { autoUpdater } from "electron-updater";
import { ClaudeSession, PermissionMode } from "./claude";
import { loadProjects, saveProjects, Project } from "./projects";
import * as convo from "./conversations";
import { ensureCommanderProject, refreshCommanderContext, COMMANDER_ID } from "./commander";
import { ensureMcpConfig } from "./mcp";
import { resolveClaudePath, resetClaudePath } from "./claude-path";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
const sessions = new Map<string, ClaudeSession>();

function withCommander(projects: Project[]): Project[] {
  const commander = ensureCommanderProject(projects);
  const rest = projects.filter((p) => p.id !== COMMANDER_ID);
  return [commander, ...rest];
}

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

  // Auto-allow microphone for voice input.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === "media") return callback(true);
    callback(false);
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

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: "Alfred",
          submenu: [
            { role: "about" as const },
            { type: "separator" as const },
            {
              label: "Check for Updates…",
              click: () => autoUpdater.checkForUpdates().catch(() => {}),
            },
            { type: "separator" as const },
            { role: "services" as const },
            { type: "separator" as const },
            { role: "hide" as const },
            { role: "hideOthers" as const },
            { role: "unhide" as const },
            { type: "separator" as const },
            { role: "quit" as const },
          ],
        }]
      : []),
    {
      label: "Project",
      submenu: [
        {
          label: "New Conversation",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("menu:new-conversation"),
        },
        {
          label: "Stop Response",
          accelerator: "CmdOrCtrl+.",
          click: () => mainWindow?.webContents.send("menu:stop"),
        },
        { type: "separator" },
        {
          label: "Toggle Voice",
          accelerator: "CmdOrCtrl+Shift+V",
          click: () => mainWindow?.webContents.send("menu:toggle-voice"),
        },
        { type: "separator" },
        {
          label: "Go to Alfred (Commander)",
          accelerator: "CmdOrCtrl+0",
          click: () => mainWindow?.webContents.send("menu:go-commander"),
        },
        {
          label: "Next Project",
          accelerator: "CmdOrCtrl+]",
          click: () => mainWindow?.webContents.send("menu:next-project"),
        },
        {
          label: "Previous Project",
          accelerator: "CmdOrCtrl+[",
          click: () => mainWindow?.webContents.send("menu:prev-project"),
        },
        { type: "separator" },
        ...Array.from({ length: 9 }, (_, i) => ({
          label: `Go to Project ${i + 1}`,
          accelerator: `CmdOrCtrl+${i + 1}`,
          click: () => mainWindow?.webContents.send("menu:select-project", i),
        })),
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: "Open User Data Folder",
          click: () => shell.openPath(app.getPath("userData")),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupAutoUpdate() {
  if (isDev) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update:ready");
  });
  autoUpdater.on("error", (err) => console.warn("auto-update", err.message));
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 60 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  setupAutoUpdate();
  // Seed commander CLAUDE.md with current projects.
  refreshCommanderContext(loadProjects());
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  for (const s of sessions.values()) s.kill();
  sessions.clear();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("projects:list", () => withCommander(loadProjects()));

ipcMain.handle("projects:save", (_e, projects: Project[]) => {
  const toStore = projects.filter((p) => p.id !== COMMANDER_ID);
  saveProjects(toStore);
  refreshCommanderContext(toStore);
  return true;
});

ipcMain.handle("projects:pickFolder", async () => {
  const res = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle("projects:openFolder", (_e, p: string) => {
  if (p && fs.existsSync(p)) shell.openPath(p);
  return true;
});

ipcMain.handle("claude:check", () => {
  resetClaudePath();
  const r = resolveClaudePath();
  if (!r) return { installed: false, version: null };
  return { installed: true, version: r.version ?? "ready" };
});

ipcMain.handle("convo:load", (_e, projectId: string) => convo.load(projectId));

ipcMain.handle("convo:save", (_e, projectId: string, messages: convo.StoredMessage[]) => {
  convo.save(projectId, messages);
  return true;
});

ipcMain.handle("convo:clear", (_e, projectId: string) => {
  convo.clear(projectId);
  return true;
});

function wireSession(session: ClaudeSession) {
  const send = (channel: string, payload: unknown) => {
    mainWindow?.webContents.send(channel, payload);
  };
  session.on("text", (text: string) =>
    send("chat:text", { projectId: session.projectId, text }),
  );
  session.on("tool_use", (t: { id: string; name: string; input: unknown }) =>
    send("chat:tool_use", { projectId: session.projectId, ...t }),
  );
  session.on("tool_result", (t: { toolUseId: string; content: string; isError?: boolean }) =>
    send("chat:tool_result", { projectId: session.projectId, ...t }),
  );
  session.on("status", (s: string) =>
    send("chat:status", { projectId: session.projectId, status: s }),
  );
  session.on("done", () => {
    send("chat:done", { projectId: session.projectId });
    if (mainWindow && !mainWindow.isFocused() && Notification.isSupported()) {
      new Notification({ title: "Alfred", body: "Response ready" }).show();
    }
  });
  session.on("error", (err: string) =>
    send("chat:error", { projectId: session.projectId, error: err }),
  );
}

ipcMain.handle(
  "chat:send",
  async (
    _e,
    payload: { projectId: string; cwd: string; message: string; permissionMode: PermissionMode },
  ) => {
    const { projectId, cwd, message, permissionMode } = payload;
    if (!fs.existsSync(cwd)) {
      mainWindow?.webContents.send("chat:error", {
        projectId,
        error: `Folder not found: ${cwd}`,
      });
      return { ok: false };
    }
    let session = sessions.get(projectId);
    if (!session) {
      session = new ClaudeSession(projectId, cwd, permissionMode, ensureMcpConfig());
      wireSession(session);
      sessions.set(projectId, session);
    } else {
      session.permissionMode = permissionMode;
    }
    session.send(message);
    return { ok: true };
  },
);

ipcMain.handle("chat:stop", (_e, projectId: string) => {
  sessions.get(projectId)?.stop();
  return true;
});

ipcMain.handle("chat:reset", (_e, projectId: string) => {
  const s = sessions.get(projectId);
  if (s) {
    s.kill();
    sessions.delete(projectId);
  }
  convo.clear(projectId);
  return true;
});

ipcMain.handle("update:install", () => {
  autoUpdater.quitAndInstall();
});
