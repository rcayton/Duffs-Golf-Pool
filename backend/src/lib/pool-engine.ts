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
// Used everywhere we compare player names across data sources.
// Strips accents (Åberg→Aberg, Højgaard→Hojgaard), lowercases, removes
// non-alpha chars so "R. MacIntyre" and "Robert Macintyre" can fuzzy-match.

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

  // 1. Exact normalized match
  const exact = players.find((p) => normalizeName(p.name) === normPick);
  if (exact) return exact;

  // 2. Last name only
  const pickLast = lastName(normPick);
  const byLast = players.find(
    (p) => lastName(normalizeName(p.name)) === pickLast
  );
  if (byLast) return byLast;

  // 3. Substring (catches "R. MacIntyre" vs "Robert MacIntyre")
  return players.find(
    (p) =>
      normalizeName(p.name).includes(normPick) ||
      normPick.includes(normalizeName(p.name))
  );
}

// ─── Odds matching ─────────────────────────────────────────────────────────────

function findWinProb(pickName: string, odds: OddsPlayer[]): number {
  const normPick = normalizeName(pickName);

  // 1. Exact normalized match
  let found = odds.find((o) => normalizeName(o.name) === normPick);
  if (found) return found.win_probability;

  // 2. Last name match (handles accent variants: Åberg vs Aberg)
  const pickLast = lastName(normPick);
  found = odds.find((o) => lastName(normalizeName(o.name)) === pickLast);
  if (found) return found.win_probability;

  return 0;
}

// ─── Cut probability model ─────────────────────────────────────────────────────
// Logistic curve based on strokes-to-cut and holes remaining.
// Returns 0–100.

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

  // Holes completed across both rounds
  const thruNum         = thru === "F" ? 36 : parseInt(thru, 10) || 0;
  const holesRemaining  = Math.max(0, 36 - thruNum);

  const variance = Math.sqrt(holesRemaining * 0.0625);
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
  return POOL_PLAYERS.map((player) => {
    const enrichedPicks: EnrichedPick[] = player.picks.map((pick) => {
      const score   = findGolferScore(pick.golfer_name, snapshot.players);
      const winProb = findWinProb(pick.golfer_name, odds);
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

    // Combined win probability = sum of individual win probabilities.
    // (One of the 4 picks wins = probability any of them wins, assuming
    // only one golfer can win the tournament so the events are mutually exclusive)
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
      enriched_picks:   enrichedPicks,
      combined_win_odds: combinedWinOdds,
      cut_penalties:    cutPenalties,
      best_score:       bestScore,
      leading_golfer:   leadingPick?.golfer_name ?? null,
    };
  });
}

// ─── Pot calculation ───────────────────────────────────────────────────────────

export function calculatePot(poolPlayers: EnrichedPoolPlayer[]): PotSummary {
  const baseDues = POOL_PLAYERS.length * POT_CONFIG.masters_dues_per_player;

  const rolloverUsOpen = Object.values(POT_CONFIG.rollovers).reduce(
    (s, r) => s + r.us_open,
    0
  );
  const rolloverOpen = Object.values(POT_CONFIG.rollovers).reduce(
    (s, r) => s + r.open_championship,
    0
  );

  const cutPenalties = poolPlayers.reduce(
    (s, p) => s + p.cut_penalties * POT_CONFIG.cut_penalty,
    0
  );

  return {
    base_dues:                    baseDues,
    rollover_us_open:             rolloverUsOpen,
    rollover_open_championship:   rolloverOpen,
    cut_penalties_total:          cutPenalties,
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
