import { contextBridge, ipcRenderer } from "electron";

type Settings = {
  webUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  session?: unknown;
};

const api = {
  async readSettings(): Promise<Settings> {
    return await ipcRenderer.invoke("settings:read");
  },
  async writeSettings(next: Settings): Promise<true> {
    return await ipcRenderer.invoke("settings:write", next);
  },
  async clearSession(): Promise<true> {
    return await ipcRenderer.invoke("settings:clearSession");
  },
  openExternal(url: string) {
    ipcRenderer.invoke("shell:openExternal", url);
  },
  async platform(): Promise<{ platform: NodeJS.Platform; version: string }> {
    return await ipcRenderer.invoke("app:platform");
  },
};

contextBridge.exposeInMainWorld("recap", api);

export type RecapApi = typeof api;
