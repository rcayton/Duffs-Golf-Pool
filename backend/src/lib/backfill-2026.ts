// ─── 2026 PGA Championship + U.S. Open backfill ────────────────────────────────
// Retroactively logs the two completed 2026 majors that were never correctly
// archived:
//
//   pga_2026     — drafted in the app (picks live in pool_picks).
//                  Winner Aaron Rai was not picked by anyone → pot rolled over.
//   us_open_2026 — drafted on the group's spreadsheet (app not used). The picks
//                  below are transcribed from that sheet. Buer picked champion
//                  Wyndham Clark → Buer wins the whole pot (U.S. Open dues +
//                  cut penalties + the PGA rollover).
//
// The deployed server auto-archived us_open_2026 on completion with EMPTY picks
// (pot $140, no winner) — this backfill overwrites that row with the real data.
//
// Run via POST /api/admin/backfill-2026 on a deployment with the Supabase
// service key (or `npm run backfill:2026` locally with backend/.env populated).
// Idempotent: re-running recomputes and upserts the same rows.
// Pass { dryRun: true } (or ?dry_run=1 on the endpoint) to compute and report
// without writing anything.

import { supabase } from "./supabase";
import { POOL_PLAYERS } from "./pool-config";
import { ALL_MAJORS, MajorConfig } from "./major-config";
import { enrichPoolData } from "./pool-engine";
import { saveArchive } from "./cache";
import { fetchLeaderboardForMajor } from "../services/pgatour";
import { PoolPlayer, PoolPick, EnrichedPoolPlayer, LeaderboardSnapshot } from "../types";

const DUES = 10;
const CUT_PENALTY = 5;

// U.S. Open 2026 picks from the group's spreadsheet (round 1 → 4).
// "Cant Get Laid" on the sheet = Patrick Cantlay.
const US_OPEN_PICKS: Record<string, string[]> = {
  sullivan: ["Scottie Scheffler", "Russell Henley", "Collin Morikawa", "Kurt Kitayama"],
  mikael:   ["Rory McIlroy", "Brooks Koepka", "Joaquin Niemann", "Robert MacIntyre"],
  buer:     ["Jon Rahm", "Wyndham Clark", "Patrick Reed", "Justin Rose"],
  robbie:   ["Xander Schauffele", "Si Woo Kim", "Chris Gotterup", "Viktor Hovland"],
  mike:     ["Tommy Fleetwood", "Sam Burns", "Ben Griffin", "J.J. Spaun"],
  caleb:    ["Cameron Young", "Bryson DeChambeau", "Tyrrell Hatton", "Patrick Cantlay"],
  alex:     ["Matt Fitzpatrick", "Ludvig Åberg", "Justin Thomas", "Hideki Matsuyama"],
};

export interface BackfillPlayerResult {
  player_id: string;
  name: string;
  picks: { golfer: string; position: string; status: string }[];
  missed_cuts: number;
  owed: number; // dues + cut penalties for this major
}

export interface BackfillMajorResult {
  major_id: string;
  major_name: string;
  tournament_winner: string | null;
  pool_winner_id: string | null;
  incoming_rollover: number;
  cut_penalties_total: number;
  pot_total: number;
  players: BackfillPlayerResult[];
}

function usOpenPoolPlayers(): PoolPlayer[] {
  return POOL_PLAYERS.map((player) => ({
    ...player,
    picks: (US_OPEN_PICKS[player.id] ?? []).map((golfer, i) => ({
      round_slot: (i + 1) as 1 | 2 | 3 | 4,
      golfer_name: golfer,
      espn_id: null,
    })),
  }));
}

async function upsertUsOpenPicks(): Promise<void> {
  const rows = Object.entries(US_OPEN_PICKS).flatMap(([playerId, golfers]) =>
    golfers.map((golfer, i) => ({
      major_id: "us_open_2026",
      player_id: playerId,
      round_slot: i + 1,
      golfer_name: golfer,
      espn_id: null,
      updated_at: new Date().toISOString(),
    }))
  );
  const { error } = await supabase
    .from("pool_picks")
    .upsert(rows, { onConflict: "major_id,player_id,round_slot" });
  if (error) throw new Error(`Failed to upsert US Open picks: ${error.message}`);
}

async function loadPicksForMajor(majorId: string): Promise<PoolPlayer[]> {
  const { data, error } = await supabase
    .from("pool_picks")
    .select("player_id, round_slot, golfer_name, espn_id")
    .eq("major_id", majorId);
  if (error) throw new Error(`Failed to load picks for ${majorId}: ${error.message}`);

  const byPlayer: Record<string, Record<number, { golfer_name: string; espn_id: string | null }>> = {};
  for (const row of data ?? []) {
    if (!byPlayer[row.player_id]) byPlayer[row.player_id] = {};
    byPlayer[row.player_id][row.round_slot] = {
      golfer_name: row.golfer_name,
      espn_id: row.espn_id ?? null,
    };
  }

  return POOL_PLAYERS.map((player) => {
    const rows = byPlayer[player.id] ?? {};
    const picks: PoolPick[] = [1, 2, 3, 4].map((slot) => ({
      round_slot: slot as 1 | 2 | 3 | 4,
      golfer_name: rows[slot]?.golfer_name ?? "TBD",
      espn_id: rows[slot]?.espn_id ?? null,
    }));
    return { ...player, picks };
  });
}

