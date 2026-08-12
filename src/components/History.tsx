import { useEffect, useState } from "react";
import { gitLog, gitShowCommit, isGitError } from "../api/git";
import type { CommitEntry } from "../api/git";
import { useRepo } from "../state/repo";

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
      <div className="diff-panel-empty empty-state">
        Click a commit on the left to see what changed in it.
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
  const { repoPath } = useRepo();
  const [commits, setCommits] = useState<CommitEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) return;
    let cancelled = false;
    gitLog(repoPath)
      .then((result) => {
        if (!cancelled) setCommits(result.commits);
      })
      .catch((err) => {
        if (!cancelled) setError(isGitError(err) ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [repoPath]);

  return (
    <div className="main-split">
      <div className="file-list">
        {error && <p className="diff-error">{error}</p>}
        {!error && commits === null && <p className="empty-state">Loading commits...</p>}
        {!error && commits?.length === 0 && <p className="empty-state">No commits yet.</p>}
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
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="diff-panel">
        <CommitDiff hash={selected} />
      </div>
    </div>
  );
}
