import { useState } from "react";
import { useRepo } from "../state/repo";

export function BranchSwitcher() {
  const { status, branches, checkoutBranch, createBranch, busy } = useRepo();
  const [creating, setCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const detached = branches.length > 0 && status?.branch == null;
  const current = branches.find((b) => b.is_current)?.name ?? "";

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const name = e.target.value;
    if (name && name !== current) {
      checkoutBranch(name);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newBranchName.trim();
    if (!name) return;
    createBranch(name);
    setNewBranchName("");
    setCreating(false);
  }

  return (
    <div className="branch-switcher">
      {detached ? (
        <span className="branch-detached">Detached</span>
      ) : (
        <select value={current} onChange={handleSelect} disabled={busy}>
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      )}
      {creating ? (
        <form onSubmit={handleCreate} className="branch-create-form">
          <input
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="new-branch-name"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            onBlur={() => !newBranchName && setCreating(false)}
          />
          <button type="submit" disabled={busy}>
            Create
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)} disabled={busy}>
          New Branch
        </button>
      )}
    </div>
  );
}
