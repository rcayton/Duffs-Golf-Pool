// ─── Historical selection results ─────────────────────────────────────────────
// Baseline figures through the 2026 Open Championship (pre-2027 Masters).
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
//
// The Open Championship 2026 (baked in):
//   Winner: none — Ryan Fox (−10) unpicked, pot ($105) rolled into 2027 Masters
//   Pot: $105 ($70 base + $35 cut penalties, 7 missed cuts)
//   Missed cuts (7): Wyndham Clark + Joaquin Niemann (mikael), Tom Kim (mike),
//                Jordan Spieth (buer),
//                Matt Fitzpatrick + Viktor Hovland + Justin Rose (robbie)

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
    entries: 17,
    money_won: 485,
    money_lost: 260,   // +$25 Open (3 cuts)
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
    entries: 17,
    money_won: 400,    // +$220 U.S. Open 2026 pot win
    money_lost: 260,   // +$15 Open (1 cut)
    win_majors: ["US Open 2024", "Masters 2025", "U.S. Open 2026"],
  },
  {
    id: "mike",
    wins: 3,
    entries: 17,
    money_won: 445,
    money_lost: 280,   // +$15 Open (1 cut)
    win_majors: ["PGA Championship 2023", "2024 Olympics", "Masters 2026"],
  },
  {
    id: "alex",
    wins: 1,
    entries: 16,
    money_won: 165,
    money_lost: 250,   // +$10 Open (no cuts)
    win_majors: ["The Open Championship 2023"],
  },
  {
    id: "caleb",
    wins: 1,
    entries: 17,
    money_won: 85,
    money_lost: 270,   // +$10 Open (no cuts)
    win_majors: ["Masters 2024"],
  },
  {
    id: "mikael",
    wins: 1,
    entries: 14,
    money_won: 85,
    money_lost: 225,   // +$20 Open (2 cuts)
    win_majors: ["PGA Championship 2024"],
  },
  {
    id: "sullivan",
    wins: 0,
    entries: 13,
    money_won: 0,
    money_lost: 240,   // +$10 Open (no cuts)
    win_majors: [],
  },
];
