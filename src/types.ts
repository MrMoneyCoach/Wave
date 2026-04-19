export type Project = {
  id: string;
  name: string;
  path: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
};

export type AlfredApi = {
  listProjects: () => Promise<Project[]>;
  saveProjects: (projects: Project[]) => Promise<boolean>;
  pickFolder: () => Promise<string | null>;
  checkClaude: () => Promise<{ installed: boolean; version: string | null }>;
  sendMessage: (projectId: string, cwd: string, message: string) => Promise<{ ok: boolean }>;
  resetChat: (projectId: string) => Promise<boolean>;
  onDelta: (cb: (projectId: string, text: string) => void) => () => void;
  onDone: (cb: (projectId: string) => void) => () => void;
  onError: (cb: (projectId: string, error: string) => void) => () => void;
};

declare global {
  interface Window {
    alfred: AlfredApi;
  }
}
