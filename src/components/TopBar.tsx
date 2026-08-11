import { useRepo } from "../state/repo";
import { BranchSwitcher } from "./BranchSwitcher";

interface TopBarProps {
  onOpenGuide: () => void;
}

export function TopBar({ onOpenGuide }: TopBarProps) {
  const { repoPath, status, pickAndOpenRepo, push, pull, busy } = useRepo();

  return (
    <>
      <header className="header">
        <span className="app-name">easy-git</span>
        <button type="button" className="guide-button" onClick={onOpenGuide}>
          Guide
        </button>
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <button type="button" onClick={pickAndOpenRepo} disabled={busy}>
            Open Folder
          </button>
          {repoPath && (
            <span className="repo-path" title={repoPath}>
              {repoPath}
            </span>
          )}
        </div>

        {repoPath && (
          <div className="toolbar-right">
            <BranchSwitcher />
            <button type="button" onClick={() => pull()} disabled={busy}>
              Pull{status && status.behind > 0 ? ` (${status.behind})` : ""}
            </button>
            <button type="button" onClick={() => push()} disabled={busy}>
              Push{status && status.ahead > 0 ? ` (${status.ahead})` : ""}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
