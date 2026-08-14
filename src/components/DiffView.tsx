import { useEffect, useState } from "react";
import { gitDiff, isGitError } from "../api/git";
import { displayStatus, useRepo } from "../state/repo";

function diffLineClass(line: string): string {
  if (line.startsWith("+") && !line.startsWith("+++")) return "diff-add";
  if (line.startsWith("-") && !line.startsWith("---")) return "diff-remove";
  if (line.startsWith("@@")) return "diff-hunk";
  return "diff-context";
}

function DiffBody() {
  const { repoPath, selectedFile } = useRepo();
  const [diff, setDiff] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath || !selectedFile) {
      setDiff(null);
      setError(null);
      return;
    }
    let cancelled = false;
    gitDiff(repoPath, selectedFile.path, selectedFile.staged)
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
  }, [repoPath, selectedFile]);

  if (error) {
    return <div className="diff-body diff-error">{error}</div>;
  }

  if (diff === null) {
    return <div className="diff-body empty-state">Loading changes...</div>;
  }

  if (diff.trim() === "") {
    return (
      <div className="diff-body empty-state">
        No changes to show{selectedFile?.staged ? "" : " yet for this new file"}.
      </div>
    );
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

export function DiffView() {
  const { selectedFile, changedFiles } = useRepo();

  if (!selectedFile) {
    return (
      <div className="diff-panel">
        <div className="empty-block">
          <h2>Select a File</h2>
          <p>Choose a file to see what changed.</p>
        </div>
      </div>
    );
  }

  const fileStatus = changedFiles.find((f) => f.path === selectedFile.path)?.status ?? "";

  return (
    <div className="diff-panel">
      <div className="diff-panel-header">
        <span className="diff-panel-filename" title={selectedFile.path}>
          {selectedFile.path}
        </span>
        {fileStatus && <span className="diff-panel-badge">{displayStatus(fileStatus)}</span>}
      </div>
      <DiffBody />
    </div>
  );
}
