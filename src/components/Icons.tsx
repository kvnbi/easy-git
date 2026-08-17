interface IconProps {
  className?: string;
}

const common = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ChangesIcon({ className }: IconProps) {
  return (
    <svg className={className} {...common}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg className={className} {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.5 2" />
    </svg>
  );
}

export function StashIcon({ className }: IconProps) {
  return (
    <svg className={className} {...common}>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  );
}

export function GuideIcon({ className }: IconProps) {
  return (
    <svg className={className} {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 2-3 4" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  );
}

export function DiscardIcon({ className }: IconProps) {
  return (
    <svg className={className} {...common}>
      <path d="M6.5 9h8a5 5 0 0 1 0 10h-2.5" />
      <path d="M9.5 5.5 6 9l3.5 3.5" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...common}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <circle cx="16" cy="14" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="21" x2="20" y2="21" />
      <circle cx="11" cy="21" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
