import { memo } from "react";
import { gitDiff } from "../api/git";
import { displayStatus, useRepo, useRepoQuery } from "../state/repo";

const MAX_LINES = 5000;

function diffLineClass(line: string): string {
  if (line.startsWith("+") && !line.startsWith("+++")) return "diff-add";
  if (line.startsWith("-") && !line.startsWith("---")) return "diff-remove";
  if (line.startsWith("@@")) return "diff-hunk";
  return "diff-context";
}

export const DiffLines = memo(function DiffLines({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  const hidden = lines.length - MAX_LINES;
  return (
    <pre className="diff-body">
      {lines.slice(0, MAX_LINES).map((line, i) => (
        <div key={i} className={diffLineClass(line)}>
          {line || " "}
        </div>
      ))}
      {hidden > 0 && <div className="diff-hunk">{hidden} more lines not shown</div>}
    </pre>
  );
});

function DiffBody({ path, staged }: { path: string; staged: boolean }) {
  const { data, error } = useRepoQuery(
    (repo) => gitDiff(repo, path, staged),
    `${staged}:${path}`,
  );

  if (error) {
    return <div className="diff-body diff-error">{error}</div>;
  }
  if (data === null) {
    return <div className="diff-body empty-state">Loading changes...</div>;
  }
  if (data.diff.trim() === "") {
    return (
      <div className="diff-body empty-state">
        No changes to show{staged ? "" : " yet for this new file"}.
      </div>
    );
  }
  return <DiffLines diff={data.diff} />;
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
      <DiffBody path={selectedFile.path} staged={selectedFile.staged} />
    </div>
  );
}
