import { useState } from "react";
import { useRepo } from "../state/repo";

export function CommitBox() {
  const { changedFiles, uncheckedPaths, save, busy } = useRepo();
  const [message, setMessage] = useState("");

  const checkedCount = changedFiles.filter((f) => !uncheckedPaths.has(f.path)).length;
  const hasChecked = checkedCount > 0;
  const canSave = hasChecked && message.trim() !== "" && !busy;

  async function handleSave() {
    if (!canSave) return;
    await save(message.trim());
    setMessage("");
  }

  return (
    <div className="commit-box">
      <div className="commit-box-main">
        <span className="commit-box-label">
          {hasChecked ? "Describe what you changed" : "Check a file above to save your work"}
        </span>
        <textarea
          placeholder="A short note about your changes"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!hasChecked}
        />
      </div>
      <button type="button" className="commit-button" onClick={handleSave} disabled={!canSave}>
        Save {checkedCount > 0 ? `(${checkedCount})` : ""}
      </button>
    </div>
  );
}
