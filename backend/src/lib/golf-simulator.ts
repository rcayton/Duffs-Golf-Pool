// ─── Hole-by-hole Monte Carlo golf simulator ───────────────────────────────────
//
// Each active golfer's remaining holes are sampled from their per-hole
// scoring distribution N(mean, std), rounded to the nearest integer stroke.
// The golfer with the lowest final score wins each simulation.
// Ties are broken by a single sudden-death playoff hole.
//
// Win probability = wins / SIMULATIONS  (expressed as 0–100 %).

import { GolferScore, TournamentPhase } from "../types";
import { ratingToMean, ratingToStd, getRating } from "./golfer-ratings";

const SIMULATIONS = 5000;

// Per-hole stroke bounds (eagle min, max realistic score)
const MIN_HOLE_SCORE = -2;
const MAX_HOLE_SCORE =  4;

// ─── Gaussian RNG (Box-Muller) ─────────────────────────────────────────────────

function randn(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ─── Holes remaining ──────────────────────────────────────────────────────────

function holesCompleted(phase: TournamentPhase, thru: string): number {
  const roundIndex: Record<TournamentPhase, number> = {
    pre:      0,
    round1:   0,
    round2:   1,
    round3:   2,
    round4:   3,
    complete: 4,
  };
  const completedRounds = roundIndex[phase] ?? 0;
  const thruHoles = thru === "F" ? 18 : thru === "-" ? 0 : (parseInt(thru, 10) || 0);
  return completedRounds * 18 + thruHoles;
}

function holesRemaining(phase: TournamentPhase, thru: string): number {
  return Math.max(0, 72 - holesCompleted(phase, thru));
}

// ─── Simulator ────────────────────────────────────────────────────────────────

interface SimGolfer {
  espnId: string;
  name: string;
  currentScore: number;    // score to par through completed holes
  holesLeft: number;       // holes remaining in the tournament
  mean: number;            // per-hole stroke mean relative to par
  std: number;             // per-hole stroke std dev
}

function buildSimGolfers(
  players: GolferScore[],
  phase: TournamentPhase,
  majorId: string,
): SimGolfer[] {
  return players
    .filter((p) => p.status === "active" || p.status === "complete")
    .map((p) => {
      const rating = getRating(p.name, majorId);
      return {
        espnId:       p.espn_id,
        name:         p.name,
        currentScore: p.score_to_par,
        holesLeft:    holesRemaining(phase, p.thru),
        mean:         ratingToMean(rating.rating),
        std:          ratingToStd(rating.rating),
      };
    });
}

function simulateOnce(golfers: SimGolfer[]): number {
  let best = Infinity;
  let winner = 0;

  for (let j = 0; j < golfers.length; j++) {
    const g = golfers[j];
    let total = g.currentScore;
    for (let h = 0; h < g.holesLeft; h++) {
      const raw = g.mean + randn() * g.std;
      total += Math.max(MIN_HOLE_SCORE, Math.min(MAX_HOLE_SCORE, Math.round(raw)));
    }
    if (total < best) {
      best = total;
      winner = j;
    } else if (total === best) {
      // Playoff: one extra hole
      const winnerHole = golfers[winner].mean + randn() * golfers[winner].std;
      const challengerHole = g.mean + randn() * g.std;
      if (challengerHole < winnerHole) winner = j;
    }
  }

  return winner;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function simulateWinProbs(
  players: GolferScore[],
  phase: TournamentPhase,
  majorId: string,
  simulations: number = SIMULATIONS,
): Map<string, number> {
  const golfers = buildSimGolfers(players, phase, majorId);
  if (golfers.length === 0) return new Map();

  const wins = new Array(golfers.length).fill(0);

  for (let i = 0; i < simulations; i++) {
    wins[simulateOnce(golfers)]++;
  }

  const probs = new Map<string, number>();
  golfers.forEach((g, i) => {
    probs.set(g.espnId, parseFloat(((wins[i] / simulations) * 100).toFixed(2)));
  });
  return probs;
}
