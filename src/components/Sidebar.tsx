import { useState } from "react";
import type { Project, DiscoveredProject } from "../types";

const COMMANDER_ID = "__commander__";

type Props = {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (next: Project[]) => void;
  onOpenSettings: () => void;
};

export function Sidebar({ projects, activeId, onSelect, onUpdate, onOpenSettings }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredProject[] | null>(null);

  const commander = projects.find((p) => p.id === COMMANDER_ID);
  const others = projects.filter((p) => p.id !== COMMANDER_ID);

  async function addProject() {
    const name = newName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    const next = [
      ...projects,
      { id, name, path: newPath.trim(), permissionMode: "safe" as const },
    ];
    onUpdate(next);
    setNewName("");
    setNewPath("");
    setAdding(false);
    onSelect(id);
  }

  async function browseFolder() {
    const folder = await window.alfred.pickFolder();
    if (folder) {
      setNewPath(folder);
      if (!newName.trim()) {
        const base = folder.split("/").filter(Boolean).pop() ?? "";
        setNewName(base);
      }
    }
  }

  async function discover() {
    setDiscovering(true);
    try {
      const found = await window.alfred.discoverClaudeProjects();
      // Filter out sessions we've already imported.
      const existing = new Set(
        projects.map((p) => p.lastSessionId).filter((id): id is string => !!id),
      );
      setDiscovered(found.filter((d) => !existing.has(d.sessionId)));
    } finally {
      setDiscovering(false);
    }
  }

  function idFor(d: DiscoveredProject): string {
    // Stable ID tied to the actual session — safe to re-import same session
    // without duplicating.
    return `cc-${d.sessionId}`;
  }

  function importDiscovered(d: DiscoveredProject) {
    const id = idFor(d);
    if (projects.some((p) => p.id === id)) {
      onSelect(id);
      return;
    }
    const next: Project[] = [
      ...projects,
      {
        id,
        name: d.title,
        path: d.path,
        permissionMode: "safe",
        lastSessionId: d.sessionId,
      },
    ];
    onUpdate(next);
    setDiscovered((prev) => (prev ?? []).filter((x) => x.sessionId !== d.sessionId));
    onSelect(id);
  }

  function importAll(list: DiscoveredProject[]) {
    const existingIds = new Set(projects.map((p) => p.id));
    const added: Project[] = list
      .filter((d) => !existingIds.has(idFor(d)))
      .map((d) => ({
        id: idFor(d),
        name: d.title,
        path: d.path,
        permissionMode: "safe" as const,
        lastSessionId: d.sessionId,
      }));
    onUpdate([...projects, ...added]);
    setDiscovered([]);
  }

  function removeProject(id: string) {
    if (id === COMMANDER_ID) return;
    onUpdate(projects.filter((p) => p.id !== id));
    if (activeId === id && projects.length > 1) {
      const next = projects.find((p) => p.id !== id);
      if (next) onSelect(next.id);
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">A</span>
        <span className="brand-name">Alfred</span>
      </div>

      {commander && (
        <div className="commander">
          <button
            className={`commander-btn ${commander.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(commander.id)}
          >
            <span className="commander-dot" />
            <span className="commander-name">{commander.name}</span>
            <span className="commander-sub">across all projects</span>
          </button>
        </div>
      )}

      <div className="projects">
        <div className="projects-head">
          <span>Projects</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className="icon-btn"
              onClick={discover}
              title="Import Claude Code projects"
              disabled={discovering}
            >
              ⤓
            </button>
            <button className="icon-btn" onClick={() => setAdding(!adding)} title="Add project">
              +
            </button>
          </div>
        </div>

        {adding && (
          <div className="add-form">
            <input
              autoFocus
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addProject();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                  setNewPath("");
                }
              }}
            />
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              <input
                placeholder="Folder path or URL (optional)"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addProject();
                }}
                style={{ flex: 1 }}
              />
              <button className="icon-btn" onClick={browseFolder} title="Browse…">
                …
              </button>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              <button onClick={addProject} disabled={!newName.trim()}>
                Add
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                  setNewPath("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {discovered !== null && (
          <div className="discovered">
            <div className="discovered-head">
              <span>
                {discovered.length === 0
                  ? "No new chats found."
                  : `Found ${discovered.length} chat${discovered.length === 1 ? "" : "s"}:`}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {discovered.length > 0 && (
                  <button className="link-btn" onClick={() => importAll(discovered)}>
                    Import all
                  </button>
                )}
                <button className="link-btn" onClick={() => setDiscovered(null)}>
                  Close
                </button>
              </div>
            </div>
            {discovered.map((d) => (
              <div key={d.sessionId} className="discovered-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="p-name" title={d.title}>
                    {d.title}
                  </div>
                  <div className="discovered-meta">
                    {d.folder} · {formatRelative(d.lastModified)}
                  </div>
                </div>
                <button className="link-btn" onClick={() => importDiscovered(d)}>
                  Import
                </button>
              </div>
            ))}
          </div>
        )}

        <ul>
          {others.map((p) => (
            <li
              key={p.id}
              className={p.id === activeId ? "active" : ""}
              onClick={() => onSelect(p.id)}
            >
              <span className="p-name">{p.name}</span>
              {!p.path && <span className="p-warn" title="No folder set">●</span>}
              <button
                className="p-del"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(p.id);
                }}
                title="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-foot">
        <button className="link-btn" onClick={onOpenSettings}>
          ⚙ Settings
        </button>
      </div>
    </aside>
  );
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.round(diff / min)}m ago`;
  if (diff < day) return `${Math.round(diff / hr)}h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(ms).toLocaleDateString();
}
