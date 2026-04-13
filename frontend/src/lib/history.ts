// ─── Historical selection results ─────────────────────────────────────────────
// Baseline figures through Masters 2026 (pre-PGA Championship 2026).
// money_won / money_lost in whole dollars. win_majors lists the tournament
// names for each win. These are never mutated at runtime — the leaderboard
// component adds the current tournament on top when the phase is "complete".
//
// Masters 2026 results (baked in):
//   Winner: Mike (picked Rory McIlroy)
//   Pot: $340 ($70 base + $140 US Open rollover + $105 Open Champ rollover + $25 cut penalties)
//   Missed cuts: MacIntyre (sullivan), Min Woo Lee (sullivan),
//                DeChambeau (buer), Højgaard (robbie), Bhatia (alex)

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
    entries: 14,
    money_won: 485,
    money_lost: 200,   // +$55 (dues $50 + Højgaard cut $5)
    win_majors: [
      "Masters 2023",
      "The Open Championship 2024",
      "PGA Championship 2025",
      "The Open 2025",
    ],
  },
  {
    id: "buer",
    wins: 2,
    entries: 14,
    money_won: 180,
    money_lost: 210,   // +$45 (dues $40 + DeChambeau cut $5)
    win_majors: ["US Open 2024", "Masters 2025"],
  },
  {
    id: "mike",
    wins: 3,
    entries: 14,
    money_won: 445,    // +$340 pot win
    money_lost: 230,   // +$50 dues (no cut penalties)
    win_majors: ["PGA Championship 2023", "2024 Olympics", "Masters 2026"],
  },
  {
    id: "alex",
    wins: 1,
    entries: 13,
    money_won: 165,
    money_lost: 220,   // +$45 (dues $40 + Bhatia cut $5)
    win_majors: ["The Open Championship 2023"],
  },
  {
    id: "caleb",
    wins: 1,
    entries: 14,
    money_won: 85,
    money_lost: 225,   // +$40 dues (no cut penalties)
    win_majors: ["Masters 2024"],
  },
  {
    id: "mikael",
    wins: 1,
    entries: 11,
    money_won: 85,
    money_lost: 170,   // +$40 dues (no cut penalties)
    win_majors: ["PGA Championship 2024"],
  },
  {
    id: "sullivan",
    wins: 0,
    entries: 10,
    money_won: 0,
    money_lost: 205,   // +$55 (dues $45 + MacIntyre + Min Woo Lee cuts $10)
    win_majors: [],
  },
];
