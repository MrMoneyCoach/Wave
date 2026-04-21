import { contextBridge, ipcRenderer } from "electron";

export type PermissionMode = "safe" | "autonomous";

export type Project = {
  id: string;
  name: string;
  path: string;
  permissionMode?: PermissionMode;
};

export type MessageBlock =
  | { kind: "text"; text: string }
  | {
      kind: "tool_use";
      id: string;
      name: string;
      input: unknown;
      status?: "running" | "done" | "error";
    }
  | { kind: "tool_result"; toolUseId: string; content: string; isError?: boolean };

export interface ClaudeDiagnostic {
  electronPath: string;
  shellPath: string;
  shellWhich: string | null;
  override: string | null;
  dirs: Array<{ dir: string; exists: boolean; hasClaude: boolean }>;
  resolvedBin: string | null;
  version: string | null;
  shell: string;
  home: string;
}

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  blocks: MessageBlock[];
  createdAt: number;
  pending?: boolean;
};

type Unsub = () => void;

function on<T>(channel: string, cb: (payload: T) => void): Unsub {
  const handler = (_e: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

const api = {
  listProjects: () => ipcRenderer.invoke("projects:list") as Promise<Project[]>,
  saveProjects: (projects: Project[]) => ipcRenderer.invoke("projects:save", projects),
  pickFolder: () => ipcRenderer.invoke("projects:pickFolder") as Promise<string | null>,
  openFolder: (p: string) => ipcRenderer.invoke("projects:openFolder", p),
  checkClaude: () =>
    ipcRenderer.invoke("claude:check") as Promise<{ installed: boolean; version: string | null }>,
  diagnoseClaude: () => ipcRenderer.invoke("claude:diagnose") as Promise<ClaudeDiagnostic>,
  pickClaudeBinary: () =>
    ipcRenderer.invoke("claude:pickBinary") as Promise<
      { bin: string; installed: boolean; version: string | null } | null
    >,
  clearClaudeOverride: () => ipcRenderer.invoke("claude:clearOverride") as Promise<boolean>,
  installClaude: () => ipcRenderer.invoke("claude:install") as Promise<boolean>,
  signInToClaude: () => ipcRenderer.invoke("claude:signIn") as Promise<boolean>,
  submitLoginCode: (code: string) =>
    ipcRenderer.invoke("claude:submitLoginCode", code) as Promise<boolean>,
  onInstallerLog: (cb: (p: { phase: string; line: string }) => void) =>
    on<{ phase: string; line: string }>("installer:log", cb),
  onInstallerState: (
    cb: (p: { phase: string; running: boolean; success?: boolean; error?: string }) => void,
  ) => on<{ phase: string; running: boolean; success?: boolean; error?: string }>("installer:state", cb),
  onInstallerUrl: (cb: (p: { url: string }) => void) =>
    on<{ url: string }>("installer:url", cb),

  loadConversation: (projectId: string) =>
    ipcRenderer.invoke("convo:load", projectId) as Promise<StoredMessage[]>,
  saveConversation: (projectId: string, messages: StoredMessage[]) =>
    ipcRenderer.invoke("convo:save", projectId, messages),
  clearConversation: (projectId: string) =>
    ipcRenderer.invoke("convo:clear", projectId) as Promise<boolean>,

  sendMessage: (
    projectId: string,
    cwd: string,
    message: string,
    permissionMode: PermissionMode,
  ) => ipcRenderer.invoke("chat:send", { projectId, cwd, message, permissionMode }),
  stopMessage: (projectId: string) => ipcRenderer.invoke("chat:stop", projectId),
  resetChat: (projectId: string) => ipcRenderer.invoke("chat:reset", projectId),

  onText: (cb: (p: { projectId: string; text: string }) => void) =>
    on<{ projectId: string; text: string }>("chat:text", cb),
  onToolUse: (cb: (p: { projectId: string; id: string; name: string; input: unknown }) => void) =>
    on("chat:tool_use", cb),
  onToolResult: (
    cb: (p: { projectId: string; toolUseId: string; content: string; isError?: boolean }) => void,
  ) => on("chat:tool_result", cb),
  onStatus: (cb: (p: { projectId: string; status: string }) => void) => on("chat:status", cb),
  onDone: (cb: (p: { projectId: string }) => void) => on("chat:done", cb),
  onError: (cb: (p: { projectId: string; error: string }) => void) => on("chat:error", cb),

  onMenu: (event: string, cb: (arg?: unknown) => void) =>
    on<unknown>(`menu:${event}`, cb),

  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdateReady: (cb: () => void) => on<unknown>("update:ready", () => cb()),
};

contextBridge.exposeInMainWorld("alfred", api);

export type AlfredApi = typeof api;
