import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";

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

  constructor(public readonly projectId: string, public readonly cwd: string) {
    super();
  }

  send(message: string) {
    this.queue.push(message);
    this.drain();
  }

  kill() {
    this.queue = [];
    if (this.current) {
      try {
        this.current.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      this.current = null;
    }
    this.busy = false;
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

    const env = {
      ...process.env,
      PATH: `${process.env.PATH || ""}:/usr/local/bin:/opt/homebrew/bin`,
    };

    const child = spawn("claude", args, { cwd: this.cwd, env });
    this.current = child;

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
      this.drain();
    });

    child.on("close", (code) => {
      if (code !== 0 && stderrBuf) {
        this.emit("error", stderrBuf.trim() || `claude exited with code ${code}`);
      }
      this.emit("done");
      this.busy = false;
      this.current = null;
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

    // stream-json emits assistant messages as { type: "assistant", message: { content: [...] } }
    if (obj.type === "assistant" && obj.message?.content) {
      for (const block of obj.message.content) {
        if (block.type === "text" && typeof block.text === "string") {
          this.emit("delta", block.text);
        }
      }
    }
  }
}
