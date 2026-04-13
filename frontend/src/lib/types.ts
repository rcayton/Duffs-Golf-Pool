export type TournamentPhase =
  | "pre"
  | "round1"
  | "round2"
  | "round3"
  | "round4"
  | "complete";

export interface GolferScore {
  espn_id: string;
  name: string;
  display_name: string;
  position: string;
  score_to_par: number;
  score_to_par_str: string;
  thru: string;
  round_scores: number[];
  today_score: number;
  status: "active" | "cut" | "wd" | "dq" | "complete";
  cut_made: boolean | null;
  last_updated: string;
}

export interface OddsPlayer {
  name: string;
  win_probability: number;
  implied_odds: number;
  sportsbook: string;
  last_updated: string;
}

export interface EnrichedPick {
  round_slot: 1 | 2 | 3 | 4;
  golfer_name: string;
  espn_id: string | null;
  score?: GolferScore;
  win_probability: number;
  cut_probability: number;
}

export interface EnrichedPoolPlayer {
  id: string;
  name: string;
  color: string;
  dues_owed: number;
  enriched_picks: EnrichedPick[];
  cut_penalties: number;
  best_score: number | null;
  leading_golfer: string | null;
  combined_win_odds: number; // probability all 4 picks win (product of individual odds)
  luck_score: number;
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
  cut_line: number | null;
  projected_cut: number | null;
  last_updated: string;
  players: GolferScore[];
}

export interface DashboardData {
  snapshot: LeaderboardSnapshot;
  pool_players: EnrichedPoolPlayer[];
  odds: OddsPlayer[];
  pot: PotSummary;
  luckiest: string[];
}

export interface MajorInfo {
  id: string;
  name: string;
  short_name: string;
  year: number;
  dates: string;
  source: "masters" | "espn";
  is_active: boolean;
  is_archived: boolean;
  archive_summary: {
    winner_id: string | null;
    pot_total: number;
    archived_at: string;
  } | null;
}

export interface MajorArchive {
  major_id: string;
  major_name: string;
  short_name: string;
  pool_players: EnrichedPoolPlayer[];
  snapshot: LeaderboardSnapshot;
  pot_total: number;
  winner_id: string | null;
  archived_at: string;
}
