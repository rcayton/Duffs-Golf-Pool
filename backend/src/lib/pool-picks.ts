import { supabase } from "./supabase";
import { POOL_PLAYERS, POT_CONFIG } from "./pool-config";
import { ACTIVE_MAJOR } from "./major-config";
import { PoolPlayer, PoolPick } from "../types";

// ─── loadPoolPlayers ───────────────────────────────────────────────────────────
// Returns the pool players with picks sourced from Supabase (pool_picks table).
// Falls back to "TBD" for any round_slot that has no row yet (pre-draft state).
// This is an async replacement for directly importing POOL_PLAYERS with picks.

export async function loadPoolPlayers(): Promise<PoolPlayer[]> {
  const { data, error } = await supabase
    .from("pool_picks")
    .select("player_id, round_slot, golfer_name, espn_id")
    .eq("major_id", ACTIVE_MAJOR.id);

  if (error) {
    console.warn("[pool-picks] Failed to load pool_picks, falling back to TBD:", error.message);
  }

  // Index by player_id → round_slot → row
  const byPlayer: Record<string, Record<number, { golfer_name: string; espn_id: string | null }>> = {};
  for (const row of data ?? []) {
    if (!byPlayer[row.player_id]) byPlayer[row.player_id] = {};
    byPlayer[row.player_id][row.round_slot] = {
      golfer_name: row.golfer_name,
      espn_id:     row.espn_id ?? null,
    };
  }

  // Merge with hardcoded player metadata (id, name, color, dues_owed)
  return POOL_PLAYERS.map((player) => {
    const playerRows = byPlayer[player.id] ?? {};
    const picks: PoolPick[] = [1, 2, 3, 4].map((slot) => ({
      round_slot: slot as 1 | 2 | 3 | 4,
      golfer_name: playerRows[slot]?.golfer_name ?? "TBD",
      espn_id:     playerRows[slot]?.espn_id ?? null,
    }));

    return {
      ...player,
      picks,
    };
  });
}

// Re-export POT_CONFIG so callers don't need to import pool-config separately
export { POT_CONFIG };
