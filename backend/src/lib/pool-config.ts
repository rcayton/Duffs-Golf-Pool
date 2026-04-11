import { PoolPlayer } from "../types";

// ─── Pool configuration ────────────────────────────────────────────────────────
// Edit this file to update picks or player info.
// dues_owed = Masters $10 + US Open rollover + Open Championship rollover

export const POOL_PLAYERS: PoolPlayer[] = [
  {
    id: "sullivan",
    name: "Sullivan",
    color: "blue",
    dues_owed: 45,
    picks: [
      { round_slot: 1, golfer_name: "Scottie Scheffler", espn_id: null },
      { round_slot: 2, golfer_name: "Robert MacIntyre", espn_id: null },
      { round_slot: 3, golfer_name: "Min Woo Lee", espn_id: null },
      { round_slot: 4, golfer_name: "Sepp Straka", espn_id: null },
    ],
  },
  {
    id: "mikael",
    name: "Mikael",
    color: "purple",
    dues_owed: 40,
    picks: [
      { round_slot: 1, golfer_name: "Jon Rahm", espn_id: null },
      { round_slot: 2, golfer_name: "Viktor Hovland", espn_id: null },
      { round_slot: 3, golfer_name: "Si Woo Kim", espn_id: null },
      { round_slot: 4, golfer_name: "Russell Henley", espn_id: null },
    ],
  },
  {
    id: "mike",
    name: "Mike",
    color: "amber",
    dues_owed: 50,
    picks: [
      { round_slot: 1, golfer_name: "Rory McIlroy", espn_id: null },
      { round_slot: 2, golfer_name: "Jordan Spieth", espn_id: null },
      { round_slot: 3, golfer_name: "Brooks Koepka", espn_id: null },
      { round_slot: 4, golfer_name: "Patrick Cantlay", espn_id: null },
    ],
  },
  {
    id: "buer",
    name: "Buer",
    color: "coral",
    dues_owed: 40,
    picks: [
      { round_slot: 1, golfer_name: "Bryson DeChambeau", espn_id: null },
      { round_slot: 2, golfer_name: "Collin Morikawa", espn_id: null },
      { round_slot: 3, golfer_name: "Corey Conners", espn_id: null },
      { round_slot: 4, golfer_name: "Patrick Reed", espn_id: null },
    ],
  },
  {
    id: "robbie",
    name: "Robbie",
    color: "teal",
    dues_owed: 50,
    picks: [
      { round_slot: 1, golfer_name: "Ludvig Åberg", espn_id: null },
      { round_slot: 2, golfer_name: "Tommy Fleetwood", espn_id: null },
      { round_slot: 3, golfer_name: "Chris Gotterup", espn_id: null },
      { round_slot: 4, golfer_name: "Nicolai Højgaard", espn_id: null },
    ],
  },
  {
    id: "caleb",
    name: "Caleb",
    color: "pink",
    dues_owed: 40,
    picks: [
      { round_slot: 1, golfer_name: "Cam Young", espn_id: null },
      { round_slot: 2, golfer_name: "Hideki Matsuyama", espn_id: null },
      { round_slot: 3, golfer_name: "Justin Rose", espn_id: null },
      { round_slot: 4, golfer_name: "Jake Knapp", espn_id: null },
    ],
  },
  {
    id: "alex",
    name: "Alex",
    color: "gray",
    dues_owed: 40,
    picks: [
      { round_slot: 1, golfer_name: "Xander Schauffele", espn_id: null },
      { round_slot: 2, golfer_name: "Matt Fitzpatrick", espn_id: null },
      { round_slot: 3, golfer_name: "Justin Thomas", espn_id: null },
      { round_slot: 4, golfer_name: "Akshay Bhatia", espn_id: null },
    ],
  },
];

// Pot breakdown from prior rollovers
export const POT_CONFIG = {
  masters_dues_per_player: 10,
  cut_penalty: 5,
  rollovers: {
    sullivan: { us_open: 20, open_championship: 15 },
    mikael:   { us_open: 20, open_championship: 20 },
    mike:     { us_open: 25, open_championship: 15 },
    buer:     { us_open: 20, open_championship: 10 },
    robbie:   { us_open: 25, open_championship: 15 },
    caleb:    { us_open: 15, open_championship: 15 },
    alex:     { us_open: 15, open_championship: 15 },
  } as Record<string, { us_open: number; open_championship: number }>,
};
