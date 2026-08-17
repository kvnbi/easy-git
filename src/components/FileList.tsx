import { useState } from "react";
import type { ChangedFile } from "../state/repo";
import { displayStatus, useRepo } from "../state/repo";
import { DiscardConfirm } from "./DiscardConfirm";
import { DiscardIcon } from "./Icons";

function statusClass(status: string): string {
  switch (status) {
    case "added":
      return "status-added";
    case "deleted":
      return "status-deleted";
    case "renamed":
    case "copied":
      return "status-renamed";
    case "untracked":
      return "status-untracked";
    case "unmerged":
      return "status-conflict";
    default:
      return "status-modified";
  }
}

function FileRow({
  file,
  isStaged,
  onRequestDiscard,
}: {
  file: ChangedFile;
  isStaged: boolean;
  onRequestDiscard: (file: ChangedFile) => void;
}) {
  const { uncheckedPaths, toggleChecked, selectedFile, selectFile, busy } = useRepo();
  const checked = !uncheckedPaths.has(file.path);
  const isSelected = selectedFile?.path === file.path;
  const canDiscard = file.status !== "unmerged";

  function handleDiscard(e: React.MouseEvent) {
    e.stopPropagation();
    onRequestDiscard(file);
  }

  return (
    <li className={`file-row ${statusClass(file.status)}${isSelected ? " selected" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggleChecked(file.path)}
        aria-label={`Include ${file.path}`}
      />
      <button
        type="button"
        className="file-row-label"
        onClick={() => selectFile(file.path, isStaged)}
        title={file.path}
      >
        <span className="file-status">{displayStatus(file.status)}</span>
        <span className="file-path">{file.path}</span>
      </button>
      {canDiscard && (
        <button
          type="button"
          className="file-row-discard"
          onClick={handleDiscard}
          disabled={busy}
          aria-label={`Discard changes to ${file.path}`}
          title="Discard changes"
        >
          <DiscardIcon className="discard-icon" />
        </button>
      )}
    </li>
  );
}

export function FileList() {
  const { status, changedFiles, discardFile } = useRepo();
  const [pendingDiscard, setPendingDiscard] = useState<ChangedFile | null>(null);

  if (!status) return null;

  const stagedPaths = new Set(status.staged.map((f) => f.path));

  return (
    <div className="file-list">
      {changedFiles.length > 0 ? (
        <>
          <p className="file-list-hint">Uncheck a file to leave it out.</p>
          <h3>Changed ({changedFiles.length})</h3>
          <ul>
            {changedFiles.map((f) => (
              <FileRow
                key={f.path}
                file={f}
                isStaged={stagedPaths.has(f.path)}
                onRequestDiscard={setPendingDiscard}
              />
            ))}
          </ul>
        </>
      ) : (
        <div className="empty-block">
          <h2>No Changes</h2>
          <p>Your project is up to date.</p>
        </div>
      )}
      <DiscardConfirm
        file={pendingDiscard}
        onCancel={() => setPendingDiscard(null)}
        onConfirm={() => {
          if (pendingDiscard) discardFile(pendingDiscard);
          setPendingDiscard(null);
        }}
      />
    </div>
  );
}
