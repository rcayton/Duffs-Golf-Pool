import { PoolPlayer } from "../types";

// ─── Pool configuration ────────────────────────────────────────────────────────
// Edit this file to update picks or player info before each major.
// dues_owed = PGA Championship $10 per player (no rollover — Mike won Masters 2026)

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

// Pot breakdown — no rollover from Masters 2026 (Mike won)
export const POT_CONFIG = {
  dues_per_player: 10,
  cut_penalty: 5,
  rollovers: {
    sullivan: { masters_2026: 0 },
    mikael:   { masters_2026: 0 },
    mike:     { masters_2026: 0 },
    buer:     { masters_2026: 0 },
    robbie:   { masters_2026: 0 },
    caleb:    { masters_2026: 0 },
    alex:     { masters_2026: 0 },
  } as Record<string, { masters_2026: number }>,
};
