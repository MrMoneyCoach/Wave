import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { ClaudeBanner } from "./components/ClaudeBanner";
import { Avatar, AvatarState } from "./components/Avatar";
import type { Project } from "./types";
import { VoiceListener, isVoiceSupported, speak, cancelSpeech } from "./voice";

const COMMANDER_ID = "__commander__";

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null);
  const [signInRequested, setSignInRequested] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [interim, setInterim] = useState<string>("");
  const listenerRef = useRef<VoiceListener | null>(null);

  const projectsRef = useRef(projects);
  const activeIdRef = useRef(activeId);
  const voiceCommandRef = useRef<((text: string) => void) | null>(null);
  projectsRef.current = projects;
  activeIdRef.current = activeId;

  useEffect(() => {
    window.alfred.listProjects().then((ps) => {
      setProjects(ps);
      if (ps.length > 0) setActiveId(ps[0].id);
    });
    window.alfred.checkClaude().then((r) => setClaudeInstalled(r.installed));
    const off = window.alfred.onUpdateReady(() => setUpdateReady(true));
    return off;
  }, []);

  useEffect(() => {
    const off = [
      window.alfred.onMenu("select-project", (i) => {
        const idx = typeof i === "number" ? i : Number(i);
        // index 0..8 corresponds to non-commander projects
        const nonCommander = projectsRef.current.filter((p) => p.id !== COMMANDER_ID);
        const p = nonCommander[idx];
        if (p) setActiveId(p.id);
      }),
      window.alfred.onMenu("go-commander", () => setActiveId(COMMANDER_ID)),
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
      window.alfred.onMenu("toggle-voice", () => setVoiceEnabled((v) => !v)),
      window.alfred.onMenu("sign-in", () => {
        setSignInRequested(true);
        window.alfred.signInToClaude();
      }),
    ];
    return () => off.forEach((u) => u());
  }, []);

  // Start/stop the voice listener based on toggle.
  useEffect(() => {
    if (!voiceEnabled) {
      listenerRef.current?.stop();
      listenerRef.current = null;
      setAvatarState("idle");
      setInterim("");
      return;
    }
    if (!isVoiceSupported()) {
      alert("Voice isn't supported in this build.");
      setVoiceEnabled(false);
      return;
    }
    const listener = new VoiceListener({
      onCommand: (text) => {
        voiceCommandRef.current?.(text);
      },
      onState: (s) => {
        setAvatarState((prev) => {
          if (prev === "thinking" || prev === "speaking") return prev;
          if (s === "listening") return "listening";
          if (s === "heard") return "heard";
          if (s === "paused") return "idle";
          return "idle";
        });
      },
      onInterim: (t) => setInterim(t),
      onError: (e) => console.warn(e),
    });
    listener.start();
    listenerRef.current = listener;
    setAvatarState("listening");
    return () => {
      listener.stop();
    };
  }, [voiceEnabled]);

  async function updateProjects(next: Project[]) {
    setProjects(next);
    await window.alfred.saveProjects(next);
  }

  const speakReply = useCallback(
    (text: string) => {
      if (!voiceEnabled) return;
      listenerRef.current?.pause();
      setAvatarState("speaking");
      speak(text, {
        onEnd: () => {
          setAvatarState(voiceEnabled ? "listening" : "idle");
          listenerRef.current?.resume();
        },
      });
    },
    [voiceEnabled],
  );

  const handleThinking = useCallback((thinking: boolean) => {
    setAvatarState((prev) => {
      if (thinking) return "thinking";
      if (prev === "thinking") return voiceEnabled ? "listening" : "idle";
      return prev;
    });
  }, [voiceEnabled]);

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
        {(claudeInstalled === false || signInRequested) && (
          <ClaudeBanner
            mode={claudeInstalled === false ? "install" : "signin"}
            onRecheck={() =>
              window.alfred.checkClaude().then((r) => {
                setClaudeInstalled(r.installed);
                if (r.installed) setSignInRequested(false);
              })
            }
            onDismiss={() => setSignInRequested(false)}
          />
        )}
        {updateReady && (
          <div className="banner update">
            <strong>Update ready.</strong>
            <button
              className="link-btn"
              onClick={() => window.alfred.installUpdate()}
            >
              Restart to install
            </button>
          </div>
        )}
        {active ? (
          <Chat
            key={active.id}
            project={active}
            voiceEnabled={voiceEnabled}
            onUpdateProject={(p) => {
              updateProjects(projects.map((x) => (x.id === p.id ? p : x)));
            }}
            onVoiceCommand={(registerSender) => {
              voiceCommandRef.current = registerSender;
            }}
            onSpeak={speakReply}
            onThinking={handleThinking}
            onStopSpeaking={() => {
              cancelSpeech();
              setAvatarState(voiceEnabled ? "listening" : "idle");
              listenerRef.current?.resume();
            }}
          />
        ) : (
          <div className="empty">Add a project to get started.</div>
        )}

        <Avatar
          state={avatarState}
          voiceEnabled={voiceEnabled}
          interim={interim}
          onToggleVoice={() => setVoiceEnabled((v) => !v)}
        />
      </main>
    </div>
  );
}
