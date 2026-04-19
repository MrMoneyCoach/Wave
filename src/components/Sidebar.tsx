import { useState } from "react";
import type { Project } from "../types";

const COMMANDER_ID = "__commander__";

type Props = {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (next: Project[]) => void;
};

export function Sidebar({ projects, activeId, onSelect, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const commander = projects.find((p) => p.id === COMMANDER_ID);
  const others = projects.filter((p) => p.id !== COMMANDER_ID);

  async function addProject() {
    const name = newName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    const next = [...projects, { id, name, path: "", permissionMode: "safe" as const }];
    onUpdate(next);
    setNewName("");
    setAdding(false);
    onSelect(id);
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
          <button className="icon-btn" onClick={() => setAdding(!adding)} title="Add project">
            +
          </button>
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
                if (e.key === "Escape") setAdding(false);
              }}
            />
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

      <div className="sidebar-foot">Powered by Claude Code</div>
    </aside>
  );
}
