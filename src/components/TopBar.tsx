import { useRepo } from "../state/repo";
import { BranchSwitcher } from "./BranchSwitcher";
import { RemoteStatus } from "./RemoteStatus";

interface TopBarProps {
  onOpenGuide: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ onOpenGuide, onOpenSettings }: TopBarProps) {
  const { repoPath, status, pickAndOpenRepo, push, pull, busy } = useRepo();

  return (
    <>
      <header className="header">
        <span className="app-name">easy-git</span>
        <div className="header-actions">
          <button type="button" className="header-button" onClick={onOpenGuide}>
            Guide
          </button>
          <button type="button" className="header-button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
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
          {repoPath && <RemoteStatus />}
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
