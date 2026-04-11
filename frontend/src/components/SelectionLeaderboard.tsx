import { DashboardData } from "../lib/types";
import { PLAYER_HISTORY } from "../lib/history";
import { PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

interface Props {
  data: DashboardData;
}

interface Row {
  id: string;
  name: string;
  wins: number;
  entries: number;
  money_won: number;
  money_lost: number;
  win_majors: string[];
  current_major_win: boolean;
  rolled_over: boolean;
}

function fmt(n: number): string {
  return n >= 0 ? `$${n}` : `($${Math.abs(n)})`;
}

export function SelectionLeaderboard({ data }: Props) {
  const { snapshot, pool_players, pot } = data;
  const isComplete = snapshot.phase === "complete";

  // Find tournament winner golfer when complete
  let winnerPoolPlayerId: string | null = null;
  let rolledOver = false;

  if (isComplete) {
    // Winner is the golfer with the lowest score_to_par (position "1")
    const sorted = [...snapshot.players]
      .filter((p) => p.status === "active" || p.status === "complete")
      .sort((a, b) => a.score_to_par - b.score_to_par);
    const winnerGolfer = sorted[0];

    if (winnerGolfer) {
      // Find which pool player picked this golfer
      for (const pp of pool_players) {
        const matched = pp.enriched_picks.find(
          (pick) =>
            pick.espn_id === winnerGolfer.espn_id ||
            pick.score?.espn_id === winnerGolfer.espn_id
        );
        if (matched) {
          winnerPoolPlayerId = pp.id;
          break;
        }
      }
    }
    if (!winnerPoolPlayerId) rolledOver = true;
  }

  // Build merged rows
  const rows: Row[] = PLAYER_HISTORY.map((h) => {
    const pp = pool_players.find((p) => p.id === h.id);
    const contribution = pp ? pp.dues_owed + pp.cut_penalties * 5 : 0;

    const extraWon =
      isComplete && winnerPoolPlayerId === h.id ? pot.total : 0;
    const extraLost = isComplete && pp ? contribution : 0;
    const extraWins = extraWon > 0 ? 1 : 0;
    const extraEntries = isComplete && pp ? 1 : 0;
    const currentMajorWin = extraWon > 0;

    return {
      id: h.id,
      name: pp?.name ?? h.id,
      wins: h.wins + extraWins,
      entries: h.entries + extraEntries,
      money_won: h.money_won + extraWon,
      money_lost: h.money_lost + extraLost,
      win_majors: currentMajorWin
        ? [...h.win_majors, "Masters 2026"]
        : h.win_majors,
      current_major_win: currentMajorWin,
      rolled_over: rolledOver,
    };
  });

  // Sort by net descending
  rows.sort(
    (a, b) =>
      b.money_won - b.money_lost - (a.money_won - a.money_lost)
  );

  const colStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 13,
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };
  const headerStyle: React.CSSProperties = {
    ...colStyle,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "var(--bg-surface)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Rollover notice */}
      {isComplete && rolledOver && (
        <div style={{
          background: "#FFF8E1",
          border: "1px solid #FFE082",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          fontSize: 13,
          color: "#6D4C00",
        }}>
          No pool member's pick won Masters 2026 — pot rolls over to the next major.
        </div>
      )}

      {/* Main table */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Selection Leaderboard</div>
          {!isComplete && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Updates automatically when tournament is complete
            </div>
          )}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Player", "Wins", "Entries", "Win %", "Money Won", "Money Lost", "Net", "Wins List"].map((h) => (
                  <th key={h} style={{ ...headerStyle, textAlign: h === "#" || h === "Wins" || h === "Entries" || h === "Win %" || h === "Money Won" || h === "Money Lost" || h === "Net" ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const color = PLAYER_COLORS[row.id] ?? "#5a5a55";
                const bg = PLAYER_BG_COLORS[row.id] ?? "#F1EFE8";
                const net = row.money_won - row.money_lost;
                const winPct = row.entries > 0
                  ? ((row.wins / row.entries) * 100).toFixed(1) + "%"
                  : "—";

                return (
                  <tr key={row.id} style={{ background: row.current_major_win ? "#F0FAF4" : undefined }}>
                    {/* Rank */}
                    <td style={{ ...colStyle, textAlign: "right", color: "var(--text-tertiary)", width: 32 }}>
                      {i + 1}
                    </td>

                    {/* Player */}
                    <td style={{ ...colStyle, fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {row.name[0]}
                        </div>
                        <span>{row.name}</span>
                        {row.current_major_win && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "1px 6px",
                            borderRadius: 10, background: bg, color,
                            border: `1px solid ${color}`,
                          }}>
                            🏆 Masters 2026
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Wins */}
                    <td style={{ ...colStyle, textAlign: "right", fontWeight: 600, color }}>
                      {row.wins}
                    </td>

                    {/* Entries */}
                    <td style={{ ...colStyle, textAlign: "right", color: "var(--text-secondary)" }}>
                      {row.entries}
                    </td>

                    {/* Win % */}
                    <td style={{ ...colStyle, textAlign: "right", color: "var(--text-secondary)" }}>
                      {winPct}
                    </td>

                    {/* Money Won */}
                    <td style={{ ...colStyle, textAlign: "right", color: "#0F6E56", fontWeight: 500 }}>
                      ${row.money_won}
                    </td>

                    {/* Money Lost */}
                    <td style={{ ...colStyle, textAlign: "right", color: "#A32D2D" }}>
                      ${row.money_lost}
                    </td>

                    {/* Net */}
                    <td style={{
                      ...colStyle,
                      textAlign: "right",
                      fontWeight: 700,
                      color: net >= 0 ? "#0F6E56" : "#A32D2D",
                    }}>
                      {fmt(net)}
                    </td>

                    {/* Wins List */}
                    <td style={{ ...colStyle, color: "var(--text-secondary)", fontSize: 12, maxWidth: 260 }}>
                      {row.win_majors.length > 0 ? row.win_majors.join(", ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
