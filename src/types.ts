export type PermissionMode = "safe" | "autonomous";

export type Project = {
  id: string;
  name: string;
  path: string;
  permissionMode?: PermissionMode;
};

export type MessageBlock =
  | { kind: "text"; text: string }
  | { kind: "tool_use"; id: string; name: string; input: unknown; status?: "running" | "done" | "error" }
  | { kind: "tool_result"; toolUseId: string; content: string; isError?: boolean };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  blocks: MessageBlock[];
  createdAt: number;
  pending?: boolean;
};

export type SessionStatus = "idle" | "working";

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

export type AlfredApi = {
  listProjects: () => Promise<Project[]>;
  saveProjects: (projects: Project[]) => Promise<boolean>;
  pickFolder: () => Promise<string | null>;
  openFolder: (p: string) => Promise<boolean>;
  checkClaude: () => Promise<{ installed: boolean; version: string | null }>;
  diagnoseClaude: () => Promise<ClaudeDiagnostic>;
  pickClaudeBinary: () => Promise<
    { bin: string; installed: boolean; version: string | null } | null
  >;
  clearClaudeOverride: () => Promise<boolean>;
  installClaude: () => Promise<boolean>;
  signInToClaude: () => Promise<boolean>;
  onInstallerLog: (cb: (p: { phase: string; line: string }) => void) => () => void;
  onInstallerState: (
    cb: (p: { phase: string; running: boolean; success?: boolean; error?: string }) => void,
  ) => () => void;
  onInstallerUrl: (cb: (p: { url: string }) => void) => () => void;

  loadConversation: (projectId: string) => Promise<ChatMessage[]>;
  saveConversation: (projectId: string, messages: ChatMessage[]) => Promise<boolean>;
  clearConversation: (projectId: string) => Promise<boolean>;

  sendMessage: (
    projectId: string,
    cwd: string,
    message: string,
    permissionMode: PermissionMode,
  ) => Promise<{ ok: boolean }>;
  stopMessage: (projectId: string) => Promise<boolean>;
  resetChat: (projectId: string) => Promise<boolean>;

  onText: (cb: (p: { projectId: string; text: string }) => void) => () => void;
  onToolUse: (
    cb: (p: { projectId: string; id: string; name: string; input: unknown }) => void,
  ) => () => void;
  onToolResult: (
    cb: (p: { projectId: string; toolUseId: string; content: string; isError?: boolean }) => void,
  ) => () => void;
  onStatus: (cb: (p: { projectId: string; status: string }) => void) => () => void;
  onDone: (cb: (p: { projectId: string }) => void) => () => void;
  onError: (cb: (p: { projectId: string; error: string }) => void) => () => void;

  onMenu: (event: string, cb: (arg?: unknown) => void) => () => void;

  installUpdate: () => Promise<void>;
  onUpdateReady: (cb: () => void) => () => void;
};

declare global {
  interface Window {
    alfred: AlfredApi;
  }
}
