import { TournamentPhase } from "../lib/types";
import { phaseLabel, phaseBadgeColor, formatLastUpdated } from "../lib/utils";

interface Props {
  phase: TournamentPhase;
  round: number;
  lastUpdated: string;
  onRefresh: () => void;
}

export function Header({ phase, round, lastUpdated, onRefresh }: Props) {
  const badgeColor = phaseBadgeColor(phase);

  return (
    <header style={{
      background: "var(--masters-green)",
      color: "var(--text-on-green)",
      padding: "0",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
              2026 Masters Pool
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 9px",
              borderRadius: 20,
              background: badgeColor,
              color: "#fff",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}>
              {phaseLabel(phase, round)}
            </span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Augusta National · April 9–12, 2026 · Updated {formatLastUpdated(lastUpdated)}
          </div>
        </div>
        <button
          onClick={onRefresh}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            padding: "6px 14px",
            fontSize: 13,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ↻ Refresh
        </button>
      </div>
    </header>
  );
}
