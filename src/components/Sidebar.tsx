import { useRepo } from "../state/repo";
import { ChangesIcon, GuideIcon, HistoryIcon, SettingsIcon, StashIcon } from "./Icons";

export type View = "changes" | "history" | "stash";

interface SidebarProps {
  view: View;
  onChangeView: (view: View) => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ view, onChangeView, onOpenGuide, onOpenSettings }: SidebarProps) {
  const { changedFiles } = useRepo();

  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        <button
          type="button"
          className={view === "changes" ? "active" : ""}
          onClick={() => onChangeView("changes")}
        >
          <ChangesIcon className="sidebar-icon" />
          <span>Changes</span>
          {changedFiles.length > 0 && <span className="sidebar-badge">{changedFiles.length}</span>}
        </button>
        <button
          type="button"
          className={view === "history" ? "active" : ""}
          onClick={() => onChangeView("history")}
        >
          <HistoryIcon className="sidebar-icon" />
          <span>History</span>
        </button>
        <button
          type="button"
          className={view === "stash" ? "active" : ""}
          onClick={() => onChangeView("stash")}
        >
          <StashIcon className="sidebar-icon" />
          <span>Stash</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button type="button" onClick={onOpenGuide} aria-label="Guide" title="Guide">
          <GuideIcon className="sidebar-icon" />
        </button>
        <button type="button" onClick={onOpenSettings} aria-label="Settings" title="Settings">
          <SettingsIcon className="sidebar-icon" />
        </button>
      </div>
    </div>
  );
}
