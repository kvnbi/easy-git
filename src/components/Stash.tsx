import { useCallback, useEffect, useState } from "react";
import { gitStashList, isGitError } from "../api/git";
import type { StashEntry } from "../api/git";
import { useRepo } from "../state/repo";

export function Stash() {
  const { repoPath, changedFiles, stashSave, stashApply, stashDrop, busy } = useRepo();
  const [stashes, setStashes] = useState<StashEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadStashes = useCallback(() => {
    if (!repoPath) return;
    gitStashList(repoPath)
      .then((result) => setStashes(result.stashes))
      .catch((err) => setError(isGitError(err) ? err.message : String(err)));
  }, [repoPath]);

  useEffect(() => {
    loadStashes();
  }, [loadStashes]);

  const hasChanges = changedFiles.length > 0;

  async function handleSave() {
    await stashSave(message);
    setMessage("");
    loadStashes();
  }

  async function handleApply(index: number) {
    await stashApply(index);
    loadStashes();
  }

  async function handleDrop(index: number) {
    await stashDrop(index);
    loadStashes();
  }

  return (
    <div className="stash-view">
      <div className="stash-save-row">
        <input
          placeholder="What are you setting aside? (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!hasChanges}
        />
        <button type="button" onClick={handleSave} disabled={!hasChanges || busy}>
          Stash changes
        </button>
      </div>

      {error && <p className="diff-error">{error}</p>}
      {!error && stashes === null && <p className="empty-state">Loading stashes...</p>}
      {!error && stashes?.length === 0 && <p className="empty-state">Nothing stashed.</p>}

      {stashes && stashes.length > 0 && (
        <ul className="stash-list">
          {stashes.map((s) => (
            <li key={s.index} className="stash-row">
              <span className="stash-message" title={s.message}>
                {s.message}
              </span>
              <div className="stash-actions">
                <button type="button" onClick={() => handleApply(s.index)} disabled={busy}>
                  Apply
                </button>
                <button type="button" onClick={() => handleDrop(s.index)} disabled={busy}>
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
