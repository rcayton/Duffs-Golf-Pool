import React, { useState } from "react";
import { GolferScore, EnrichedPoolPlayer } from "../lib/types";
import { formatScore, scoreClass, PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

interface Props {
  players: GolferScore[];
  poolPlayers: EnrichedPoolPlayer[];
  cutLine: number | null;
  projectedCut: number | null;
}

// Build a map of espn_id / name → owner
function buildOwnerMap(poolPlayers: EnrichedPoolPlayer[]): Map<string, EnrichedPoolPlayer> {
  const map = new Map<string, EnrichedPoolPlayer>();
  poolPlayers.forEach((pp) => {
    pp.enriched_picks.forEach((pick) => {
      if (pick.espn_id) map.set(pick.espn_id, pp);
      // Also key by normalized name for fallback
      map.set(pick.golfer_name.toLowerCase(), pp);
    });
  });
  return map;
}

function findOwner(
  golfer: GolferScore,
  ownerMap: Map<string, EnrichedPoolPlayer>
): EnrichedPoolPlayer | null {
  return (
    ownerMap.get(golfer.espn_id) ??
    ownerMap.get(golfer.name.toLowerCase()) ??
    null
  );
}

export function Leaderboard({ players, poolPlayers, cutLine, projectedCut }: Props) {
  const [filter, setFilter] = useState<"all" | "picked">("all");
  const ownerMap = buildOwnerMap(poolPlayers);

  const displayCut = cutLine ?? projectedCut;
  const cutLabel = cutLine ? "Cut line" : projectedCut !== null ? "Proj. cut" : null;

  const filtered = filter === "picked"
    ? players.filter((p) => findOwner(p, ownerMap) !== null)
    : players;

  // Position tracking — only show pos number when it changes
  let lastPos = "";

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-card)",
      overflow: "hidden",
    }}>
      {/* Table header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "picked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 12, padding: "4px 12px",
                borderRadius: 20,
                border: "1px solid var(--border-strong)",
                background: filter === f ? "var(--masters-green)" : "transparent",
                color: filter === f ? "#fff" : "var(--text-secondary)",
                cursor: "pointer", fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f === "all" ? `All (${players.length})` : `Pool picks (${players.filter(p => findOwner(p, ownerMap)).length})`}
            </button>
          ))}
        </div>
        {cutLabel && displayCut !== null && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {cutLabel}: <strong style={{ color: "var(--text-primary)" }}>{formatScore(displayCut)}</strong>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "36px 36px 1fr 48px 48px 80px",
        gap: 4,
        padding: "6px 14px",
        fontSize: 11,
        color: "var(--text-tertiary)",
        borderBottom: "1px solid var(--border)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        <span></span>
        <span>Pos</span>
        <span>Player</span>
        <span style={{ textAlign: "right" }}>Score</span>
        <span style={{ textAlign: "right" }}>Thru</span>
        <span style={{ textAlign: "center" }}>Owner</span>
      </div>

      {/* Rows */}
      {filtered.map((golfer, i) => {
        const owner = findOwner(golfer, ownerMap);
        const ownerColor = owner ? PLAYER_COLORS[owner.id] : null;
        const ownerBg = owner ? PLAYER_BG_COLORS[owner.id] : null;

        // Show cut line divider
        const prevGolfer = filtered[i - 1];
        const showCutDivider =
          displayCut !== null &&
          prevGolfer !== undefined &&
          prevGolfer.score_to_par <= displayCut &&
          golfer.score_to_par > displayCut &&
          golfer.status !== "cut";

        const posDisplay = golfer.position !== lastPos ? golfer.position : "";
        lastPos = golfer.position;

        return (
          <React.Fragment key={golfer.espn_id}>
            {showCutDivider && (
              <div style={{
                padding: "4px 14px",
                fontSize: 11,
                color: "#A32D2D",
                background: "#FFF5F5",
                borderTop: "1px dashed #F09595",
                borderBottom: "1px dashed #F09595",
                fontWeight: 500,
              }}>
                ✂ {cutLabel} ({formatScore(displayCut!)})
              </div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "36px 36px 1fr 48px 48px 80px",
              gap: 4,
              alignItems: "center",
              padding: "6px 14px",
              borderBottom: "1px solid var(--border)",
              background: i % 2 === 0 ? "transparent" : "var(--bg-surface)",
              opacity: golfer.status === "cut" || golfer.status === "wd" ? 0.5 : 1,
            }}>
              {/* Owner dot */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                {owner && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ownerColor ?? "#ccc",
                  }} />
                )}
              </div>

              {/* Position */}
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>
                {golfer.status === "cut" ? "CUT" : golfer.status === "wd" ? "WD" : posDisplay}
              </span>

              {/* Name */}
              <span style={{ fontSize: 13, color: "var(--text-primary)" }} className="truncate">
                {golfer.display_name}
              </span>

              {/* Score */}
              <span className={scoreClass(golfer.score_to_par)} style={{ fontSize: 13, textAlign: "right" }}>
                {formatScore(golfer.score_to_par)}
              </span>

              {/* Thru */}
              <span style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "right" }}>
                {golfer.thru === "F" ? "F" : golfer.thru === "-" ? "—" : golfer.thru}
              </span>

              {/* Owner badge */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                {owner ? (
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    padding: "2px 7px", borderRadius: 10,
                    background: ownerBg ?? "var(--bg-surface)",
                    color: ownerColor ?? "var(--text-secondary)",
                  }}>
                    {owner.name}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>—</span>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: 14 }}>
          No players found
        </div>
      )}
    </div>
  );
}
