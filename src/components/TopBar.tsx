import { useRepo } from "../state/repo";
import { BranchSwitcher } from "./BranchSwitcher";
import { RemoteStatus } from "./RemoteStatus";

export function TopBar() {
  const { repoPath, status, pickAndOpenRepo, push, pull, busy } = useRepo();

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button type="button" onClick={pickAndOpenRepo} disabled={busy}>
          {repoPath ? "Open" : "Open Folder"}
        </button>
        {repoPath && (
          <span className="repo-path" title={repoPath}>
            {repoPath}
          </span>
        )}
        {repoPath && <BranchSwitcher />}
      </div>

      {repoPath && (
        <div className="toolbar-right">
          <RemoteStatus />
          <button type="button" onClick={() => pull()} disabled={busy}>
            Pull{status && status.behind > 0 ? ` (${status.behind})` : ""}
          </button>
          <button type="button" onClick={() => push()} disabled={busy}>
            Push{status && status.ahead > 0 ? ` (${status.ahead})` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
