import {
  DashboardData,
  EnrichedPick,
  EnrichedPoolPlayer,
  GolferScore,
  LeaderboardSnapshot,
  OddsPlayer,
  PotSummary,
} from "../types";
import { POOL_PLAYERS, POT_CONFIG } from "./pool-config";

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

// ─── Monte Carlo win probability model ────────────────────────────────────────
//
// Calibrated against sportsbook lines using the current Masters leaderboard:
//   McIlroy -12, Burns/Reed -6, Rose/Lowry/Fleetwood -5
//   Sportsbooks: McIlroy -250 ≈ 71% — model produces 61.4% (intentionally
//   conservative; gives more realistic weight to the chasing pack)
//
// Parameters:
//   SIGMA_PER_ROUND  (2.9)  — per-round SD at Augusta. Lower than generic (3.5)
//                             because the gap factor does additional work.
//   SCORING_BIAS     (0.5)  — Augusta plays ~0.5 strokes above par per round
//                             on average across the field.
//   PRESSURE_FACTOR  (0.10) — Each stroke a player is behind the leader adds
//                             0.10 to their expected remaining score. Models
//                             the cost of needing to make risky plays to catch up.
//                             Reduced from 0.30 to give the chasing pack more
//                             realistic probability weight.
//   COMFORT_FACTOR   (0.05) — Each stroke the leader is ahead reduces their
//                             expected remaining score by 0.05. Models conservative
//                             play-within-yourself strategy when leading.
//   SIMULATIONS      (50000) — Enough for ~±0.3% precision on individual probs.

const SIGMA_PER_ROUND = 2.9;
const SCORING_BIAS    = 0.5;
const PRESSURE_FACTOR = 0.10;
const COMFORT_FACTOR  = 0.05;
const SIMULATIONS     = 50000;

// Box-Muller transform — standard normal random variable
function randn(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Calculate rounds remaining (including partial current round) from leaderboard state
function calcRoundsRemaining(
  phase: string,
  players: GolferScore[]
): number {
  if (phase === "pre")      return 4;
  if (phase === "round1")   return 3 + holesRemainingFraction(players, 1);
  if (phase === "round2")   return 2 + holesRemainingFraction(players, 2);
  if (phase === "round3")   return 1 + holesRemainingFraction(players, 3);
  if (phase === "round4")   return holesRemainingFraction(players, 4);
  return 0; // complete
}

// Average fraction of current round still to play across active players
function holesRemainingFraction(players: GolferScore[], _round: number): number {
  const active = players.filter(
    (p) => p.status === "active" && p.thru !== "F" && p.thru !== "-"
  );
  if (active.length === 0) return 0;
  const avgThru =
    active.reduce((sum, p) => sum + (parseInt(p.thru, 10) || 0), 0) /
    active.length;
  return Math.max(0, (18 - avgThru) / 18);
}

export function monteCarloWinProbs(
  players: GolferScore[],
  roundsRemaining: number
): Map<string, number> {
  const active = players.filter(
    (p) => p.status === "active" || p.status === "complete"
  );
  if (active.length === 0) return new Map();

  const scores  = active.map((p) => p.score_to_par);
  const leader  = Math.min(...scores);
  const second  = scores.filter((s) => s !== leader)
    .reduce((a, b) => Math.min(a, b), Infinity);

  const bias  = SCORING_BIAS * roundsRemaining;
  const sigma = SIGMA_PER_ROUND * Math.sqrt(roundsRemaining);

  // Adjusted expected final score for each player
  const adjusted = active.map((p) => {
    const gap = p.score_to_par - leader;
    if (gap === 0) {
      // Leader: small comfort bonus (plays conservatively)
      const leadSize = leader - second; // negative value (leader is below second)
      return p.score_to_par + bias - Math.abs(leadSize) * COMFORT_FACTOR;
    }
    // Chaser: pressure penalty proportional to deficit
    return p.score_to_par + bias + gap * PRESSURE_FACTOR;
  });

  const wins = new Array(active.length).fill(0);
  for (let i = 0; i < SIMULATIONS; i++) {
    let best = Infinity;
    let winner = 0;
    for (let j = 0; j < active.length; j++) {
      const final = adjusted[j] + randn() * sigma;
      if (final < best) {
        best = final;
        winner = j;
      }
    }
    wins[winner]++;
  }

  const probs = new Map<string, number>();
  active.forEach((p, i) => {
    probs.set(
      p.espn_id,
      parseFloat(((wins[i] / SIMULATIONS) * 100).toFixed(2))
    );
  });
  return probs;
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
  odds: OddsPlayer[]
): EnrichedPoolPlayer[] {
  // Run Monte Carlo once for the whole field
  const roundsRemaining = calcRoundsRemaining(snapshot.phase, snapshot.players);
  const winProbMap = roundsRemaining > 0
    ? monteCarloWinProbs(snapshot.players, roundsRemaining)
    : new Map<string, number>();

  // Use FanDuel odds as fallback if Monte Carlo produces nothing
  // (e.g. pre-tournament before any scores exist)
  const useMonteCarloProbs = winProbMap.size > 0;

  return POOL_PLAYERS.map((player) => {
    const enrichedPicks: EnrichedPick[] = player.picks.map((pick) => {
      const score   = findGolferScore(pick.golfer_name, snapshot.players);

      // Win probability: Monte Carlo from live scores, fall back to FanDuel
      let winProb = 0;
      if (useMonteCarloProbs && score) {
        winProb = winProbMap.get(score.espn_id) ?? 0;
      }
      if (winProb === 0) {
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

    return {
      ...player,
      enriched_picks:    enrichedPicks,
      combined_win_odds: combinedWinOdds,
      cut_penalties:     cutPenalties,
      best_score:        bestScore,
      leading_golfer:    leadingPick?.golfer_name ?? null,
    };
  });
}

// ─── Pot calculation ───────────────────────────────────────────────────────────

export function calculatePot(poolPlayers: EnrichedPoolPlayer[]): PotSummary {
  const baseDues = POOL_PLAYERS.length * POT_CONFIG.masters_dues_per_player;
  const rolloverUsOpen = Object.values(POT_CONFIG.rollovers).reduce(
    (s, r) => s + r.us_open, 0
  );
  const rolloverOpen = Object.values(POT_CONFIG.rollovers).reduce(
    (s, r) => s + r.open_championship, 0
  );
  const cutPenalties = poolPlayers.reduce(
    (s, p) => s + p.cut_penalties * POT_CONFIG.cut_penalty, 0
  );
  return {
    base_dues:                   baseDues,
    rollover_us_open:            rolloverUsOpen,
    rollover_open_championship:  rolloverOpen,
    cut_penalties_total:         cutPenalties,
    total: baseDues + rolloverUsOpen + rolloverOpen + cutPenalties,
  };
}

// ─── Dashboard assembly ────────────────────────────────────────────────────────

export function buildDashboard(
  snapshot: LeaderboardSnapshot,
  odds: OddsPlayer[]
): DashboardData {
  const poolPlayers = enrichPoolData(snapshot, odds);
  const pot         = calculatePot(poolPlayers);
  return { snapshot, pool_players: poolPlayers, odds, pot };
}
