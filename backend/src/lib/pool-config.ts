import { PoolPlayer } from "../types";

// ─── Pool configuration ────────────────────────────────────────────────────────
// Edit this file to update picks or player info before each major.
// dues_owed = $10 per player per major (currently The Open Championship 2026).
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

// Pot breakdown — Buer won the 2026 U.S. Open (picked champion Wyndham Clark),
// taking the entire pot including the PGA Championship rollover.
// The pot therefore resets to $0 rollover for The Open Championship 2026.
export const POT_CONFIG = {
  dues_per_player: 10,
  cut_penalty: 5,
  rollover_label: "Rollover",
  rollovers: {
    sullivan: { us_open_2026: 0 },
    mikael:   { us_open_2026: 0 },
    mike:     { us_open_2026: 0 },
    buer:     { us_open_2026: 0 },
    robbie:   { us_open_2026: 0 },
    caleb:    { us_open_2026: 0 },
    alex:     { us_open_2026: 0 },
  } as Record<string, Record<string, number>>,
};
