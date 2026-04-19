import { useState } from "react";
import type { Project } from "../types";

type Props = {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (next: Project[]) => void;
};

export function Sidebar({ projects, activeId, onSelect, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  async function addProject() {
    const name = newName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    onUpdate([...projects, { id, name, path: "" }]);
    setNewName("");
    setAdding(false);
    onSelect(id);
  }

  function removeProject(id: string) {
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
          {projects.map((p) => (
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
