import axios from "axios";
import { GolferScore, LeaderboardSnapshot, TournamentPhase } from "../types";

// Augusta National's own live scoring feed.
// Confirmed working during 2026 Masters Round 2 (April 10 2026).
// No auth, no API key, no rate limits. Updates ~every 30s during rounds.
const MASTERS_SCORES_URL =
  "https://www.masters.com/en_US/scores/feeds/2026/scores.json";

// ─── Raw response types ────────────────────────────────────────────────────────

interface MastersRound {
  prior: number | null;
  fantasy: number | null;        // score-to-par for this round
  total: number | null;          // gross score, null if not played
  roundStatus: "Pre" | "Playing" | "Finished" | string;
  teetime: string;
  scores: (number | null)[];     // 18 hole gross scores; null = not played yet
}

interface MastersPlayer {
  id: string;
  full_name: string;             // "Sam Burns"
  first_name: string;            // "Sam"
  last_name: string;             // "Burns"
  display_name: string;          // "BURNS"
  display_name2: string;         // "Burns"
  countryName: string;
  countryCode: string;
  amateur: boolean;
  active: boolean;               // true = currently on the course this round
  status: string;                // "N"=normal, "A"=active, "W"=WD, "D"=DQ
  // newStatus examples seen live: "F1"=finished R1/not started R2,
  //   "A2"=active in R2, "C"=cut, "W"=withdrawn
  newStatus: string;
  pos: string;                   // "T1", "1", "CUT", "WD", "MC"
  topar: string;                 // "-5", "E", "+3", "" if DNF
  today: string;                 // today's score-to-par string; "" = not started
  thru: string;                  // "14", "F", "" = not started
  holeProgress: number;          // which round (1, 2, 3, 4)
  lastHoleWithShot: string;      // "2|15" = round 2 through hole 15
  sort_order: number;
  round1: MastersRound;
  round2: MastersRound;
  round3: MastersRound;
  round4: MastersRound;
}

interface MastersData {
  fileEpoch: string;             // unix timestamp — increments on each update
  data: {
    // "0100" = round 2 is the active round (position of "1" = round index)
    currentRound: string;
    wallClockTime: string;       // "11:58:50 2026-04-10"
    // "FPNN" = R1:Finished R2:Playing R3:Not-started R4:Not-started
    statusRound: string;
    cutLine: string;             // "+3", "-1", etc.
    yardages: Record<string, number[]>;
    pars: number[];
    player: MastersPlayer[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// "0100" → 2  (position of the "1" character, 1-indexed)
function parseCurrentRound(cr: string): number {
  if (!cr) return 0;
  const idx = cr.indexOf("1");
  return idx >= 0 ? idx + 1 : 0;
}

// "FPNN" → TournamentPhase
// F=Finished, P=Playing, N=Not-started
function determinePhase(statusRound: string): TournamentPhase {
  const r = (statusRound ?? "NNNN").split("");
  if (r.every(c => c === "N")) return "pre";
  if (r[3] === "F") return "complete";
  if (r[3] === "P") return "round4";
  if (r[2] === "P") return "round3";
  if (r[1] === "P") return "round2";
  if (r[0] === "P") return "round1";
  // R1 finished, R2 not yet started
  if (r[0] === "F" && r[1] === "N") return "round1";
  return "round2";
}

function parseScoreStr(s: string | null | undefined): number {
  if (!s || s === "E" || s === "") return 0;
  const n = parseInt(s.replace("+", ""), 10);
  return isNaN(n) ? 0 : n;
}

function parseThru(p: MastersPlayer): string {
  // Not yet started this round
  if (!p.thru || p.thru === "") return "-";
  // Completed the round
  if (p.thru === "F") return "F";
  // Mid-round: thru is a hole number string e.g. "14"
  return p.thru;
}

function parseStatus(p: MastersPlayer): GolferScore["status"] {
  const ns = (p.newStatus ?? "").toUpperCase();
  const s  = (p.status   ?? "").toUpperCase();
  if (ns === "C" || p.pos === "CUT" || p.pos === "MC") return "cut";
  if (ns.startsWith("W") || s === "W") return "wd";
  if (ns.startsWith("D") || s === "D") return "dq";
  return "active";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchLeaderboard(): Promise<LeaderboardSnapshot> {
  const res = await axios.get<MastersData>(MASTERS_SCORES_URL, {
    timeout: 12000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MastersPool/1.0)",
      "Accept":  "application/json",
      "Cache-Control": "no-cache",
    },
    // Append timestamp to bypass CDN cache
    params: { _t: Date.now() },
  });

  const raw = res.data;
  if (!raw?.data?.player?.length) {
    throw new Error("masters.com scores.json returned no player data");
  }

  const d            = raw.data;
  const statusRound  = d.statusRound  ?? "NNNN";
  const currentRound = parseCurrentRound(d.currentRound);
  const phase        = determinePhase(statusRound);

  // cutLine is the official cut ("+3") or projected cut mid-R2
  const cutLineStr = d.cutLine ?? null;
  const cutLineVal = cutLineStr ? parseScoreStr(cutLineStr) : null;

  const players: GolferScore[] = d.player.map((p) => {
    const status     = parseStatus(p);
    const scoreToPar = parseScoreStr(p.topar);
    const thru       = parseThru(p);

    // Per-round score-to-par values (fantasy field = score-to-par for that round)
    const roundRefs  = [p.round1, p.round2, p.round3, p.round4];
    const roundScores = roundRefs.map((r) => {
      if (!r || r.total === null || r.roundStatus === "Pre") return 0;
      return r.fantasy ?? 0;
    });

    // Today's score to par — "" means not started, treat as 0
    const todayScore = parseScoreStr(p.today);

    // Cut determination: null during R1, set from R2 onward
    let cutMade: boolean | null = null;
    if (phase !== "pre" && phase !== "round1") {
      cutMade = status !== "cut";
    }

    return {
      espn_id:          p.id,
      name:             p.full_name,
      display_name:     p.full_name,
      position:         p.pos || "--",
      score_to_par:     scoreToPar,
      score_to_par_str: p.topar || "E",
      thru,
      round_scores:     roundScores,
      today_score:      todayScore,
      status,
      cut_made:         cutMade,
      last_updated:     new Date().toISOString(),
    };
  });

  // Active players sorted by score; cut/wd/dq at the bottom
  players.sort((a, b) => {
    const aOut = a.status === "cut" || a.status === "wd" || a.status === "dq";
    const bOut = b.status === "cut" || b.status === "wd" || b.status === "dq";
    if (aOut && !bOut) return 1;
    if (!aOut && bOut) return -1;
    return a.score_to_par - b.score_to_par;
  });

  console.log(
    `  masters.com: ${players.length} players | ` +
    `phase=${phase} round=${currentRound} | ` +
    `statusRound=${statusRound} cut=${cutLineStr ?? "n/a"} | ` +
    `epoch=${raw.fileEpoch}`
  );

  return {
    tournament_name: "2026 Masters Tournament",
    phase,
    current_round:   currentRound,
    cut_line:        cutLineVal,
    projected_cut:   cutLineVal,
    last_updated:    new Date().toISOString(),
    players,
  };
}
