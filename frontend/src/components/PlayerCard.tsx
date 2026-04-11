import { EnrichedPoolPlayer, TournamentPhase } from "../lib/types";
import { formatScore, scoreClass, PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

interface Props {
  player: EnrichedPoolPlayer;
  phase: TournamentPhase;
  isLeader: boolean;
  isLuckiest: boolean;
  isReigningChamp: boolean;
  rank: number;                          // pool player rank by win %
  top10Positions: Map<string, string>;   // espn_id → position string ("T3", "1")
}

function CutBadge({ status }: { status: string; cutMade?: boolean | null }) {
  if (status === "cut") {
    return (
      <span style={{
        fontSize: 10, fontWeight: 600, padding: "1px 6px",
        borderRadius: 10, background: "#FCEBEB", color: "#791F1F",
      }}>MISSED CUT</span>
    );
  }
  if (status === "wd") {
    return (
      <span style={{
        fontSize: 10, fontWeight: 600, padding: "1px 6px",
        borderRadius: 10, background: "#F1EFE8", color: "#444441",
      }}>WD</span>
    );
  }
  return null;
}

function cutColor(prob: number): string {
  if (prob >= 75) return "#0F6E56";
  if (prob >= 45) return "#BA7517";
  return "#A32D2D";
}

interface DualBarsProps {
  winProb: number;
  cutProb: number;
  playerColor: string;
}

function DualBars({ winProb, cutProb, playerColor }: DualBarsProps) {
  return (
    <div style={{ minWidth: 80, display: "flex", flexDirection: "column", gap: 5 }}>
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 2,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Win %</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: playerColor }}>
            {winProb.toFixed(1)}%
          </span>
        </div>
        <div style={{
          height: 5, background: "var(--bg-surface-2)",
          borderRadius: 5, overflow: "hidden",
        }}>
          <div style={{
            height: 5,
            width: `${Math.min(100, winProb)}%`,
            background: playerColor,
            borderRadius: 5,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 2,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Make Cut %</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: cutColor(cutProb) }}>
            {cutProb}%
          </span>
        </div>
        <div style={{
          height: 5, background: "var(--bg-surface-2)",
          borderRadius: 5, overflow: "hidden",
        }}>
          <div style={{
            height: 5,
            width: `${cutProb}%`,
            background: cutColor(cutProb),
            borderRadius: 5,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

export function PlayerCard({ player, isLeader, isLuckiest, isReigningChamp, rank, top10Positions, phase }: Props) {
  const color = PLAYER_COLORS[player.id] ?? "#5a5a55";
  const bg = PLAYER_BG_COLORS[player.id] ?? "#F1EFE8";
  const showLeaderPos = phase === "round3" || phase === "round4" || phase === "complete";

  // Sort picks: active by score asc, then cut/wd at bottom
  const sortedPicks = [...player.enriched_picks].sort((a, b) => {
    const aOut = a.score?.status === "cut" || a.score?.status === "wd" || a.score?.status === "dq";
    const bOut = b.score?.status === "cut" || b.score?.status === "wd" || b.score?.status === "dq";
    if (aOut && !bOut) return 1;
    if (!aOut && bOut) return -1;
    const aScore = a.score?.score_to_par ?? 99;
    const bScore = b.score?.score_to_par ?? 99;
    return aScore - bScore;
  });

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "var(--radius-lg)",
      border: isLeader ? `2px solid ${color}` : "1px solid var(--border)",
      boxShadow: "var(--shadow-card)",
      overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{
        background: bg,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {rank}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              {player.name}
              {player.combined_win_odds > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 400,
                  color: "var(--text-secondary)",
                }}>
                  {player.combined_win_odds.toFixed(1)}% to win
                </span>
              )}
              {isReigningChamp && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 7px",
                  borderRadius: 10, background: "#FFF8E1", color: "#B8860B",
                  border: "1px solid #FFD700", letterSpacing: "0.02em",
                }}>
                  🏆 Reigning Champ
                </span>
              )}
              {isLuckiest && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 7px",
                  borderRadius: 10, background: "#E8F5E9", color: "#2E7D32",
                  border: "1px solid #A5D6A7", letterSpacing: "0.02em",
                }}>
                  🍀 Luckiest
                </span>
              )}
            </div>
            {player.best_score !== null && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Best: <span className={scoreClass(player.best_score)}>
                  {formatScore(player.best_score)}
                </span>
                {player.leading_golfer && ` · ${player.leading_golfer.split(" ").pop()}`}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {player.cut_penalties > 0 && (
            <div style={{ fontSize: 11, color: "#A32D2D", fontWeight: 500 }}>
              +${player.cut_penalties * 5} penalty
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Owes ${player.dues_owed}
          </div>
        </div>
      </div>

      {/* Pick rows */}
      {sortedPicks.map((pick) => {
        const s = pick.score;
        const hasScore = !!s && s.thru !== "-";
        const faded = s?.status === "cut" || s?.status === "wd";
        const leaderPos = showLeaderPos && s?.espn_id ? top10Positions.get(s.espn_id) : undefined;

        return (
          <div key={pick.round_slot} style={{
            display: "grid",
            gridTemplateColumns: "1fr 50px minmax(100px, auto)",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderBottom: "1px solid var(--border)",
            opacity: faded ? 0.55 : 1,
          }}>
            {/* Golfer name + cut badge */}
            <div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }} className="truncate">
                {pick.golfer_name}
                {leaderPos && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 5px",
                    borderRadius: 8, background: "#E8F5E9", color: "#0F6E56",
                    border: "1px solid #A5D6A7", flexShrink: 0,
                  }}>
                    {leaderPos}
                  </span>
                )}
              </div>
              {s && (
                <div style={{ marginTop: 2 }}>
                  <CutBadge status={s.status} cutMade={s.cut_made} />
                </div>
              )}
            </div>

            {/* Score + thru */}
            <div style={{ textAlign: "right" }}>
              {hasScore ? (
                <>
                  <div className={scoreClass(s!.score_to_par)} style={{ fontSize: 14, fontWeight: 500 }}>
                    {formatScore(s!.score_to_par)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {s!.thru === "F" ? "F" : `Thru ${s!.thru}`}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>—</div>
              )}
            </div>

            {/* Dual probability bars */}
            <DualBars
              winProb={pick.win_probability}
              cutProb={pick.cut_probability}
              playerColor={color}
            />
          </div>
        );
      })}
    </div>
  );
}
