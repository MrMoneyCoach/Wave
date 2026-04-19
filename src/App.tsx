import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { ClaudeBanner } from "./components/ClaudeBanner";
import type { Project } from "./types";

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null);

  const projectsRef = useRef(projects);
  const activeIdRef = useRef(activeId);
  projectsRef.current = projects;
  activeIdRef.current = activeId;

  useEffect(() => {
    window.alfred.listProjects().then((ps) => {
      setProjects(ps);
      if (ps.length > 0) setActiveId(ps[0].id);
    });
    window.alfred.checkClaude().then((r) => setClaudeInstalled(r.installed));
  }, []);

  useEffect(() => {
    const off = [
      window.alfred.onMenu("select-project", (i) => {
        const idx = typeof i === "number" ? i : Number(i);
        const p = projectsRef.current[idx];
        if (p) setActiveId(p.id);
      }),
      window.alfred.onMenu("next-project", () => {
        const list = projectsRef.current;
        const cur = list.findIndex((p) => p.id === activeIdRef.current);
        if (list.length === 0) return;
        setActiveId(list[(cur + 1) % list.length].id);
      }),
      window.alfred.onMenu("prev-project", () => {
        const list = projectsRef.current;
        const cur = list.findIndex((p) => p.id === activeIdRef.current);
        if (list.length === 0) return;
        setActiveId(list[(cur - 1 + list.length) % list.length].id);
      }),
    ];
    return () => off.forEach((u) => u());
  }, []);

  async function updateProjects(next: Project[]) {
    setProjects(next);
    await window.alfred.saveProjects(next);
  }

  const active = projects.find((p) => p.id === activeId) ?? null;

  return (
    <div className="app">
      <Sidebar
        projects={projects}
        activeId={activeId}
        onSelect={setActiveId}
        onUpdate={updateProjects}
      />
      <main className="main">
        {claudeInstalled === false && <ClaudeBanner />}
        {active ? (
          <Chat
            key={active.id}
            project={active}
            onUpdateProject={(p) => {
              updateProjects(projects.map((x) => (x.id === p.id ? p : x)));
            }}
          />
        ) : (
          <div className="empty">Add a project to get started.</div>
        )}
      </main>
    </div>
  );
}
