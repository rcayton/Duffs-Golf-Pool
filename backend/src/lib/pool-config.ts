import { PoolPlayer } from "../types";

// ─── Pool configuration ────────────────────────────────────────────────────────
// Edit this file to update picks or player info before each major.
// dues_owed = $10 per player per major (currently the 2027 Masters).
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

// Pot breakdown — no one picked the 2026 Open Championship winner (Ryan Fox,
// −10), so the entire Open pot rolls into the 2027 Masters.
// Open pot = $70 base + $35 cut penalties (7 missed cuts) = $105 → recorded as
// $15 per player below (7 × $15 = $105).
export const POT_CONFIG = {
  dues_per_player: 10,
  cut_penalty: 5,
  rollover_label: "The Open 2026 rollover",
  rollovers: {
    sullivan: { the_open_2026: 15 },
    mikael:   { the_open_2026: 15 },
    mike:     { the_open_2026: 15 },
    buer:     { the_open_2026: 15 },
    robbie:   { the_open_2026: 15 },
    caleb:    { the_open_2026: 15 },
    alex:     { the_open_2026: 15 },
  } as Record<string, Record<string, number>>,
};
