import axios from "axios";
import { GolferScore, LeaderboardSnapshot, TournamentPhase } from "../types";
import { ACTIVE_MAJOR } from "../lib/major-config";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/golf/pga";
const EVENTS_URL = `${ESPN_BASE}/events`;

// ESPN raw types from the events endpoint
interface EspnEventCompetitor {
  id: string;
  displayName: string;
  abbreviation: string;
  shortName: string;
  score: string; // "-5", "E", "+3"
  order: number;
}

interface EspnEvent {
  id: string;
  name: string;
  date: string;
  fullStatus: {
    period: number;
    displayPeriod: string;
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
      description: string;
      detail: string;
      shortDetail: string;
    };
  };
  competitors: EspnEventCompetitor[];
}

interface EspnEventsResponse {
  league?: {
    name: string;
  };
  events?: EspnEvent[];
}

function parseScoreStr(displayValue: string): number {
  if (!displayValue || displayValue === "E" || displayValue === "--") return 0;
  return parseInt(displayValue.replace("+", ""), 10) || 0;
}

function parseStatus(detail: string): GolferScore["status"] {
  const lower = detail.toLowerCase();
  if (lower.includes("cut")) return "cut";
  if (lower.includes("withdraw") || lower.includes("wd")) return "wd";
  if (lower.includes("disqualif") || lower.includes("dq")) return "dq";
  return "active";
}

function determinePhase(period: number, completed: boolean): TournamentPhase {
  if (completed && period >= 4) return "complete";
  if (period === 0) return "pre";
  return `round${Math.min(period, 4) as 1 | 2 | 3 | 4}`;
}

export async function fetchLeaderboard(): Promise<LeaderboardSnapshot> {
  // If today is before the tournament start date, return a pre-tournament snapshot
  // without hitting ESPN (which would return the last completed event).
  const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  if (todayUtc < ACTIVE_MAJOR.start_date) {
    return {
      tournament_name: ACTIVE_MAJOR.name,
      phase: "pre",
      current_round: 0,
      cut_line: null,
      projected_cut: null,
      last_updated: new Date().toISOString(),
      players: [],
    };
  }

  // Request events scoped to the active major's week so we don't accidentally
  // pick up the prior tournament (e.g. Masters data while PGA hasn't started).
  const startYmd = ACTIVE_MAJOR.start_date.replace(/-/g, ""); // "20260514"
  const endDate  = new Date(new Date(ACTIVE_MAJOR.start_date).getTime() + 5 * 86_400_000);
  const endYmd   = endDate.toISOString().slice(0, 10).replace(/-/g, ""); // "20260519"

  const res = await axios.get<EspnEventsResponse>(
    `${EVENTS_URL}?limit=50&dates=${startYmd}-${endYmd}`,
    {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MastersPool/1.0)" },
    }
  );

  const event = res.data?.events?.[0];
  if (!event) throw new Error(`No ESPN event found for ${ACTIVE_MAJOR.name} (${startYmd}–${endYmd})`);

  const period = event.fullStatus?.period ?? 0;
  const completed = event.fullStatus?.type?.completed ?? false;
  const phase = determinePhase(period, completed);

  const detail = event.fullStatus?.type?.detail ?? "";

  // Parse cut line from detail string if available (e.g., "Round 2 - In Progress")
  const cutLine: number | null = null; // Not provided in this endpoint
  const projectedCut: number | null = null;

  const players: GolferScore[] = (event.competitors ?? []).map((c) => {
    const scoreToPar = parseScoreStr(c.score);

    return {
      espn_id: c.id,
      name: c.displayName,
      display_name: c.abbreviation || c.shortName,
      position: String(c.order),
      score_to_par: scoreToPar,
      score_to_par_str: c.score,
      thru: "F", // Scoreboard endpoint doesn't provide "thru" info
      round_scores: [0, 0, 0, 0], // Not available in this endpoint
      today_score: 0,
      status: parseStatus(detail),
      cut_made: null,
      last_updated: new Date().toISOString(),
    };
  });

  return {
    tournament_name: event.name ?? "Masters Tournament",
    phase,
    current_round: period,
    cut_line: cutLine,
    projected_cut: projectedCut,
    last_updated: new Date().toISOString(),
    players,
  };
}
