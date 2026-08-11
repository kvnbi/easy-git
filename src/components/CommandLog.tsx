import { useState } from "react";
import { useRepo } from "../state/repo";

export function CommandLog() {
  const { commandLog } = useRepo();
  const [open, setOpen] = useState(false);

  return (
    <div className="command-log">
      <button type="button" className="command-log-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} What just ran ({commandLog.length})
      </button>
      {open && (
        <ul className="command-log-list">
          {commandLog.length === 0 && <li className="empty-state">Nothing yet.</li>}
          {commandLog.map((entry, i) => (
            <li key={i} className={entry.error ? "command-log-error" : ""}>
              <code>{entry.command}</code>
              {entry.error && <div className="command-log-error-text">{entry.error}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
