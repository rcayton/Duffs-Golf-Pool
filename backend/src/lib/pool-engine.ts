import {
  DashboardData,
  EnrichedPick,
  EnrichedPoolPlayer,
  GolferScore,
  LeaderboardSnapshot,
  OddsPlayer,
  PoolPlayer,
  PotSummary,
} from "../types";
import { POOL_PLAYERS, POT_CONFIG } from "./pool-config";
import { loadPoolPlayers } from "./pool-picks";
import { simulateWinProbs } from "./golf-simulator";
import { ACTIVE_MAJOR } from "./major-config";

// ─── Name normalization ────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/ø/g, "o").replace(/Ø/g, "o")
    .replace(/æ/g, "ae").replace(/Æ/g, "ae")
    .replace(/ð/g, "d").replace(/þ/g, "th")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastName(normalized: string): string {
  return normalized.split(" ").pop() ?? normalized;
}

// ─── Score matching ────────────────────────────────────────────────────────────

function findGolferScore(
  pickName: string,
  players: GolferScore[]
): GolferScore | undefined {
  const normPick = normalizeName(pickName);
  const exact = players.find((p) => normalizeName(p.name) === normPick);
  if (exact) return exact;
  const pickLast = lastName(normPick);
  const byLast = players.find((p) => lastName(normalizeName(p.name)) === pickLast);
  if (byLast) return byLast;
  return players.find(
    (p) =>
      normalizeName(p.name).includes(normPick) ||
      normPick.includes(normalizeName(p.name))
  );
}

// ─── Odds matching (FanDuel fallback) ─────────────────────────────────────────

function findWinProb(pickName: string, odds: OddsPlayer[]): number {
  const normPick = normalizeName(pickName);
  let found = odds.find((o) => normalizeName(o.name) === normPick);
  if (found) return found.win_probability;
  const pickLast = lastName(normPick);
  found = odds.find((o) => lastName(normalizeName(o.name)) === pickLast);
  return found?.win_probability ?? 0;
}

// ─── Luck score model ──────────────────────────────────────────────────────────
// Measures how close each pool player's picks were to the cut without missing it.
// Only meaningful in round 3+ when cut_made is finalised.
//
//   At cut line exactly       → +5 pts  (luckiest possible)
//   Each stroke below cut     → −1 pt   (further below = less lucky)
//   5+ strokes below cut      →  0 pts  (safely through, no luck involved)
//   Missed cut                → −10 pts (big penalty)
//   Not yet determined        →  0 pts

const LUCK_MAX     = 5;   // points for sitting exactly at the cut line
const LUCK_PENALTY = -10; // penalty per pick that missed the cut
// Points drop by 1 per stroke below cut; 5+ strokes below earns 0 (LUCK_MAX = threshold)

function pickLuckPoints(
  score: GolferScore | undefined,
  cutLine: number | null
): number {
  if (!score || score.cut_made === null) return 0;
  if (score.cut_made === false)          return LUCK_PENALTY;

  // Made the cut — reward proximity to the cut line
  const cut = cutLine ?? 3; // fallback if cut line unknown
  const strokesBelow = cut - score.score_to_par; // positive = safely under cut
  return Math.max(0, LUCK_MAX - strokesBelow);
}

// ─── Cut probability model ─────────────────────────────────────────────────────

function estimateCutProb(
  scoreToPar: number,
  projectedCut: number | null,
  phase: string,
  thru: string
): number {
  if (phase === "pre") return 72;
  if (phase === "round3" || phase === "round4" || phase === "complete") {
    return 100;
  }
  const cutTarget       = projectedCut ?? 3;
  const strokesAboveCut = scoreToPar - cutTarget;
  const thruNum         = thru === "F" ? 36 : parseInt(thru, 10) || 0;
  const holesRemaining  = Math.max(0, 36 - thruNum);
  const variance        = Math.sqrt(holesRemaining * 0.0625);
  if (variance === 0) return strokesAboveCut <= 0 ? 100 : 0;
  const z    = -strokesAboveCut / variance;
  const prob = 1 / (1 + Math.exp(-1.7 * z));
  return Math.round(Math.min(99, Math.max(1, prob * 100)));
}

// ─── Pool enrichment ───────────────────────────────────────────────────────────

