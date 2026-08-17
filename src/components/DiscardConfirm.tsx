import { useEffect } from "react";
import type { ChangedFile } from "../state/repo";

interface DiscardConfirmProps {
  file: ChangedFile | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DiscardConfirm({ file, onCancel, onConfirm }: DiscardConfirmProps) {
  useEffect(() => {
    if (!file) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [file, onCancel]);

  if (!file) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Discard changes"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Discard Changes</h2>
        <p className="modal-intro">
          {file.path} will go back to how it looked in your last save. This can't be undone.
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="destructive" onClick={onConfirm}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
