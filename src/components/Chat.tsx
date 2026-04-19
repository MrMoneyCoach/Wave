import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Project } from "../types";

type Props = {
  project: Project;
  onUpdateProject: (p: Project) => void;
};

export function Chat({ project, onUpdateProject }: Props) {
  const [messagesByProject, setMessagesByProject] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = messagesByProject[project.id] ?? [];

  useEffect(() => {
    const offDelta = window.alfred.onDelta((projectId, text) => {
      setMessagesByProject((prev) => {
        const list = prev[projectId] ?? [];
        const last = list[list.length - 1];
        if (last && last.role === "assistant" && last.pending) {
          const updated = { ...last, text: last.text + text };
          return { ...prev, [projectId]: [...list.slice(0, -1), updated] };
        }
        const fresh: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text, pending: true };
        return { ...prev, [projectId]: [...list, fresh] };
      });
    });

    const offDone = window.alfred.onDone((projectId) => {
      setMessagesByProject((prev) => {
        const list = prev[projectId] ?? [];
        const last = list[list.length - 1];
        if (last && last.pending) {
          return { ...prev, [projectId]: [...list.slice(0, -1), { ...last, pending: false }] };
        }
        return prev;
      });
      setSending(false);
    });

    const offError = window.alfred.onError((projectId, error) => {
      setMessagesByProject((prev) => {
        const list = prev[projectId] ?? [];
        return {
          ...prev,
          [projectId]: [
            ...list,
            { id: crypto.randomUUID(), role: "assistant", text: `⚠️ ${error}` },
          ],
        };
      });
      setSending(false);
    });

    return () => {
      offDelta();
      offDone();
      offError();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.text]);

  async function pickFolder() {
    const folder = await window.alfred.pickFolder();
    if (folder) onUpdateProject({ ...project, path: folder });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (!project.path) {
      alert("Set this project's folder first.");
      return;
    }
    setInput("");
    setSending(true);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessagesByProject((prev) => ({
      ...prev,
      [project.id]: [...(prev[project.id] ?? []), userMsg],
    }));
    await window.alfred.sendMessage(project.id, project.path, text);
  }

  async function resetConversation() {
    await window.alfred.resetChat(project.id);
    setMessagesByProject((prev) => ({ ...prev, [project.id]: [] }));
  }

  return (
    <div className="chat">
      <header className="chat-head">
        <div>
          <div className="chat-title">{project.name}</div>
          <div className="chat-sub">
            {project.path ? (
              <code>{project.path}</code>
            ) : (
              <span className="warn">No folder set</span>
            )}
          </div>
        </div>
        <div className="chat-actions">
          <button onClick={pickFolder}>{project.path ? "Change folder" : "Set folder"}</button>
          <button onClick={resetConversation} disabled={messages.length === 0}>
            New conversation
          </button>
        </div>
      </header>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty">
            {project.path
              ? `Say hello to Alfred about ${project.name}.`
              : `Set a folder for ${project.name} to begin.`}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg-role">{m.role === "user" ? "You" : "Alfred"}</div>
            <div className="msg-text">{m.text || (m.pending ? "…" : "")}</div>
          </div>
        ))}
      </div>

      <div className="composer">
        <textarea
          placeholder={project.path ? "Message Alfred…" : "Set a folder to start chatting"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={!project.path || sending}
          rows={3}
        />
        <button className="send" onClick={send} disabled={!project.path || sending || !input.trim()}>
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
