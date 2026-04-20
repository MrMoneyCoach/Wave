import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";

export type PermissionMode = "safe" | "autonomous";

/**
 * Wraps the `claude` CLI for a single project. Uses --resume across messages
 * so multi-turn conversations persist. No API cost — authed via the user's
 * Claude Max subscription.
 */
export class ClaudeSession extends EventEmitter {
  private sessionId: string | null = null;
  private queue: string[] = [];
  private busy = false;
  private current: ChildProcessWithoutNullStreams | null = null;

  constructor(
    public readonly projectId: string,
    public readonly cwd: string,
    public permissionMode: PermissionMode = "safe",
    public mcpConfigPath: string | null = null,
  ) {
    super();
  }

  send(message: string) {
    this.queue.push(message);
    this.drain();
  }

  stop() {
    if (this.current) {
      try {
        this.current.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
  }

  kill() {
    this.queue = [];
    this.stop();
    this.current = null;
    this.busy = false;
  }

  resetConversation() {
    this.sessionId = null;
  }

  private drain() {
    if (this.busy) return;
    const next = this.queue.shift();
    if (!next) return;
    this.busy = true;
    this.runOnce(next);
  }

  private runOnce(message: string) {
    const args = ["-p", message, "--output-format", "stream-json", "--verbose"];
    if (this.sessionId) {
      args.push("--resume", this.sessionId);
    }
    if (this.permissionMode === "autonomous") {
      args.push("--dangerously-skip-permissions");
    }
    if (this.mcpConfigPath) {
      args.push("--mcp-config", this.mcpConfigPath);
      // Pre-allow Alfred's own tools so voice commands don't silently hang
      // on a CLI permission prompt the user can't see.
      args.push(
        "--allowedTools",
        [
          "mcp__alfred__open_url",
          "mcp__alfred__open_site_search",
          "mcp__alfred__find_files",
          "mcp__alfred__reveal_file",
          "mcp__alfred__open_file",
          "mcp__alfred__open_app",
          "mcp__alfred__calendar_create_event",
          "mcp__alfred__calendar_list_events",
          "mcp__alfred__reminder_create",
          "mcp__alfred__reminder_list",
          "mcp__alfred__note_create",
          "mcp__alfred__note_append",
          "mcp__alfred__clipboard_get",
          "mcp__alfred__clipboard_set",
          "mcp__alfred__paste_text",
        ].join(","),
      );
    }

    const env = {
      ...process.env,
      PATH: `${process.env.PATH || ""}:/usr/local/bin:/opt/homebrew/bin`,
    };

    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn("claude", args, { cwd: this.cwd, env });
    } catch (err) {
      this.emit("error", (err as Error).message);
      this.busy = false;
      this.drain();
      return;
    }
    this.current = child;
    this.emit("status", "working");

    let stdoutBuf = "";
    let stderrBuf = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString("utf8");
      let idx: number;
      while ((idx = stdoutBuf.indexOf("\n")) >= 0) {
        const line = stdoutBuf.slice(0, idx).trim();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (line) this.handleJsonLine(line);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      this.emit("error", err.message);
      this.busy = false;
      this.current = null;
      this.emit("status", "idle");
      this.drain();
    });

    child.on("close", (code) => {
      if (code !== 0 && code !== null && stderrBuf) {
        this.emit("error", stderrBuf.trim() || `claude exited with code ${code}`);
      }
      this.emit("done");
      this.busy = false;
      this.current = null;
      this.emit("status", "idle");
      this.drain();
    });
  }

  private handleJsonLine(line: string) {
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      return;
    }

    if (obj.session_id && !this.sessionId) {
      this.sessionId = obj.session_id;
    }

    if (obj.type === "assistant" && obj.message?.content) {
      for (const block of obj.message.content) {
        if (block.type === "text" && typeof block.text === "string") {
          this.emit("text", block.text);
        } else if (block.type === "tool_use") {
          this.emit("tool_use", { id: block.id, name: block.name, input: block.input });
        }
      }
    }

    if (obj.type === "user" && obj.message?.content) {
      for (const block of obj.message.content) {
        if (block.type === "tool_result") {
          const content = typeof block.content === "string"
            ? block.content
            : Array.isArray(block.content)
              ? block.content.map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join("")
              : "";
          this.emit("tool_result", {
            toolUseId: block.tool_use_id,
            content,
            isError: Boolean(block.is_error),
          });
        }
      }
    }

    if (obj.type === "result") {
      this.emit("result", { subtype: obj.subtype, durationMs: obj.duration_ms });
    }
  }
}
