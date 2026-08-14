import { useState } from "react";
import { friendlyErrorMessage } from "./api/git";
import { RepoProvider, useRepo } from "./state/repo";
import { ThemeProvider } from "./state/theme";
import { TopBar } from "./components/TopBar";
import { Sidebar, type View } from "./components/Sidebar";
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

function ErrorBanner() {
  const { errorMessage, dismissError } = useRepo();
  if (!errorMessage) return null;
  const friendly = friendlyErrorMessage(errorMessage);
  return (
    <div className="error-banner">
      <div className="error-banner-text">
        {friendly && <strong>{friendly}</strong>}
        <span>{errorMessage}</span>
      </div>
      <button type="button" onClick={dismissError} aria-label="Dismiss">
        x
      </button>
    </div>
  );
}

function ConflictBanner() {
  const { status } = useRepo();
  if (!status?.has_conflicts) return null;
  return (
    <div className="conflict-banner">
      <span>This project has a conflict. Resolve it in your files, then check them here and save.</span>
    </div>
  );
}

function NotARepoBanner() {
  const { notARepoPath, initRepo, dismissNotARepo, busy } = useRepo();
  if (!notARepoPath) return null;
  return (
    <div className="not-a-repo-banner">
      <span>This isn't a Git project yet.</span>
      <div className="not-a-repo-actions">
        <button type="button" className="primary" onClick={initRepo} disabled={busy}>
          Start a Git Project
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
        <h1>Open a Project</h1>
        <p>Choose a folder that uses Git to get started.</p>
        <button type="button" className="primary" onClick={pickAndOpenRepo} disabled={busy}>
          Open Folder
        </button>
        <button type="button" className="welcome-guide" onClick={onOpenGuide}>
          Show me how it works
        </button>
      </div>
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
      <TopBar />
      <ErrorBanner />
      <NotARepoBanner />
      <ConflictBanner />
      {repoPath ? (
        <div className="body">
          <Sidebar
            view={view}
            onChangeView={setView}
            onOpenGuide={() => setGuideOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <div className="content">
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
          </div>
        </div>
      ) : (
        <Welcome onOpenGuide={() => setGuideOpen(true)} />
      )}
      {repoPath && <CommandLog />}
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
