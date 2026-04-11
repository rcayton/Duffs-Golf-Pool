
export type TabId = "picks" | "leaderboard" | "pot" | "history";

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "picks", label: "My picks" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "pot", label: "Pot breakdown" },
  { id: "history", label: "Selection Leaderboard" },
];

export function Tabs({ active, onChange }: Props) {
  return (
    <div style={{
      display: "flex",
      gap: 4,
      borderBottom: "1px solid var(--border)",
      marginBottom: "1.25rem",
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
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
