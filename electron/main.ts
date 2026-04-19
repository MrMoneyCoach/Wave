import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification } from "electron";
import * as path from "path";
import * as fs from "fs";
import { ClaudeSession, PermissionMode } from "./claude";
import { loadProjects, saveProjects, Project } from "./projects";
import * as convo from "./conversations";

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

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: "Alfred",
          submenu: [
            { role: "about" as const },
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

app.whenReady().then(() => {
  createWindow();
  buildMenu();
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
  const res = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle("projects:openFolder", (_e, p: string) => {
  if (p && fs.existsSync(p)) shell.openPath(p);
  return true;
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
      new Notification({ title: "Alfred", body: `${session.projectId} response ready` }).show();
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
      session = new ClaudeSession(projectId, cwd, permissionMode);
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
