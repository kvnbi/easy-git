import { useEffect, useState } from "react";
import { gitStashList, isGitError } from "../api/git";
import type { StashEntry } from "../api/git";
import { useRepo } from "../state/repo";

export function Stash() {
  const { repoPath, refreshCount, changedFiles, stashSave, stashRestore, stashDrop, busy } =
    useRepo();
  const [stashes, setStashes] = useState<StashEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!repoPath) return;
    gitStashList(repoPath)
      .then((result) => setStashes(result.stashes))
      .catch((err) => setError(isGitError(err) ? err.message : String(err)));
  }, [repoPath, refreshCount]);

  const hasChanges = changedFiles.length > 0;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges || busy) return;
    stashSave(message);
    setMessage("");
  }

  return (
    <div className="stash-view">
      {hasChanges ? (
        <form className="stash-save-row" onSubmit={handleSave}>
          <input
            placeholder="What are you setting aside? (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            Stash {changedFiles.length} {changedFiles.length === 1 ? "File" : "Files"}
          </button>
        </form>
      ) : (
        <p className="stash-hint">
          Nothing to set aside right now. When you have changes, stashing puts them away so you
          can come back to them later.
        </p>
      )}

      {error && <p className="diff-error">{error}</p>}
      {!error && stashes === null && <p className="empty-state">Loading...</p>}
      {!error && stashes?.length === 0 && (
        <div className="empty-block">
          <h2>No Stashes</h2>
          <p>Anything you set aside shows up here.</p>
        </div>
      )}

      {stashes && stashes.length > 0 && (
        <ul className="stash-list">
          {stashes.map((s) => (
            <li key={s.index} className="stash-row">
              <span className="stash-message" title={s.message}>
                {s.message}
              </span>
              <div className="stash-actions">
                <button type="button" onClick={() => stashRestore(s.index)} disabled={busy}>
                  Restore
                </button>
                <button type="button" onClick={() => stashDrop(s.index)} disabled={busy}>
                  Drop
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
