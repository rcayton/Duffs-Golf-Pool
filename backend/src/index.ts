import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { router } from "./api/routes";
import { fetchLeaderboard as fetchMasters } from "./services/masters";
import { fetchLeaderboard as fetchEspn } from "./services/espn";
import { fetchWinOdds, getRemainingTokens } from "./services/odds";
import { saveSnapshot, saveOdds, loadOdds, isArchived, saveArchive, saveWinProbSnapshot } from "./lib/cache";
import { buildDashboard } from "./lib/pool-engine";
import { ACTIVE_MAJOR } from "./lib/major-config";
import { LeaderboardSnapshot } from "./types";
import cron from "node-cron";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

const LEADERBOARD_INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES ?? "5", 10);
const ODDS_INTERVAL_MINUTES = 10;
const PLAY_START_HOUR_ET = 8;
const PLAY_END_HOUR_ET   = 19;
const TOKEN_FLOOR = parseInt(process.env.ODDS_TOKEN_FLOOR ?? "20", 10);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL ?? "*"
    : "*",
}));
app.use(express.json());
app.use("/api", router);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentHourET(): number {
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  return ((utcHour - 4) % 24 + 24) % 24;
}

function isPlayTime(): boolean {
  const hour = currentHourET();
  return hour >= PLAY_START_HOUR_ET && hour < PLAY_END_HOUR_ET;
}

// ─── Source-routed leaderboard fetch ──────────────────────────────────────────
// Routes to masters.com or ESPN based on ACTIVE_MAJOR.source.

async function fetchLeaderboard(): Promise<LeaderboardSnapshot> {
  if (ACTIVE_MAJOR.source === "masters") {
    return fetchMasters();
  }
  return fetchEspn();
}

// ─── Auto-archive on tournament completion ─────────────────────────────────────
// Fires once when phase first becomes "complete". Saves enriched pool_players
// + snapshot to major_archives so the frontend can load it as a past major.

async function maybeArchive(snapshot: LeaderboardSnapshot): Promise<void> {
  if (snapshot.phase !== "complete") return;
  const alreadyDone = await isArchived(ACTIVE_MAJOR.id);
  if (alreadyDone) return;

  console.log(`[${new Date().toISOString()}] Tournament complete — archiving ${ACTIVE_MAJOR.id}...`);
  try {
    const odds = await loadOdds();
    const dashboard = buildDashboard(snapshot, odds);
    const { pool_players, pot } = dashboard;

    // Determine winning pool player (if any pick matches the tournament winner)
    const sortedPlayers = [...snapshot.players]
      .filter((p) => p.status === "active" || p.status === "complete")
      .sort((a, b) => a.score_to_par - b.score_to_par);
    const winnerGolfer = sortedPlayers[0];

    let winnerId: string | null = null;
    if (winnerGolfer) {
      for (const pp of pool_players) {
        const matched = pp.enriched_picks.find(
          (pick) => pick.espn_id === winnerGolfer.espn_id ||
                    pick.score?.espn_id === winnerGolfer.espn_id
        );
        if (matched) { winnerId = pp.id; break; }
      }
    }

    await saveArchive(ACTIVE_MAJOR, pool_players, snapshot, pot.total, winnerId);
  } catch (err: any) {
    console.error("  Archive failed:", err.message);
  }
}

// ─── Leaderboard poll ──────────────────────────────────────────────────────────

async function pollLeaderboard(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Leaderboard poll (${ACTIVE_MAJOR.source}: ${ACTIVE_MAJOR.short_name})...`);
  try {
    const snapshot = await fetchLeaderboard();
    await saveSnapshot(snapshot);
    console.log(
      `  OK: ${snapshot.players.length} players | ` +
      `phase=${snapshot.phase} round=${snapshot.current_round} | ` +
      `cut=${snapshot.cut_line ?? "n/a"}`
    );

    // Record win probability history during active play (not pre-tournament)
    if (snapshot.phase !== "pre" && snapshot.phase !== "complete") {
      const odds = await loadOdds();
      const dashboard = buildDashboard(snapshot, odds);
      const probs: Record<string, number> = {};
      dashboard.pool_players.forEach((p) => { probs[p.id] = p.combined_win_odds; });
      await saveWinProbSnapshot(ACTIVE_MAJOR.id, snapshot.phase, probs);
    }

    await maybeArchive(snapshot);
  } catch (err: any) {
    console.error("  Leaderboard error:", err.message);
  }
}

// ─── Odds poll ─────────────────────────────────────────────────────────────────

async function pollOdds(): Promise<void> {
  if (!isPlayTime()) {
    console.log(`[${new Date().toISOString()}] Odds skipped — outside play hours (ET: ${currentHourET().toFixed(1)}h)`);
    return;
  }

  const remaining = await getRemainingTokens();
  if (remaining !== null && remaining <= TOKEN_FLOOR) {
    console.warn(`[${new Date().toISOString()}] Odds skipped — ${remaining} tokens left (floor: ${TOKEN_FLOOR})`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Odds poll... (${remaining ?? "?"} tokens remaining)`);
  try {
    const odds = await fetchWinOdds();
    if (odds.length > 0) {
      await saveOdds(odds);
    } else {
      console.log("  No odds returned — keeping cached values");
    }
  } catch (err: any) {
    console.error("  Odds error:", err.message);
  }
}

// ─── Server startup ────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`Duffs Majors Pool API running on http://localhost:${PORT}`);
  console.log(`Active major: ${ACTIVE_MAJOR.name} (${ACTIVE_MAJOR.id}) — source: ${ACTIVE_MAJOR.source}`);
  console.log(`Leaderboard polling every ${LEADERBOARD_INTERVAL} min`);
  console.log(`Odds polling every ${ODDS_INTERVAL_MINUTES} min during play hours (${PLAY_START_HOUR_ET}:00–${PLAY_END_HOUR_ET}:00 ET)`);

  await pollLeaderboard();

  if (isPlayTime()) {
    await pollOdds();
  } else {
    console.log("Outside play hours — skipping initial odds fetch");
  }

  cron.schedule(`*/${LEADERBOARD_INTERVAL} * * * *`, pollLeaderboard);
  cron.schedule(`*/10 * * * *`, pollOdds);
});

export default app;
