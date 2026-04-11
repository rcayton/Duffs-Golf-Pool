import { TournamentPhase, MajorInfo } from "../lib/types";
import { phaseLabel, phaseBadgeColor, formatLastUpdated } from "../lib/utils";

interface Props {
  phase: TournamentPhase;
  round: number;
  lastUpdated: string;
  onRefresh: () => void;
  majors: MajorInfo[];
  selectedMajorId: string;
  onSelectMajor: (id: string) => void;
}

export function Header({ phase, round, lastUpdated, onRefresh, majors, selectedMajorId, onSelectMajor }: Props) {
  const badgeColor = phaseBadgeColor(phase);
  const activeMajor = majors.find((m) => m.is_active);

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
        flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2 }}>
            Duffs Majors Pool
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 500, opacity: 0.9 }}>
              {activeMajor?.short_name ?? "2026 Masters"}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 9px",
              borderRadius: 20, background: badgeColor, color: "#fff",
              letterSpacing: "0.02em", textTransform: "uppercase",
            }}>
              {phaseLabel(phase, round)}
            </span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {activeMajor?.dates ?? "April 9–12, 2026"} · Updated {formatLastUpdated(lastUpdated)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Major selector */}
          {majors.length > 0 && (
            <select
              value={selectedMajorId}
              onChange={(e) => onSelectMajor(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                fontSize: 13,
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
              }}
            >
              {majors.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  style={{ background: "#1a5c3a", color: "#fff" }}
                >
                  {m.short_name}{m.is_active ? " (Live)" : m.is_archived ? " ✓" : " (Upcoming)"}
                </option>
              ))}
            </select>
          )}

          {/* Refresh — only when viewing live major */}
          {selectedMajorId === (activeMajor?.id ?? "masters_2026") && (
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
              }}
            >
              ↻ Refresh
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
