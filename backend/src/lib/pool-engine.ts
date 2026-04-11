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

// ─── Derived win probability model ────────────────────────────────────────────
// Estimates live win probabilities from current scores + holes remaining.
// Uses an exponential decay on strokes-behind-leader, scaled by remaining
// uncertainty. Blended with a FanDuel prior: early in the tournament the
// prior dominates; late in round 4 the live model dominates.
//
// Variance calibration: 0.5 strokes² per hole ≈ 3-stroke σ per round,
// consistent with PGA Tour round-score distributions.

const VARIANCE_PER_HOLE = 0.5;

function holesRemainingInTournament(phase: string, thruStr: string): number {
  const thru =
    thruStr === "F" ? 18 : thruStr === "-" ? 0 : parseInt(thruStr, 10) || 0;
  switch (phase) {
    case "pre":      return 72;
    case "round1":   return Math.max(0, 72 - thru);
    case "round2":   return Math.max(0, 54 - thru);
    case "round3":   return Math.max(0, 36 - thru);
    case "round4":   return Math.max(0, 18 - thru);
    case "complete": return 0;
    default:         return 36;
  }
}

export function deriveWinProbabilities(
  snapshot: LeaderboardSnapshot,
  priorOdds: OddsPlayer[]
): OddsPlayer[] {
  const { players, phase } = snapshot;

  // Only players who can still win
  const eligible = players.filter(
    (p) => p.status === "active" || p.status === "complete"
  );
  if (eligible.length === 0) return priorOdds;

  // Average holes remaining across field → used as the blend weight
  const holesArr = eligible.map((p) =>
    holesRemainingInTournament(phase, p.thru)
  );
  const avgHolesRemaining =
    holesArr.reduce((s, h) => s + h, 0) / holesArr.length;

  // α = 1 at the start (pure prior), 0 at the end (pure derived)
  const alpha = Math.min(1, Math.max(0, avgHolesRemaining / 72));

  // k-factor: higher uncertainty → smaller k (flatter distribution)
  const totalVariance = Math.max(0.5, avgHolesRemaining) * VARIANCE_PER_HOLE;
  const k = 0.5 / Math.sqrt(totalVariance);

  // Strokes behind leader for each eligible player
  const minScore = Math.min(...eligible.map((p) => p.score_to_par));

  // Raw exponential weights
  let rawSum = 0;
  const raws = eligible.map((p) => {
    const gap = p.score_to_par - minScore;
    const raw = Math.exp(-k * gap);
    rawSum += raw;
    return { player: p, raw };
  });

  // Prior lookup by name
  function findPrior(name: string): number {
    const norm = normalizeName(name);
    const exact = priorOdds.find((o) => normalizeName(o.name) === norm);
    if (exact) return exact.win_probability;
    const last = lastName(norm);
    return priorOdds.find((o) => lastName(normalizeName(o.name)) === last)
      ?.win_probability ?? 0;
  }

  // Blend derived with prior, then re-normalize so probabilities sum to 100
  const blended = raws.map(({ player, raw }) => {
    const derived = (raw / rawSum) * 100;
    const prior = findPrior(player.name);
    // If the player has no prior entry, skip the prior term so we don't
    // artificially suppress a live leader who wasn't in the pre-tourney odds.
    const prob =
      prior > 0
        ? alpha * prior + (1 - alpha) * derived
        : (1 - alpha) * derived;
    return { player, prob };
  });

  const blendedSum = blended.reduce((s, b) => s + b.prob, 0);

  return blended.map(({ player, prob }) => ({
    name: player.name,
    win_probability: parseFloat(
      ((blendedSum > 0 ? prob / blendedSum : 0) * 100).toFixed(2)
    ),
    implied_odds: 0,
    sportsbook: alpha > 0.95 ? "FanDuel (prior)" : "derived",
    last_updated: new Date().toISOString(),
  }));
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
  // Use live-derived probabilities (seeded with FanDuel prior) so win bars
  // stay meaningful when the sportsbook market is suspended mid-round.
  const liveOdds  = deriveWinProbabilities(snapshot, odds);
  const poolPlayers = enrichPoolData(snapshot, liveOdds);
  const pot         = calculatePot(poolPlayers);

  return { snapshot, pool_players: poolPlayers, odds: liveOdds, pot };
}
