import { DashboardData } from "../lib/types";
import { PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

interface Props {
  data: DashboardData;
}

export function PotBreakdown({ data }: Props) {
  const { pot, pool_players } = data;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Pot total card */}
      <div style={{
        background: "var(--masters-green)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem 1.5rem",
        color: "#fff",
      }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Total pot</div>
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em" }}>
          ${pot.total}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
          Winner takes all · Rolls over if no pool member wins
        </div>
      </div>

      {/* Breakdown */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Pot breakdown</div>
        </div>
        {[
          { label: `${data.snapshot.tournament_name} dues (${pool_players.length} × $10)`, value: pot.base_dues },
          ...(pot.rollover_total > 0
            ? [{ label: pot.rollover_label, value: pot.rollover_total }]
            : []),
          { label: "Cut penalties (missed cuts × $5)", value: pot.cut_penalties_total },
        ].map((row) => (
          <div key={row.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            fontSize: 13,
          }}>
            <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>${row.value}</span>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 14px",
          fontSize: 14, fontWeight: 600,
        }}>
          <span>Total</span>
          <span style={{ color: "var(--masters-green)" }}>${pot.total}</span>
        </div>
      </div>

      {/* Per-player dues table */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Player dues</div>
        </div>
        {pool_players.map((player) => {
          const color = PLAYER_COLORS[player.id] ?? "#5a5a55";
          const bg = PLAYER_BG_COLORS[player.id] ?? "#F1EFE8";
          const penaltyAmount = player.cut_penalties * 5;
          const total = player.dues_owed + penaltyAmount;
          return (
            <div key={player.id} style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr auto auto auto",
              alignItems: "center",
              gap: 10,
              padding: "9px 14px",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: color, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {player.name[0]}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{player.name}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Base: ${player.dues_owed}
              </span>
              {penaltyAmount > 0 ? (
                <span style={{ fontSize: 12, color: "#A32D2D" }}>
                  +${penaltyAmount} cuts
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No penalties</span>
              )}
              <span style={{
                fontSize: 13, fontWeight: 600,
                padding: "2px 8px", borderRadius: "var(--radius-sm)",
                background: bg, color: color,
              }}>
                ${total}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rules reminder */}
      <div style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-md)",
        padding: "0.875rem 1rem",
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        border: "1px solid var(--border)",
      }}>
        <strong style={{ color: "var(--text-primary)" }}>Rules:</strong>{" "}
        Each player contributes $10 per major. $5 is added to the pot for each golfer who misses the cut.
        The player who picked the tournament winner takes the entire pot.
        If no pool member's golfer wins, the pot rolls over to the next major.
      </div>
    </div>
  );
}