function findPoolWinner(
  snapshot: LeaderboardSnapshot,
  enriched: EnrichedPoolPlayer[]
): { golfer: string | null; poolPlayerId: string | null } {
  const sorted = [...snapshot.players]
    .filter((p) => p.status === "active" || p.status === "complete")
    .sort((a, b) => a.score_to_par - b.score_to_par);
  const winnerGolfer = sorted[0];
  if (!winnerGolfer) return { golfer: null, poolPlayerId: null };

  for (const pp of enriched) {
    const matched = pp.enriched_picks.find(
      (pick) =>
        pick.espn_id === winnerGolfer.espn_id ||
        pick.score?.espn_id === winnerGolfer.espn_id
    );
    if (matched) return { golfer: winnerGolfer.name, poolPlayerId: pp.id };
  }
  return { golfer: winnerGolfer.name, poolPlayerId: null };
}

async function processMajor(
  major: MajorConfig,
  poolPlayers: PoolPlayer[],
  incomingRollover: number,
  save: boolean
): Promise<BackfillMajorResult> {
  const snapshot = await fetchLeaderboardForMajor(major);
  if (snapshot.phase !== "complete") {
    throw new Error(`${major.id} is not complete (phase=${snapshot.phase}) — cannot backfill.`);
  }

  const missing = poolPlayers.flatMap((p) =>
    p.picks.filter((pick) => !pick.golfer_name || pick.golfer_name === "TBD").map(() => p.id)
  );
  if (missing.length > 0) {
    throw new Error(
      `${major.id} has ${missing.length} missing picks (players: ${[...new Set(missing)].join(", ")}).`
    );
  }

  const enriched = enrichPoolData(snapshot, [], poolPlayers);

  const cutPenaltiesTotal = enriched.reduce(
    (s, p) => s + p.cut_penalties * CUT_PENALTY, 0
  );
  const potTotal = poolPlayers.length * DUES + cutPenaltiesTotal + incomingRollover;

  const { golfer, poolPlayerId } = findPoolWinner(snapshot, enriched);

  if (save) {
    await saveArchive(major, enriched, snapshot, potTotal, poolPlayerId);
  }

  return {
    major_id: major.id,
    major_name: major.name,
    tournament_winner: golfer,
    pool_winner_id: poolPlayerId,
    incoming_rollover: incomingRollover,
    cut_penalties_total: cutPenaltiesTotal,
    pot_total: potTotal,
    players: enriched.map((p) => ({
      player_id: p.id,
      name: p.name,
      picks: p.enriched_picks.map((pick) => ({
        golfer: pick.golfer_name,
        position: pick.score?.position ?? "?",
        status: pick.score?.status ?? "not found",
      })),
      missed_cuts: p.cut_penalties,
      owed: DUES + p.cut_penalties * CUT_PENALTY,
    })),
  };
}

export async function runBackfill2026(opts: { dryRun?: boolean } = {}): Promise<{
  dry_run: boolean;
  pga: BackfillMajorResult;
  us_open: BackfillMajorResult;
  total_owed: Record<string, number>;
}> {
  const dryRun = opts.dryRun ?? false;
  const pgaMajor = ALL_MAJORS.find((m) => m.id === "pga_2026");
  const usOpenMajor = ALL_MAJORS.find((m) => m.id === "us_open_2026");
  if (!pgaMajor || !usOpenMajor) throw new Error("Major configs missing for 2026 backfill.");

  if (!dryRun) await upsertUsOpenPicks();

  // PGA first (May) — no pool winner expected, so its pot rolls into the US Open
  const pgaPicks = await loadPicksForMajor("pga_2026");
  const pga = await processMajor(pgaMajor, pgaPicks, 0, !dryRun);
  const pgaRollover = pga.pool_winner_id ? 0 : pga.pot_total;

  // US Open picks come from the spreadsheet constant (authoritative source)
  const usOpen = await processMajor(usOpenMajor, usOpenPoolPlayers(), pgaRollover, !dryRun);

  // Combined owed per person across both majors
  const totalOwed: Record<string, number> = {};
  for (const p of POOL_PLAYERS) {
    const pgaOwed = pga.players.find((r) => r.player_id === p.id)?.owed ?? 0;
    const usoOwed = usOpen.players.find((r) => r.player_id === p.id)?.owed ?? 0;
    totalOwed[p.id] = pgaOwed + usoOwed;
  }

  return { dry_run: dryRun, pga, us_open: usOpen, total_owed: totalOwed };
}
