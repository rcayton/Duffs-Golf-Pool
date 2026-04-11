// ─── Historical selection results ─────────────────────────────────────────────
// Baseline figures through Masters 2025 (pre-Masters 2026).
// money_won / money_lost in whole dollars. win_majors lists the tournament
// names for each win. These are never mutated at runtime — the leaderboard
// component adds the current tournament on top when the phase is "complete".

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
    entries: 13,
    money_won: 485,
    money_lost: 145,
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
    entries: 13,
    money_won: 180,
    money_lost: 165,
    win_majors: ["US Open 2024", "Masters 2025"],
  },
  {
    id: "alex",
    wins: 1,
    entries: 12,
    money_won: 165,
    money_lost: 175,
    win_majors: ["The Open Championship 2023"],
  },
  {
    id: "mikael",
    wins: 1,
    entries: 10,
    money_won: 85,
    money_lost: 130,
    win_majors: ["PGA Championship 2024"],
  },
  {
    id: "mike",
    wins: 2,
    entries: 13,
    money_won: 105,
    money_lost: 180,
    win_majors: ["PGA Championship 2023", "2024 Olympics"],
  },
  {
    id: "caleb",
    wins: 1,
    entries: 13,
    money_won: 85,
    money_lost: 185,
    win_majors: ["Masters 2024"],
  },
  {
    id: "sullivan",
    wins: 0,
    entries: 9,
    money_won: 0,
    money_lost: 150,
    win_majors: [],
  },
];
