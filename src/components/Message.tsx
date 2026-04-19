import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import type { ChatMessage, MessageBlock } from "../types";

type Props = {
  message: ChatMessage;
};

export function Message({ message }: Props) {
  return (
    <div className={`msg ${message.role}`}>
      <div className="msg-role">{message.role === "user" ? "You" : "Alfred"}</div>
      <div className="msg-body">
        {message.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
        {message.pending && message.blocks.length === 0 && <TypingDots />}
      </div>
    </div>
  );
}

function Block({ block }: { block: MessageBlock }) {
  if (block.kind === "text") {
    if (!block.text.trim()) return null;
    return (
      <div className="msg-text">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {block.text}
        </ReactMarkdown>
      </div>
    );
  }
  if (block.kind === "tool_use") {
    return <ToolCard block={block} />;
  }
  return null;
}

function ToolCard({ block }: { block: Extract<MessageBlock, { kind: "tool_use" }> }) {
  const [open, setOpen] = useState(false);
  const summary = describeTool(block.name, block.input);
  return (
    <div className={`tool ${block.status ?? "running"}`}>
      <button className="tool-head" onClick={() => setOpen(!open)}>
        <span className="tool-icon">{toolIcon(block.name)}</span>
        <span className="tool-name">{block.name}</span>
        <span className="tool-summary">{summary}</span>
        <span className="tool-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <pre className="tool-input">
          {typeof block.input === "string" ? block.input : JSON.stringify(block.input, null, 2)}
        </pre>
      )}
    </div>
  );
}

function describeTool(name: string, input: unknown): string {
  const inp = (input as Record<string, unknown>) ?? {};
  switch (name) {
    case "Read":
      return (inp.file_path as string) ?? "";
    case "Edit":
    case "Write":
      return (inp.file_path as string) ?? "";
    case "Bash":
      return ((inp.command as string) ?? "").slice(0, 80);
    case "Glob":
      return (inp.pattern as string) ?? "";
    case "Grep":
      return (inp.pattern as string) ?? "";
    case "TodoWrite":
      return "updating todos";
    case "WebFetch":
      return (inp.url as string) ?? "";
    case "WebSearch":
      return (inp.query as string) ?? "";
    default:
      return Object.values(inp)[0] ? String(Object.values(inp)[0]).slice(0, 80) : "";
  }
}

function toolIcon(name: string): string {
  switch (name) {
    case "Read": return "📖";
    case "Write": return "📝";
    case "Edit": return "✏️";
    case "Bash": return "⌨";
    case "Glob": return "🔍";
    case "Grep": return "🔎";
    case "TodoWrite": return "✓";
    case "WebFetch": return "🌐";
    case "WebSearch": return "🌐";
    default: return "⚙";
  }
}

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  async function copy() {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="code-wrap">
      <button className="code-copy" onClick={copy}>
        {copied ? "copied" : "copy"}
      </button>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="typing">
      <span /><span /><span />
    </div>
  );
}
