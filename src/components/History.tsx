import { useState } from "react";
import { gitLog, gitShowCommit } from "../api/git";
import type { CommitEntry } from "../api/git";
import { useRepo, useRepoQuery } from "../state/repo";
import { ConfirmDialog } from "./ConfirmDialog";
import { DiffLines } from "./DiffView";
import { RevertIcon } from "./Icons";

function CommitDiff({ hash }: { hash: string | null }) {
  const { data, error } = useRepoQuery(
    hash ? (repo) => gitShowCommit(repo, hash) : null,
    hash ?? "",
  );

  if (!hash) {
    return (
      <div className="empty-block">
        <h2>Select a Commit</h2>
        <p>Choose a commit to see what changed.</p>
      </div>
    );
  }
  if (error) {
    return <div className="diff-body diff-error">{error}</div>;
  }
  if (data === null) {
    return <div className="diff-body empty-state">Loading changes...</div>;
  }
  return <DiffLines diff={data.diff} />;
}

export function History() {
  const { revertCommit, busy } = useRepo();
  const { data, error } = useRepoQuery(gitLog);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingRevert, setPendingRevert] = useState<CommitEntry | null>(null);

  const commits = data?.commits ?? null;
  const activeHash = commits?.some((c) => c.hash === selected) ? selected : null;

  return (
    <div className="main-split">
      <div className="file-list">
        {error && <p className="diff-error">{error}</p>}
        {!error && commits === null && <p className="empty-state">Loading...</p>}
        {!error && commits?.length === 0 && (
          <div className="empty-block">
            <h2>No Commits</h2>
          </div>
        )}
        {commits && commits.length > 0 && (
          <ul className="history-list">
            {commits.map((c) => (
              <li key={c.hash} className={c.hash === activeHash ? "selected" : ""}>
                <button
                  type="button"
                  className="history-row"
                  onClick={() => setSelected(c.hash)}
                  title={c.message}
                >
                  <span className="history-message">{c.message}</span>
                  <span className="history-meta">
                    <span className="history-hash">{c.short_hash}</span>
                    <span className="history-author">{c.author}</span>
                    <span className="history-date">{c.date}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="history-revert"
                  onClick={() => setPendingRevert(c)}
                  disabled={busy}
                  aria-label={`Undo commit ${c.short_hash}`}
                  title="Undo this commit"
                >
                  <RevertIcon className="revert-icon" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="diff-panel">
        <CommitDiff hash={activeHash} />
      </div>
      {pendingRevert && (
        <ConfirmDialog
          title="Undo This Commit"
          message={`A new commit will be added that undoes "${pendingRevert.message}". Nothing already in your history is removed.`}
          confirmLabel="Undo Commit"
          onCancel={() => setPendingRevert(null)}
          onConfirm={() => {
            revertCommit(pendingRevert.hash);
            setPendingRevert(null);
          }}
        />
      )}
    </div>
  );
}
