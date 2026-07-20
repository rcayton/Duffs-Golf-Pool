import axios from "axios";
import { GolferScore, LeaderboardSnapshot, TournamentPhase } from "../types";
import { ACTIVE_MAJOR, MajorConfig } from "../lib/major-config";

const GRAPHQL_URL = "https://orchestrator.pgatour.com/graphql";
const API_KEY = "da2-gsrx5bibzbb4njvhl7t37wqyl4";

// Tournament IDs: keyed by major config id (PGA Tour event ids, R{year}{event}).
// Exported so the draft field fetcher can resolve the active tournament's entry list.
export const TOURNAMENT_IDS: Record<string, string> = {
  pga_2026: "R2026033",
  us_open_2026: "R2026026",
  the_open_2026: "R2026100",
  // The Masters is PGA Tour event 014. The 2027 tournament isn't published in
  // the API yet (verified 9 months out) — confirm this id once the PGA Tour
  // posts the 2027 schedule. Until start_date, the leaderboard returns the
  // pre-tournament state regardless, so this id being unpublished is harmless.
  masters_2027: "R2027014",
};

function parseTotalStr(s: string): number {
  if (!s || s === "E" || s === "--" || s === "-") return 0;
  return parseInt(s.replace("+", ""), 10) || 0;
}

function parseRoundScore(s: string): number {
  if (!s || s === "-" || s === "--") return 0;
  return parseInt(s, 10) || 0;
}

function mapPlayerState(state: string, position: string): GolferScore["status"] {
  // Once a tournament completes, playerState becomes "COMPLETE" for everyone —
  // including cut/withdrawn players. The position string keeps the real outcome,
  // so check it first.
  const pos = (position ?? "").trim().toUpperCase();
  if (pos === "CUT") return "cut";
  if (pos === "WD")  return "wd";
  if (pos === "DQ")  return "dq";
  switch (state) {
    case "CUT":          return "cut";
    case "WITHDRAWN":    return "wd";
    case "DISQUALIFIED": return "dq";
    case "COMPLETE":     return "complete";
    default:             return "active";
  }
}

function determinePhase(
  tournamentStatus: string,
  roundHeader: string,
): TournamentPhase {
  if (tournamentStatus === "NOT_STARTED") return "pre";
  if (tournamentStatus === "COMPLETED")   return "complete";
  // IN_PROGRESS: roundHeader is "R1", "R2", "R3", "R4"
  const round = parseInt(roundHeader.replace("R", ""), 10);
  if (round >= 1 && round <= 4) return `round${round as 1 | 2 | 3 | 4}`;
  return "round1";
}

export async function fetchLeaderboard(): Promise<LeaderboardSnapshot> {
  return fetchLeaderboardForMajor(ACTIVE_MAJOR);
}

// Fetch any major's leaderboard (used by the backfill/archive tooling to pull
// final results for completed majors that are no longer the active one).
export async function fetchLeaderboardForMajor(
  major: Pick<MajorConfig, "id" | "name" | "start_date">
): Promise<LeaderboardSnapshot> {
  const tournamentId = TOURNAMENT_IDS[major.id];

  // Before tournament start, return a pre-tournament snapshot
  const todayUtc = new Date().toISOString().slice(0, 10);
  if (todayUtc < major.start_date || !tournamentId) {
    return {
      tournament_name: major.name,
      phase: "pre",
      current_round: 0,
      cut_line: null,
      projected_cut: null,
      last_updated: new Date().toISOString(),
      players: [],
    };
  }

  const query = `{
    leaderboardV3(id: "${tournamentId}") {
      id
      tournamentStatus
      leaderboardRoundHeader
      cutLineProbabilities {
        projectedCutLine
        probableCutLine
      }
      players {
        ... on PlayerRowV3 {
          id
          player {
            id
            displayName
            abbreviations
          }
          scoringData {
            position
            total
            totalSort
            thru
            score
            scoreSort
            playerState
            currentRound
            rounds
          }
        }
      }
    }
  }`;

  const res = await axios.post(
    GRAPHQL_URL,
    { query },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      timeout: 10000,
    }
  );

  const lb = res.data?.data?.leaderboardV3;
  if (!lb) {
    const errs = res.data?.errors?.map((e: any) => e.message).join("; ");
    throw new Error(`PGA Tour API error: ${errs ?? "No leaderboard data"}`);
  }

  const phase = determinePhase(lb.tournamentStatus, lb.leaderboardRoundHeader ?? "R1");
  const currentRound = lb.leaderboardRoundHeader
    ? parseInt(lb.leaderboardRoundHeader.replace("R", ""), 10) || 0
    : 0;

  const projectedCut: number | null =
    lb.cutLineProbabilities?.projectedCutLine != null
      ? parseTotalStr(String(lb.cutLineProbabilities.projectedCutLine))
      : null;

  const players: GolferScore[] = (lb.players ?? [])
    .filter((row: any) => row?.player)
    .map((row: any) => {
      const p = row.player;
      const s = row.scoringData;
      const scoreToPar = s.totalSort ?? parseTotalStr(s.total);
      const roundScores: number[] = Array.isArray(s.rounds)
        ? s.rounds.map((r: string) => parseRoundScore(r))
        : [0, 0, 0, 0];
      const status = mapPlayerState(s.playerState, s.position ?? "");

      return {
        espn_id: row.id,
        name: p.displayName,
        display_name: p.abbreviations || p.displayName,
        position: s.position ?? "",
        score_to_par: scoreToPar,
        score_to_par_str: s.total ?? "E",
        thru: s.thru ?? "-",
        round_scores: roundScores,
        today_score: s.scoreSort ?? parseTotalStr(s.score),
        status,
        cut_made: status === "cut" ? false : status === "active" ? null : true,
        last_updated: new Date().toISOString(),
      };
    });

  return {
    tournament_name: major.name,
    phase,
    current_round: currentRound,
    cut_line: null,
    projected_cut: projectedCut,
    last_updated: new Date().toISOString(),
    players,
  };
}
