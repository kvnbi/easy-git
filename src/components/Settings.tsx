import { useEffect, useState } from "react";
import { gitConfigInfo } from "../api/git";
import type { GitConfigInfo } from "../api/git";
import { useRepo } from "../state/repo";
import { useTheme } from "../state/theme";
import type { Theme } from "../state/theme";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function Settings({ open, onClose }: SettingsProps) {
  const { repoPath } = useRepo();
  const { theme, setTheme } = useTheme();
  const [config, setConfig] = useState<GitConfigInfo | null>(null);

  useEffect(() => {
    if (!open || !repoPath) {
      setConfig(null);
      return;
    }
    gitConfigInfo(repoPath).then(setConfig);
  }, [open, repoPath]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="guide-backdrop" onClick={onClose}>
      <div
        className="guide-card"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Settings</h2>

        <div className="guide-glossary">
          <h3>Appearance</h3>
          <div className="settings-theme-options">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={theme === option.value ? "active" : ""}
                onClick={() => setTheme(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="guide-glossary">
          <h3>Git identity</h3>
          {!repoPath && (
            <p className="empty-state">Open a project to see its Git identity.</p>
          )}
          {repoPath && !config && <p className="empty-state">Loading...</p>}
          {repoPath && config && (
            <dl>
              <div className="guide-glossary-item">
                <dt>Name</dt>
                <dd>{config.user_name ?? "Not set"}</dd>
              </div>
              <div className="guide-glossary-item">
                <dt>Email</dt>
                <dd>{config.user_email ?? "Not set"}</dd>
              </div>
              <div className="guide-glossary-item">
                <dt>Credentials</dt>
                <dd>{config.credential_helper ?? "No credential helper configured"}</dd>
              </div>
            </dl>
          )}
        </div>

        <button type="button" className="guide-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
