// ─── Core domain types ────────────────────────────────────────────────────────

export type TournamentPhase = "pre" | "round1" | "round2" | "round3" | "round4" | "complete";

export interface GolferScore {
  espn_id: string;
  name: string;
  display_name: string;
  position: string;          // "T3", "1", "CUT", "WD"
  score_to_par: number;      // -4, 0, 3
  score_to_par_str: string;  // "-4", "E", "+3"
  thru: string;              // "9", "F", "-" (not started)
  round_scores: number[];    // [68, 71, 0, 0]
  today_score: number;       // current round score to par
  status: "active" | "cut" | "wd" | "dq" | "complete";
  cut_made: boolean | null;  // null = not yet determined
  last_updated: string;      // ISO timestamp
}

export interface OddsPlayer {
  name: string;
  win_probability: number;   // 0–100
  cut_probability?: number;  // 0–100, from make-cut market (undefined if market unavailable)
  implied_odds: number;      // american odds e.g. +1200
  sportsbook: string;
  last_updated: string;
}

export interface PoolPlayer {
  id: string;
  name: string;
  color: string;
  dues_owed: number;
  picks: PoolPick[];
}

export interface PoolPick {
  round_slot: 1 | 2 | 3 | 4;
  golfer_name: string;
  espn_id: string | null;    // resolved after matching to ESPN data
}

export interface EnrichedPick extends PoolPick {
  score?: GolferScore;
  win_probability?: number;
  cut_probability?: number;
}

export interface EnrichedPoolPlayer extends PoolPlayer {
  enriched_picks: EnrichedPick[];
  cut_penalties: number;     // number of golfers who missed cut × $5
  best_score: number | null; // best current score among picks
  leading_golfer: string | null;
  combined_win_odds: number; // product of individual win probabilities
  luck_score: number;        // cut-proximity score (see pool-engine)
}

export interface PotSummary {
  base_dues: number;
  rollover_total: number;        // sum of all prior tournament rollovers
  rollover_label: string;        // human-readable label e.g. "Masters 2026 rollover"
  cut_penalties_total: number;
  total: number;
}

export interface LeaderboardSnapshot {
  tournament_name: string;
  phase: TournamentPhase;
  current_round: number;
  cut_line: number | null;   // score-to-par cut line e.g. +3
  projected_cut: number | null;
  last_updated: string;
  players: GolferScore[];
}

export interface DashboardData {
  snapshot: LeaderboardSnapshot;
  pool_players: EnrichedPoolPlayer[];
  odds: OddsPlayer[];
  pot: PotSummary;
  luckiest: string[];  // pool player ids who share the highest luck_score
}

export interface MajorSummary {
  major_id: string;
  major_name: string;
  short_name: string;
  winner_id: string | null;
  pot_total: number;
  archived_at: string;
}