export function enrichPoolData(
  snapshot: LeaderboardSnapshot,
  odds: OddsPlayer[],
  poolPlayers: PoolPlayer[]
): EnrichedPoolPlayer[] {
  // Build win probability map:
  //   complete → winner gets 100%, everyone else 0%
  //   active rounds → hole-by-hole Monte Carlo
  //   pre → empty (fall back to FanDuel odds)
  let winProbMap: Map<string, number>;
  if (snapshot.phase === "complete") {
    const winner = snapshot.players.find((p) => p.position === "1");
    winProbMap = new Map<string, number>();
    snapshot.players.forEach((p) => {
      winProbMap.set(p.espn_id, p.espn_id === winner?.espn_id ? 100 : 0);
    });
  } else if (snapshot.phase !== "pre") {
    winProbMap = simulateWinProbs(snapshot.players, snapshot.phase, ACTIVE_MAJOR.id);
  } else {
    winProbMap = new Map<string, number>();
  }

  // Use Monte Carlo / winner map when populated; fall back to FanDuel for pre-tournament
  const useMonteCarloProbs = winProbMap.size > 0;

  return poolPlayers.map((player) => {
    const enrichedPicks: EnrichedPick[] = player.picks.map((pick) => {
      const score   = findGolferScore(pick.golfer_name, snapshot.players);

      // Win probability: Monte Carlo from live scores, fall back to FanDuel
      let winProb = 0;
      if (useMonteCarloProbs && score) {
        winProb = winProbMap.get(score.espn_id) ?? 0;
      }
      // Don't fall back to FanDuel for completed tournaments — winner map is authoritative
      if (winProb === 0 && snapshot.phase !== "complete") {
        winProb = findWinProb(pick.golfer_name, odds);
      }

      const cutProb = score
        ? estimateCutProb(
            score.score_to_par,
            snapshot.projected_cut,
            snapshot.phase,
            score.thru
          )
        : estimateCutProb(0, snapshot.projected_cut, snapshot.phase, "-");

      return {
        ...pick,
        espn_id:         score?.espn_id ?? null,
        score,
        win_probability: winProb,
        cut_probability: cutProb,
      };
    });

    const combinedWinOdds = parseFloat(
      enrichedPicks
        .reduce((sum, p) => sum + (p.win_probability ?? 0), 0)
        .toFixed(2)
    );

    const cutPenalties = enrichedPicks.filter(
      (p) => p.score?.cut_made === false
    ).length;

    const activeScores = enrichedPicks
      .filter((p) => p.score && p.score.status === "active")
      .map((p) => p.score!.score_to_par);

    const bestScore =
      activeScores.length > 0 ? Math.min(...activeScores) : null;

    const leadingPick = enrichedPicks.find(
      (p) => p.score?.score_to_par === bestScore
    );

    const luckScore = enrichedPicks.reduce(
      (sum, p) => sum + pickLuckPoints(p.score, snapshot.cut_line),
      0
    );

    return {
      ...player,
      enriched_picks:    enrichedPicks,
      combined_win_odds: combinedWinOdds,
      cut_penalties:     cutPenalties,
      best_score:        bestScore,
      leading_golfer:    leadingPick?.golfer_name ?? null,
      luck_score:        luckScore,
    };
  });
}

// ─── Pot calculation ───────────────────────────────────────────────────────────

export function calculatePot(poolPlayers: EnrichedPoolPlayer[]): PotSummary {
  const baseDues = poolPlayers.length * POT_CONFIG.dues_per_player;
  const rolloverTotal = Object.values(POT_CONFIG.rollovers).reduce(
    (s, r) => s + Object.values(r).reduce((a, b) => a + b, 0), 0
  );
  const cutPenalties = poolPlayers.reduce(
    (s, p) => s + p.cut_penalties * POT_CONFIG.cut_penalty, 0
  );
  return {
    base_dues:           baseDues,
    rollover_total:      rolloverTotal,
    rollover_label:      "Masters 2026 rollover",
    cut_penalties_total: cutPenalties,
    total: baseDues + rolloverTotal + cutPenalties,
  };
}

// ─── Dashboard assembly ────────────────────────────────────────────────────────

export async function buildDashboard(
  snapshot: LeaderboardSnapshot,
  odds: OddsPlayer[]
): Promise<DashboardData> {
  // Load picks from Supabase (falls back to TBD if draft not yet complete)
  const poolPlayersWithPicks = await loadPoolPlayers();
  const poolPlayers = enrichPoolData(snapshot, odds, poolPlayersWithPicks);
  const pot         = calculatePot(poolPlayers);

  // Luckiest award: highest luck_score after cut is final (round 3+)
  // Ties are included. No award pre-cut.
  const cutFinalised = ["round3", "round4", "complete"].includes(snapshot.phase);
  let luckiest: string[] = [];
  if (cutFinalised) {
    const maxLuck = Math.max(...poolPlayers.map((p) => p.luck_score));
    if (maxLuck > 0) {
      luckiest = poolPlayers
        .filter((p) => p.luck_score === maxLuck)
        .map((p) => p.id);
    }
  }

  return { snapshot, pool_players: poolPlayers, odds, pot, luckiest };
}
