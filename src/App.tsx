import { useState } from "react";
import { RepoProvider, useRepo } from "./state/repo";
import { TopBar } from "./components/TopBar";
import { FileList } from "./components/FileList";
import { DiffView } from "./components/DiffView";
import { CommitBox } from "./components/CommitBox";
import { CommandLog } from "./components/CommandLog";
import { Guide } from "./components/Guide";
import "./App.css";

const GUIDE_SEEN_KEY = "easy-git-guide-seen";

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

function AppShell() {
  const { repoPath } = useRepo();
  const [guideOpen, setGuideOpen] = useState(() => {
    return localStorage.getItem(GUIDE_SEEN_KEY) !== "true";
  });

  function closeGuide() {
    localStorage.setItem(GUIDE_SEEN_KEY, "true");
    setGuideOpen(false);
  }

  return (
    <div className="app">
      <TopBar onOpenGuide={() => setGuideOpen(true)} />
      <ErrorBanner />
      <NotARepoBanner />
      {repoPath ? (
        <>
          <div className="main-split">
            <FileList />
            <DiffView />
          </div>
          <CommitBox />
          <CommandLog />
        </>
      ) : (
        <Welcome onOpenGuide={() => setGuideOpen(true)} />
      )}
      <Guide open={guideOpen} onClose={closeGuide} />
    </div>
  );
}

function App() {
  return (
    <RepoProvider>
      <AppShell />
    </RepoProvider>
  );
}

export default App;
