import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, MessageBlock, PermissionMode, Project, SessionStatus } from "../types";
import { Message } from "./Message";
import { SLASH_COMMANDS, matchCommand } from "../slashCommands";

type Props = {
  project: Project;
  voiceEnabled: boolean;
  onUpdateProject: (p: Project) => void;
  onVoiceCommand: (register: (text: string) => void) => void;
  onSpeak: (text: string) => void;
  onThinking: (thinking: boolean) => void;
  onStopSpeaking: () => void;
};

export function Chat({
  project,
  voiceEnabled,
  onUpdateProject,
  onVoiceCommand,
  onSpeak,
  onThinking,
  onStopSpeaking,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const projectRef = useRef(project);
  projectRef.current = project;

  const permissionMode: PermissionMode = project.permissionMode ?? "safe";

  // Load persisted conversation on project change. Clear any stuck pending
  // flags (happens if the app was quit mid-response).
  useEffect(() => {
    let cancelled = false;
    window.alfred.loadConversation(project.id).then((msgs) => {
      if (!cancelled) {
        setMessages(msgs.map((m) => (m.pending ? { ...m, pending: false } : m)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  // Persist on change.
  useEffect(() => {
    if (messages.length === 0) return;
    const id = setTimeout(() => {
      window.alfred.saveConversation(project.id, messages).catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [project.id, messages]);

  // Wire IPC event streams once.
  useEffect(() => {
    const off = [
      window.alfred.onText(({ projectId, text }) => {
        if (projectId !== projectRef.current.id) return;
        setMessages((prev) => appendText(prev, text));
      }),
      window.alfred.onToolUse(({ projectId, id, name, input }) => {
        if (projectId !== projectRef.current.id) return;
        setMessages((prev) =>
          appendBlock(prev, { kind: "tool_use", id, name, input, status: "running" }),
        );
      }),
      window.alfred.onToolResult(({ projectId, toolUseId, isError }) => {
        if (projectId !== projectRef.current.id) return;
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            blocks: m.blocks.map((b) =>
              b.kind === "tool_use" && b.id === toolUseId
                ? { ...b, status: isError ? "error" : "done" }
                : b,
            ),
          })),
        );
      }),
      window.alfred.onStatus(({ projectId, status }) => {
        if (projectId !== projectRef.current.id) return;
        setStatus(status === "working" ? "working" : "idle");
      }),
      window.alfred.onDone(({ projectId }) => {
        if (projectId !== projectRef.current.id) return;
        setStatus("idle");
        onThinking(false);
        setMessages((prev) => {
          const updated = prev.map((m) => (m.pending ? { ...m, pending: false } : m));
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            const texts = last.blocks
              .filter((b): b is Extract<MessageBlock, { kind: "text" }> => b.kind === "text")
              .map((b) => b.text)
              .join(" ")
              .trim();
            if (texts) onSpeak(texts);
          }
          return updated;
        });
      }),
      window.alfred.onError(({ projectId, error }) => {
        if (projectId !== projectRef.current.id) return;
        setStatus("idle");
        onThinking(false);
        setMessages((prev) => [
          ...prev.map((m) => ({ ...m, pending: false })),
          {
            id: uuid(),
            role: "assistant",
            createdAt: Date.now(),
            blocks: [{ kind: "text", text: `⚠️ ${error}` }],
          },
        ]);
      }),
    ];
    return () => off.forEach((u) => u());
  }, [onSpeak, onThinking]);

  // Menu events.
  useEffect(() => {
    const off = [
      window.alfred.onMenu("new-conversation", () => resetConversation()),
      window.alfred.onMenu("stop", () => {
        stop();
        onStopSpeaking();
      }),
    ];
    return () => off.forEach((u) => u());
  }, []);

  // Voice command handler: when the wake word triggers, send as a message.
  useEffect(() => {
    onVoiceCommand((text: string) => {
      if (!text.trim()) return;
      send(text);
    });
  }, [onVoiceCommand, voiceEnabled, project.id, project.path, permissionMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function pickFolder() {
    const folder = await window.alfred.pickFolder();
    if (folder) onUpdateProject({ ...project, path: folder });
  }

  async function send(rawText?: string) {
    const text = (rawText ?? input).trim();
    if (!text || status === "working") return;
    if (!project.path) {
      alert("Set this project's folder first.");
      return;
    }

    const cmd = matchCommand(text);
    if (cmd && cmd.name === "/clear") {
      resetConversation();
      setInput("");
      return;
    }
    const payload = cmd
      ? cmd.expand(project.name) + text.slice(cmd.name.length).trim()
      : text;
    const displayText = cmd ? `${cmd.name} ${text.slice(cmd.name.length).trim()}`.trim() : text;

    setInput("");
    setPaletteOpen(false);
    setStatus("working");
    onThinking(true);

    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: "user",
        createdAt: Date.now(),
        blocks: [{ kind: "text", text: displayText }],
      },
      { id: uuid(), role: "assistant", createdAt: Date.now(), blocks: [], pending: true },
    ]);

    await window.alfred.sendMessage(project.id, project.path, payload, permissionMode);
  }

  function stop() {
    window.alfred.stopMessage(project.id);
    onThinking(false);
  }

  async function resetConversation() {
    await window.alfred.resetChat(project.id);
    setMessages([]);
    setStatus("idle");
    onThinking(false);
  }

  function togglePermissionMode() {
    onUpdateProject({
      ...project,
      permissionMode: permissionMode === "safe" ? "autonomous" : "safe",
    });
  }

  const filteredCommands = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const q = input.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.name.slice(1).toLowerCase().startsWith(q));
  }, [input]);

  return (
    <div className="chat">
      <header className="chat-head">
        <div>
          <div className="chat-title">{project.name}</div>
          <div className="chat-sub">
            {project.path ? (
              <button
                className="link-btn"
                onClick={() => window.alfred.openFolder(project.path)}
                title="Open in Finder"
              >
                <code>{project.path}</code>
              </button>
            ) : (
              <span className="warn">No folder set</span>
            )}
          </div>
        </div>
        <div className="chat-actions">
          <button
            onClick={togglePermissionMode}
            title={
              permissionMode === "safe"
                ? "Claude asks before risky actions"
                : "Claude acts without asking"
            }
            className={`mode-${permissionMode}`}
          >
            {permissionMode === "safe" ? "Safe mode" : "Autonomous"}
          </button>
          <button onClick={pickFolder}>{project.path ? "Change folder" : "Set folder"}</button>
          <button onClick={resetConversation} disabled={messages.length === 0 && status === "idle"}>
            New conversation
          </button>
        </div>
      </header>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && <EmptyState project={project} onPick={(q) => send(q)} />}
        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
        {status === "working" && <div className="working-hint">Alfred is working…</div>}
      </div>

      {paletteOpen && filteredCommands.length > 0 && (
        <div className="palette">
          {filteredCommands.map((c) => (
            <button
              key={c.name}
              className="palette-item"
              onClick={() => {
                setInput(c.name + " ");
                setPaletteOpen(false);
                taRef.current?.focus();
              }}
            >
              <span className="palette-name">{c.name}</span>
              <span className="palette-desc">{c.description}</span>
            </button>
          ))}
        </div>
      )}

      <div className="composer">
        <textarea
          ref={taRef}
          placeholder={
            project.path
              ? voiceEnabled
                ? 'Say "Alfred…" or type  (/ for commands)'
                : "Message Alfred…  (/ for commands)"
              : "Set a folder to start chatting"
          }
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setPaletteOpen(e.target.value.startsWith("/"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
            if (e.key === "Escape") setPaletteOpen(false);
          }}
          disabled={!project.path}
          rows={3}
        />
        {status === "working" ? (
          <button className="send stop" onClick={stop}>
            Stop
          </button>
        ) : (
          <button className="send" onClick={() => send()} disabled={!project.path || !input.trim()}>
            Send
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ project, onPick }: { project: Project; onPick: (q: string) => void }) {
  if (!project.path) {
    return (
      <div className="empty">
        <div className="empty-title">Set a folder for {project.name}</div>
        <div className="empty-sub">Point Alfred at the project folder on your disk.</div>
      </div>
    );
  }
  const suggestions =
    project.id === "__commander__"
      ? [
          "Senior Swift engineer roles in London, remote, posted this week",
          "Draft an Outlook email to Sam about Friday's lunch",
          "Make an Excel sheet tracking my expenses for the month",
          "Add a reminder to call mum tomorrow at 6pm",
          "What's on my calendar today?",
          "Open my LinkedIn messages",
        ]
      : ["/status", "/next", "What does this project do?", "Summarise recent work"];
  return (
    <div className="empty">
      <div className="empty-title">What should we do in {project.name}?</div>
      <div className="suggestions">
        {suggestions.map((s) => (
          <button key={s} className="suggestion" onClick={() => onPick(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function appendBlock(prev: ChatMessage[], block: MessageBlock): ChatMessage[] {
  const last = prev[prev.length - 1];
  if (last && last.role === "assistant" && last.pending) {
    return [...prev.slice(0, -1), { ...last, blocks: [...last.blocks, block] }];
  }
  return [
    ...prev,
    { id: uuid(), role: "assistant", createdAt: Date.now(), blocks: [block], pending: true },
  ];
}

function appendText(prev: ChatMessage[], text: string): ChatMessage[] {
  const last = prev[prev.length - 1];
  if (last && last.role === "assistant" && last.pending) {
    const lastBlock = last.blocks[last.blocks.length - 1];
    if (lastBlock && lastBlock.kind === "text") {
      const updatedBlocks = [
        ...last.blocks.slice(0, -1),
        { ...lastBlock, text: lastBlock.text + text },
      ];
      return [...prev.slice(0, -1), { ...last, blocks: updatedBlocks }];
    }
    return [...prev.slice(0, -1), { ...last, blocks: [...last.blocks, { kind: "text", text }] }];
  }
  return [
    ...prev,
    {
      id: uuid(),
      role: "assistant",
      createdAt: Date.now(),
      blocks: [{ kind: "text", text }],
      pending: true,
    },
  ];
}

function uuid(): string {
  return crypto.randomUUID();
}
