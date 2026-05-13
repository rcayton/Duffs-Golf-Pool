
export type TabId = "picks" | "leaderboard" | "pot" | "history" | "charts" | "draft";

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "picks",       label: "My Picks" },
  { id: "draft",       label: "Draft" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "pot",         label: "Pot Breakdown" },
  { id: "history",     label: "Duffs Leaderboard" },
  { id: "charts",      label: "Charts" },
];

export function Tabs({ active, onChange }: Props) {
  return (
    <div style={{
      display: "flex",
      gap: 4,
      borderBottom: "1px solid var(--border)",
      marginBottom: "1.25rem",
      overflowX: "auto",
    }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            fontSize: 14,
            fontWeight: active === tab.id ? 600 : 400,
            padding: "8px 16px",
            background: "transparent",
            border: "none",
            borderBottom: active === tab.id
              ? "2px solid var(--masters-green)"
              : "2px solid transparent",
            color: active === tab.id ? "var(--masters-green)" : "var(--text-secondary)",
            cursor: "pointer",
            marginBottom: -1,
            whiteSpace: "nowrap",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
