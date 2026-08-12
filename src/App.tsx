import { useState } from "react";
import { RepoProvider, useRepo } from "./state/repo";
import { ThemeProvider } from "./state/theme";
import { TopBar } from "./components/TopBar";
import { FileList } from "./components/FileList";
import { DiffView } from "./components/DiffView";
import { CommitBox } from "./components/CommitBox";
import { CommandLog } from "./components/CommandLog";
import { Guide } from "./components/Guide";
import { Settings } from "./components/Settings";
import { History } from "./components/History";
import { Stash } from "./components/Stash";
import "./App.css";

const GUIDE_SEEN_KEY = "easy-git-guide-seen";

type View = "changes" | "history" | "stash";

function ErrorBanner() {
  const { errorMessage, dismissError } = useRepo();
  if (!errorMessage) return null;
  return (
    <div className="error-banner">
      <span>{errorMessage}</span>
      <button type="button" onClick={dismissError} aria-label="Dismiss">
        x
      </button>
    </div>
  );
}

function NotARepoBanner() {
  const { notARepoPath, initRepo, dismissNotARepo, busy } = useRepo();
  if (!notARepoPath) return null;
  return (
    <div className="not-a-repo-banner">
      <span>This folder is not a Git project yet.</span>
      <div className="not-a-repo-actions">
        <button type="button" onClick={initRepo} disabled={busy}>
          Start a Git project here
        </button>
        <button type="button" onClick={dismissNotARepo} aria-label="Dismiss">
          x
        </button>
      </div>
    </div>
  );
}

function Welcome({ onOpenGuide }: { onOpenGuide: () => void }) {
  const { pickAndOpenRepo, busy } = useRepo();
  return (
    <div className="welcome">
      <div className="welcome-card">
        <h1>Welcome to easy-git</h1>
        <p>Open a project folder to see what changed and save your work with buttons.</p>
        <button type="button" className="welcome-open" onClick={pickAndOpenRepo} disabled={busy}>
          Open Folder
        </button>
        <button type="button" className="welcome-guide" onClick={onOpenGuide}>
          Show me how it works
        </button>
      </div>
    </div>
  );
}

function ViewTabs({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const { changedFiles } = useRepo();
  return (
    <div className="view-tabs">
      <button
        type="button"
        className={view === "changes" ? "active" : ""}
        onClick={() => onChange("changes")}
      >
        Changes{changedFiles.length > 0 ? ` (${changedFiles.length})` : ""}
      </button>
      <button
        type="button"
        className={view === "history" ? "active" : ""}
        onClick={() => onChange("history")}
      >
        History
      </button>
      <button
        type="button"
        className={view === "stash" ? "active" : ""}
        onClick={() => onChange("stash")}
      >
        Stash
      </button>
    </div>
  );
}

function AppShell() {
  const { repoPath } = useRepo();
  const [view, setView] = useState<View>("changes");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => {
    return localStorage.getItem(GUIDE_SEEN_KEY) !== "true";
  });

  function closeGuide() {
    localStorage.setItem(GUIDE_SEEN_KEY, "true");
    setGuideOpen(false);
  }

  return (
    <div className="app">
      <TopBar onOpenGuide={() => setGuideOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      <ErrorBanner />
      <NotARepoBanner />
      {repoPath ? (
        <>
          <ViewTabs view={view} onChange={setView} />
          {view === "changes" && (
            <>
              <div className="main-split">
                <FileList />
                <DiffView />
              </div>
              <CommitBox />
            </>
          )}
          {view === "history" && <History />}
          {view === "stash" && <Stash />}
          <CommandLog />
        </>
      ) : (
        <Welcome onOpenGuide={() => setGuideOpen(true)} />
      )}
      <Guide open={guideOpen} onClose={closeGuide} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <RepoProvider>
        <AppShell />
      </RepoProvider>
    </ThemeProvider>
  );
}

export default App;
