import { useState, useEffect } from "react";
import { MajorArchive, MajorInfo, EnrichedPoolPlayer } from "../lib/types";
import { fetchMajorArchive } from "../lib/api";
import { formatScore, scoreClass, PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

interface Props {
  archive: MajorArchive;
  majors?: MajorInfo[];
}

// ─── WinnerPayouts ─────────────────────────────────────────────────────────────
// Shown when a pool member won this major. Lists what each person owes the
// winner: their dues + cut penalties for THIS major, plus their contributions
// to any immediately-preceding majors whose pots rolled over into this one
// (walked back through the majors list until a major with a winner is hit).

function contribution(a: MajorArchive, playerId: string): number {
  const p = a.pool_players.find((pp) => pp.id === playerId);
  return p ? p.dues_owed + p.cut_penalties * 5 : 0;
}

function WinnerPayouts({ archive, majors }: { archive: MajorArchive; majors: MajorInfo[] }) {
  // Rolled-over predecessor archives, oldest first
  const [chain, setChain] = useState<MajorArchive[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prior: MajorArchive[] = [];
      // majors comes from /api/majors in config (chronological) order
      const idx = majors.findIndex((m) => m.id === archive.major_id);
      for (let i = idx - 1; i >= 0; i--) {
        const m = majors[i];
        if (!m.is_archived || m.archive_summary?.winner_id) break; // chain ends at the last win
        const a = await fetchMajorArchive(m.id);
        if (!a) break;
        prior.unshift(a);
      }
      if (!cancelled) setChain(prior);
    })();
    return () => { cancelled = true; };
  }, [archive.major_id, majors]);

  const winner = archive.pool_players.find((p) => p.id === archive.winner_id);
  if (!winner) return null;

  if (chain === null) {
    return (
      <div style={{
        background: "var(--bg-card)", borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)", boxShadow: "var(--shadow-card)",
        padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)",
      }}>
        Calculating payouts…
      </div>
    );
  }

  const allMajors = [...chain, archive]; // oldest → this one
  const rows = archive.pool_players
    .map((p) => ({
      id: p.id,
      name: p.name,
      parts: allMajors.map((a) => ({
        label: a.short_name,
        amount: contribution(a, p.id),
      })),
    }))
    .map((r) => ({ ...r, total: r.parts.reduce((s, x) => s + x.amount, 0) }));

  const owedRows = rows
    .filter((r) => r.id !== winner.id)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const winnerRow = rows.find((r) => r.id === winner.id);
  const owedTotal = owedRows.reduce((s, r) => s + r.total, 0);
  const winnerColor = PLAYER_COLORS[winner.id] ?? "#5a5a55";

  const breakdown = (parts: { label: string; amount: number }[]) =>
    parts.length > 1
      ? parts.map((p) => `$${p.amount} ${p.label}`).join(" + ")
      : null;

  return (
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
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 6,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          💰 Payouts — pay {winner.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Dues + cut penalties{chain.length > 0 ? " incl. rolled-over majors" : ""}
        </div>
      </div>

      {owedRows.map((r) => {
        const color = PLAYER_COLORS[r.id] ?? "#5a5a55";
        const bg = PLAYER_BG_COLORS[r.id] ?? "#F1EFE8";
        return (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: color, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {r.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
              {breakdown(r.parts) && (
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {breakdown(r.parts)}
                </div>
              )}
            </div>
            <span style={{
              fontSize: 14, fontWeight: 700,
              padding: "2px 10px", borderRadius: "var(--radius-sm)",
              background: bg, color,
            }}>
              ${r.total}
            </span>
          </div>
        );
      })}

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", fontSize: 13, fontWeight: 600,
        borderBottom: "1px solid var(--border)",
      }}>
        <span>Total owed to {winner.name}</span>
        <span style={{ color: winnerColor }}>${owedTotal}</span>
      </div>

      {winnerRow && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 14px", fontSize: 12, color: "var(--text-secondary)",
        }}>
          <span>
            {winner.name}'s own contribution (already in the pot
            {breakdown(winnerRow.parts) ? `: ${breakdown(winnerRow.parts)}` : ""})
          </span>
          <span>${winnerRow.total}</span>
        </div>
      )}
    </div>
  );
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

export function ArchivedPicks({ archive, majors = [] }: Props) {
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

      {/* Payout summary — only when a pool member won this major */}
      {winner_id && <WinnerPayouts archive={archive} majors={majors} />}

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
