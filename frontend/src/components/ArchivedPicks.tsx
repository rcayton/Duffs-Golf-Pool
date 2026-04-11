import { MajorArchive, EnrichedPoolPlayer } from "../lib/types";
import { formatScore, scoreClass, PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

interface Props {
  archive: MajorArchive;
}

function CutBadge({ status }: { status: string }) {
  if (status === "cut") return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "#FCEBEB", color: "#791F1F" }}>
      MISSED CUT
    </span>
  );
  if (status === "wd") return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "#F1EFE8", color: "#444441" }}>
      WD
    </span>
  );
  return null;
}

function PickCard({ player, isWinner }: { player: EnrichedPoolPlayer; isWinner: boolean }) {
  const color = PLAYER_COLORS[player.id] ?? "#5a5a55";
  const bg = PLAYER_BG_COLORS[player.id] ?? "#F1EFE8";

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "var(--radius-lg)",
      border: isWinner ? `2px solid ${color}` : "1px solid var(--border)",
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
            {player.name[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              {player.name}
              {isWinner && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 7px",
                  borderRadius: 10, background: bg, color,
                  border: `1px solid ${color}`,
                }}>
                  🏆 Winner
                </span>
              )}
            </div>
            {player.best_score !== null && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Best: <span className={scoreClass(player.best_score)}>{formatScore(player.best_score)}</span>
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
        </div>
      </div>

      {/* Pick rows */}
      {player.enriched_picks.map((pick) => {
        const s = pick.score;
        const hasScore = !!s && s.thru !== "-";
        const faded = s?.status === "cut" || s?.status === "wd";
        return (
          <div key={pick.round_slot} style={{
            display: "grid",
            gridTemplateColumns: "1fr 60px",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderBottom: "1px solid var(--border)",
            opacity: faded ? 0.55 : 1,
          }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{pick.golfer_name}</div>
              {s && <div style={{ marginTop: 2 }}><CutBadge status={s.status} /></div>}
            </div>
            <div style={{ textAlign: "right" }}>
              {hasScore ? (
                <>
                  <div className={scoreClass(s!.score_to_par)} style={{ fontSize: 14, fontWeight: 500 }}>
                    {formatScore(s!.score_to_par)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {s!.thru === "F" ? "Final" : `Thru ${s!.thru}`}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ArchivedPicks({ archive }: Props) {
  const { pool_players, winner_id, pot_total, snapshot } = archive;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Summary banner */}
      <div style={{
        background: "var(--masters-green)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem 1.25rem",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Final results</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{archive.major_name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Pot</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>${pot_total}</div>
          {winner_id ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Won by {pool_players.find(p => p.id === winner_id)?.name ?? winner_id}
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.8 }}>Rolled over — no pool winner</div>
          )}
        </div>
      </div>

      {/* Tournament winner */}
      {(() => {
        const sorted = [...snapshot.players]
          .filter(p => p.status === "active" || p.status === "complete")
          .sort((a, b) => a.score_to_par - b.score_to_par);
        const w = sorted[0];
        if (!w) return null;
        return (
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}>
            Tournament winner: <strong style={{ color: "var(--text-primary)" }}>{w.name}</strong>
            {" "}
            <span className={scoreClass(w.score_to_par)} style={{ fontWeight: 600 }}>
              {formatScore(w.score_to_par)}
            </span>
          </div>
        );
      })()}

      {/* Picks grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "1rem",
      }}>
        {pool_players.map((player) => (
          <PickCard
            key={player.id}
            player={player}
            isWinner={player.id === winner_id}
          />
        ))}
      </div>
    </div>
  );
}
