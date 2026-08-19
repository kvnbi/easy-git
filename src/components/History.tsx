import { useEffect, useState } from "react";
import { gitLog, gitShowCommit, isGitError } from "../api/git";
import type { CommitEntry } from "../api/git";
import { useRepo } from "../state/repo";
import { ConfirmDialog } from "./ConfirmDialog";
import { RevertIcon } from "./Icons";

function diffLineClass(line: string): string {
  if (line.startsWith("+") && !line.startsWith("+++")) return "diff-add";
  if (line.startsWith("-") && !line.startsWith("---")) return "diff-remove";
  if (line.startsWith("@@")) return "diff-hunk";
  return "diff-context";
}

function CommitDiff({ hash }: { hash: string | null }) {
  const { repoPath } = useRepo();
  const [diff, setDiff] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath || !hash) {
      setDiff(null);
      setError(null);
      return;
    }
    let cancelled = false;
    gitShowCommit(repoPath, hash)
      .then((result) => {
        if (!cancelled) {
          setDiff(result.diff);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDiff(null);
          setError(isGitError(err) ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repoPath, hash]);

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
  if (diff === null) {
    return <div className="diff-body empty-state">Loading changes...</div>;
  }
  return (
    <pre className="diff-body">
      {diff.split("\n").map((line, i) => (
        <div key={i} className={diffLineClass(line)}>
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

export function History() {
  const { repoPath, refreshCount, revertCommit, busy } = useRepo();
  const [commits, setCommits] = useState<CommitEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingRevert, setPendingRevert] = useState<CommitEntry | null>(null);

  useEffect(() => {
    if (!repoPath) return;
    gitLog(repoPath)
      .then((result) => {
        setCommits(result.commits);
        setSelected((prev) =>
          prev && result.commits.some((c) => c.hash === prev) ? prev : null,
        );
      })
      .catch((err) => setError(isGitError(err) ? err.message : String(err)));
  }, [repoPath, refreshCount]);

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
              <li key={c.hash} className={c.hash === selected ? "selected" : ""}>
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
        <CommitDiff hash={selected} />
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
