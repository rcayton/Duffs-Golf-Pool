// ─── Historical selection results ─────────────────────────────────────────────
// Baseline figures through the 2026 U.S. Open (pre-Open Championship 2026).
// money_won / money_lost in whole dollars. win_majors lists the tournament
// names for each win. These are never mutated at runtime — the leaderboard
// component adds the current tournament on top when the phase is "complete".
//
// Masters 2026 (baked in):
//   Winner: Mike (picked Rory McIlroy)
//   Pot: $340 ($70 base + $140 US Open rollover + $105 Open Champ rollover + $25 cut penalties)
//   Missed cuts: MacIntyre (sullivan), Min Woo Lee (sullivan),
//                DeChambeau (buer), Højgaard (robbie), Bhatia (alex)
//
// PGA Championship 2026 (baked in):
//   Winner: none — Aaron Rai (−9) unpicked, pot rolled over
//   Pot: $110 ($70 base + $40 cut penalties)
//   Missed cuts: Spaun (sullivan), Henley + Bradley (mikael),
//                DeChambeau + Scott (mike), Fleetwood (buer),
//                Hovland (robbie), Hatton (caleb)
//
// U.S. Open 2026 (baked in):
//   Winner: Buer (picked champion Wyndham Clark, −4)
//   Pot: $220 ($70 base + $40 cut penalties + $110 PGA rollover)
//   Missed cuts: Koepka (mikael), Spaun (mike), Rahm + Reed (buer),
//                Si Woo Kim + Hovland (robbie), DeChambeau + Cantlay (caleb)

export interface PlayerHistory {
  id: string;         // matches PoolPlayer.id
  wins: number;
  entries: number;
  money_won: number;
  money_lost: number;
  win_majors: string[];
}

export const PLAYER_HISTORY: PlayerHistory[] = [
  {
    id: "robbie",
    wins: 4,
    entries: 16,
    money_won: 485,
    money_lost: 235,   // +$15 PGA (1 cut) +$20 US Open (2 cuts)
    win_majors: [
      "Masters 2023",
      "The Open Championship 2024",
      "PGA Championship 2025",
      "The Open 2025",
    ],
  },
  {
    id: "buer",
    wins: 3,
    entries: 16,
    money_won: 400,    // +$220 U.S. Open 2026 pot win
    money_lost: 245,   // +$15 PGA (1 cut) +$20 US Open (2 cuts)
    win_majors: ["US Open 2024", "Masters 2025", "U.S. Open 2026"],
  },
  {
    id: "mike",
    wins: 3,
    entries: 16,
    money_won: 445,
    money_lost: 265,   // +$20 PGA (2 cuts) +$15 US Open (1 cut)
    win_majors: ["PGA Championship 2023", "2024 Olympics", "Masters 2026"],
  },
  {
    id: "alex",
    wins: 1,
    entries: 15,
    money_won: 165,
    money_lost: 240,   // +$10 PGA (no cuts) +$10 US Open (no cuts)
    win_majors: ["The Open Championship 2023"],
  },
  {
    id: "caleb",
    wins: 1,
    entries: 16,
    money_won: 85,
    money_lost: 260,   // +$15 PGA (1 cut) +$20 US Open (2 cuts)
    win_majors: ["Masters 2024"],
  },
  {
    id: "mikael",
    wins: 1,
    entries: 13,
    money_won: 85,
    money_lost: 205,   // +$20 PGA (2 cuts) +$15 US Open (1 cut)
    win_majors: ["PGA Championship 2024"],
  },
  {
    id: "sullivan",
    wins: 0,
    entries: 12,
    money_won: 0,
    money_lost: 230,   // +$15 PGA (1 cut) +$10 US Open (no cuts)
    win_majors: [],
  },
];
