import { PoolPlayer } from "../types";

// ─── Pool configuration ────────────────────────────────────────────────────────
// Edit this file to update picks or player info before each major.
// dues_owed = U.S. Open $10 per player.
// Picks are sourced live from the draft (Supabase pool_picks) — the "TBD"
// placeholders below are only the pre-draft fallback.

export const POOL_PLAYERS: PoolPlayer[] = [
  {
    id: "sullivan",
    name: "Sullivan",
    color: "blue",
    dues_owed: 10,
    picks: [
      { round_slot: 1, golfer_name: "TBD", espn_id: null },
      { round_slot: 2, golfer_name: "TBD", espn_id: null },
      { round_slot: 3, golfer_name: "TBD", espn_id: null },
      { round_slot: 4, golfer_name: "TBD", espn_id: null },
    ],
  },
  {
    id: "mikael",
    name: "Mikael",
    color: "purple",
    dues_owed: 10,
    picks: [
      { round_slot: 1, golfer_name: "TBD", espn_id: null },
      { round_slot: 2, golfer_name: "TBD", espn_id: null },
      { round_slot: 3, golfer_name: "TBD", espn_id: null },
      { round_slot: 4, golfer_name: "TBD", espn_id: null },
    ],
  },
  {
    id: "mike",
    name: "Mike",
    color: "amber",
    dues_owed: 10,
    picks: [
      { round_slot: 1, golfer_name: "TBD", espn_id: null },
      { round_slot: 2, golfer_name: "TBD", espn_id: null },
      { round_slot: 3, golfer_name: "TBD", espn_id: null },
      { round_slot: 4, golfer_name: "TBD", espn_id: null },
    ],
  },
  {
    id: "buer",
    name: "Buer",
    color: "coral",
    dues_owed: 10,
    picks: [
      { round_slot: 1, golfer_name: "TBD", espn_id: null },
      { round_slot: 2, golfer_name: "TBD", espn_id: null },
      { round_slot: 3, golfer_name: "TBD", espn_id: null },
      { round_slot: 4, golfer_name: "TBD", espn_id: null },
    ],
  },
  {
    id: "robbie",
    name: "Robbie",
    color: "teal",
    dues_owed: 10,
    picks: [
      { round_slot: 1, golfer_name: "TBD", espn_id: null },
      { round_slot: 2, golfer_name: "TBD", espn_id: null },
      { round_slot: 3, golfer_name: "TBD", espn_id: null },
      { round_slot: 4, golfer_name: "TBD", espn_id: null },
    ],
  },
  {
    id: "caleb",
    name: "Caleb",
    color: "pink",
    dues_owed: 10,
    picks: [
      { round_slot: 1, golfer_name: "TBD", espn_id: null },
      { round_slot: 2, golfer_name: "TBD", espn_id: null },
      { round_slot: 3, golfer_name: "TBD", espn_id: null },
      { round_slot: 4, golfer_name: "TBD", espn_id: null },
    ],
  },
  {
    id: "alex",
    name: "Alex",
    color: "gray",
    dues_owed: 10,
    picks: [
      { round_slot: 1, golfer_name: "TBD", espn_id: null },
      { round_slot: 2, golfer_name: "TBD", espn_id: null },
      { round_slot: 3, golfer_name: "TBD", espn_id: null },
      { round_slot: 4, golfer_name: "TBD", espn_id: null },
    ],
  },
];

// Pot breakdown — no one picked the PGA Championship winner (Aaron Rai, −9),
// so the entire PGA pot rolls into the U.S. Open.
// Base PGA dues = 7 players × $10 = $70 → recorded as $10 per player below.
// If PGA cut-penalty money should also carry over, bump these per-player amounts
// so they sum to the full archived PGA pot total.
export const POT_CONFIG = {
  dues_per_player: 10,
  cut_penalty: 5,
  rollover_label: "PGA Championship 2026 rollover",
  rollovers: {
    sullivan: { pga_2026: 10 },
    mikael:   { pga_2026: 10 },
    mike:     { pga_2026: 10 },
    buer:     { pga_2026: 10 },
    robbie:   { pga_2026: 10 },
    caleb:    { pga_2026: 10 },
    alex:     { pga_2026: 10 },
  } as Record<string, Record<string, number>>,
};
