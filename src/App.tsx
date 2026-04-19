import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { ClaudeBanner } from "./components/ClaudeBanner";
import type { Project } from "./types";

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    window.alfred.listProjects().then((ps) => {
      setProjects(ps);
      if (ps.length > 0) setActiveId(ps[0].id);
    });
    window.alfred.checkClaude().then((r) => setClaudeInstalled(r.installed));
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
          <Chat project={active} onUpdateProject={(p) => {
            updateProjects(projects.map((x) => (x.id === p.id ? p : x)));
          }} />
        ) : (
          <div className="empty">Add a project to get started.</div>
        )}
      </main>
    </div>
  );
}
