import { contextBridge, ipcRenderer } from "electron";

export type Project = {
  id: string;
  name: string;
  path: string;
};

const api = {
  listProjects: () => ipcRenderer.invoke("projects:list") as Promise<Project[]>,
  saveProjects: (projects: Project[]) => ipcRenderer.invoke("projects:save", projects),
  pickFolder: () => ipcRenderer.invoke("projects:pickFolder") as Promise<string | null>,
  checkClaude: () =>
    ipcRenderer.invoke("claude:check") as Promise<{ installed: boolean; version: string | null }>,
  sendMessage: (projectId: string, cwd: string, message: string) =>
    ipcRenderer.invoke("chat:send", { projectId, cwd, message }),
  resetChat: (projectId: string) => ipcRenderer.invoke("chat:reset", projectId),
  onDelta: (cb: (projectId: string, text: string) => void) => {
    const handler = (_e: unknown, payload: { projectId: string; text: string }) =>
      cb(payload.projectId, payload.text);
    ipcRenderer.on("chat:delta", handler);
    return () => ipcRenderer.off("chat:delta", handler);
  },
  onDone: (cb: (projectId: string) => void) => {
    const handler = (_e: unknown, payload: { projectId: string }) => cb(payload.projectId);
    ipcRenderer.on("chat:done", handler);
    return () => ipcRenderer.off("chat:done", handler);
  },
  onError: (cb: (projectId: string, error: string) => void) => {
    const handler = (_e: unknown, payload: { projectId: string; error: string }) =>
      cb(payload.projectId, payload.error);
    ipcRenderer.on("chat:error", handler);
    return () => ipcRenderer.off("chat:error", handler);
  },
};

contextBridge.exposeInMainWorld("alfred", api);

export type AlfredApi = typeof api;
