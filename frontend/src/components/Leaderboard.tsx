import React, { useState } from "react";
import { GolferScore, EnrichedPoolPlayer, TournamentPhase } from "../lib/types";
import { formatScore, scoreClass, PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

interface Props {
  players: GolferScore[];
  poolPlayers: EnrichedPoolPlayer[];
  cutLine: number | null;
  projectedCut: number | null;
  phase: TournamentPhase;
  currentRound: number;
}

function buildOwnerMap(poolPlayers: EnrichedPoolPlayer[]): Map<string, EnrichedPoolPlayer> {
  const map = new Map<string, EnrichedPoolPlayer>();
  poolPlayers.forEach((pp) => {
    pp.enriched_picks.forEach((pick) => {
      if (pick.espn_id) map.set(pick.espn_id, pp);
      map.set(pick.golfer_name.toLowerCase(), pp);
    });
  });
  return map;
}

function findOwner(
  golfer: GolferScore,
  ownerMap: Map<string, EnrichedPoolPlayer>,
): EnrichedPoolPlayer | null {
  return (
    ownerMap.get(golfer.espn_id) ??
    ownerMap.get(golfer.name.toLowerCase()) ??
    null
  );
}

// Number of round columns to render (only show rounds that have been played)
function roundsToShow(phase: TournamentPhase): number {
  if (phase === "pre") return 0;
  if (phase === "complete") return 4;
  return parseInt(phase.replace("round", ""), 10) || 0;
}

interface RoundCell {
  value: string;
  type: "strokes" | "topar" | "empty";
  scoreVal: number;
}

function getRoundCell(
  r: number,
  golfer: GolferScore,
  currentRound: number,
  phase: TournamentPhase,
): RoundCell {
  if (phase === "pre") return { value: "—", type: "empty", scoreVal: 0 };

  const roundIdx = r - 1;
  const isComplete = phase === "complete" || r < currentRound;

  if (isComplete) {
    const strokes = golfer.round_scores[roundIdx] ?? 0;
    return strokes > 0
      ? { value: String(strokes), type: "strokes", scoreVal: strokes }
      : { value: "—", type: "empty", scoreVal: 0 };
  }

  if (r === currentRound) {
    if (!golfer.thru || golfer.thru === "-") {
      return { value: "—", type: "empty", scoreVal: 0 };
    }
    return {
      value: formatScore(golfer.today_score),
      type: "topar",
      scoreVal: golfer.today_score,
    };
  }

  return { value: "—", type: "empty", scoreVal: 0 };
}

export function Leaderboard({ players, poolPlayers, cutLine, projectedCut, phase, currentRound }: Props) {
  const [filter, setFilter] = useState<"all" | "picked">("all");
  const ownerMap = buildOwnerMap(poolPlayers);
  const numRounds = roundsToShow(phase);

  const displayCut = cutLine ?? projectedCut;
  const cutLabel = cutLine ? "Cut line" : projectedCut !== null ? "Proj. cut" : null;

  const filtered = filter === "picked"
    ? players.filter((p) => findOwner(p, ownerMap) !== null)
    : players;

  // Grid: dot | pos | name | [R1..Rn] | total | thru | owner
  const roundColWidths = Array(numRounds).fill("38px").join(" ");
  const gridCols = `8px 44px 1fr${numRounds > 0 ? ` ${roundColWidths}` : ""} 52px 44px 90px`;

  let lastPos = "";

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-card)",
      overflow: "hidden",
    }}>
      {/* Filter bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "picked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 12, padding: "4px 12px", borderRadius: 20,
                border: "1px solid var(--border-strong)",
                background: filter === f ? "var(--masters-green)" : "transparent",
                color: filter === f ? "#fff" : "var(--text-secondary)",
                cursor: "pointer", fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f === "all"
                ? `All (${players.length})`
                : `Pool picks (${players.filter((p) => findOwner(p, ownerMap)).length})`}
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
        display: "grid", gridTemplateColumns: gridCols, gap: 4,
        padding: "6px 14px", fontSize: 11, color: "var(--text-tertiary)",
        borderBottom: "1px solid var(--border)",
        textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        <span />
        <span>Pos</span>
        <span>Player</span>
        {Array.from({ length: numRounds }, (_, i) => {
          const r = i + 1;
          const isActive = r === currentRound && phase !== "complete";
          return (
            <span
              key={r}
              className="lb-round-col"
              style={{
                textAlign: "right",
                color: isActive ? "var(--masters-green)" : undefined,
                fontWeight: isActive ? 700 : undefined,
              }}
            >
              R{r}
            </span>
          );
        })}
        <span style={{ textAlign: "right" }}>Score</span>
        <span style={{ textAlign: "right" }}>Thru</span>
        <span style={{ textAlign: "center" }}>Owner</span>
      </div>

      {/* Rows */}
      {filtered.map((golfer, i) => {
        const owner = findOwner(golfer, ownerMap);
        const ownerColor = owner ? PLAYER_COLORS[owner.id] : null;
        const ownerBg = owner ? PLAYER_BG_COLORS[owner.id] : null;
        const isCutOrWd = golfer.status === "cut" || golfer.status === "wd";

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
                padding: "4px 14px", fontSize: 11, color: "#A32D2D",
                background: "#FFF5F5",
                borderTop: "1px dashed #F09595", borderBottom: "1px dashed #F09595",
                fontWeight: 500,
              }}>
                ✂ {cutLabel} ({formatScore(displayCut!)})
              </div>
            )}
            <div style={{
              display: "grid", gridTemplateColumns: gridCols,
              gap: 4, alignItems: "center",
              padding: "6px 14px",
              borderBottom: "1px solid var(--border)",
              background: i % 2 === 0 ? "transparent" : "var(--bg-surface)",
              opacity: isCutOrWd ? 0.5 : 1,
            }}>
              {/* Owner dot */}
              <div style={{ display: "flex", alignItems: "center" }}>
                {owner && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ownerColor ?? "#ccc", flexShrink: 0,
                  }} />
                )}
              </div>

              {/* Position */}
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>
                {golfer.status === "cut" ? "CUT"
                  : golfer.status === "wd" ? "WD"
                  : posDisplay}
              </span>

              {/* Name */}
              <span style={{ fontSize: 13, color: "var(--text-primary)" }} className="truncate">
                {golfer.name}
              </span>

              {/* Round score columns */}
              {Array.from({ length: numRounds }, (_, idx) => {
                const r = idx + 1;
                const cell = getRoundCell(r, golfer, currentRound, phase);
                const isActive = r === currentRound && phase !== "complete";
                return (
                  <span
                    key={r}
                    className={`lb-round-col ${cell.type === "topar" ? scoreClass(cell.scoreVal) : ""}`}
                    style={{
                      fontSize: 12,
                      textAlign: "right",
                      color: cell.type === "empty"
                        ? "var(--text-tertiary)"
                        : cell.type === "strokes"
                        ? isActive ? undefined : "var(--text-secondary)"
                        : undefined,
                      fontWeight: isActive ? 500 : undefined,
                    }}
                  >
                    {cell.value}
                  </span>
                );
              })}

              {/* Total score */}
              <span
                className={scoreClass(golfer.score_to_par)}
                style={{ fontSize: 13, textAlign: "right" }}
              >
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
