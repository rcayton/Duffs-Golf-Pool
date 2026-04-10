import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { router } from "./api/routes";
import { fetchLeaderboard } from "./services/masters";
import { fetchWinOdds, getRemainingTokens } from "./services/odds";
import { saveSnapshot, saveOdds } from "./lib/cache";
import cron from "node-cron";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Leaderboard polls every N minutes — masters.com is free, no quota
const LEADERBOARD_INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES ?? "5", 10);

// Odds polls every 10 minutes, only during play hours
const ODDS_INTERVAL_MINUTES = 10;

// Masters rounds typically run 8am–7pm ET (April = EDT = UTC-4)
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
  // April = EDT (UTC-4)
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  return ((utcHour - 4) % 24 + 24) % 24;
}

function isPlayTime(): boolean {
  const hour = currentHourET();
  return hour >= PLAY_START_HOUR_ET && hour < PLAY_END_HOUR_ET;
}

// ─── Leaderboard poll — masters.com scores.json ────────────────────────────────
async function pollLeaderboard(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Leaderboard poll (masters.com)...`);
  try {
    const snapshot = await fetchLeaderboard();
    await saveSnapshot(snapshot);
    console.log(
      `  OK: ${snapshot.players.length} players | ` +
      `phase=${snapshot.phase} round=${snapshot.current_round} | ` +
      `cut=${snapshot.cut_line ?? "n/a"}`
    );
  } catch (err: any) {
    console.error("  Leaderboard error:", err.message);
  }
}

// ─── Odds poll — FanDuel via The Odds API ──────────────────────────────────────
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
  console.log(`Masters Pool API running on http://localhost:${PORT}`);
  console.log(`Source: masters.com scores.json`);
  console.log(`Leaderboard polling every ${LEADERBOARD_INTERVAL} min`);
  console.log(`Odds polling every ${ODDS_INTERVAL_MINUTES} min during play hours (${PLAY_START_HOUR_ET}:00–${PLAY_END_HOUR_ET}:00 ET)`);
  console.log(`Odds token floor: ${TOKEN_FLOOR}`);

  // Fetch immediately on startup
  await pollLeaderboard();

  if (isPlayTime()) {
    await pollOdds();
  } else {
    console.log("Outside play hours — skipping initial odds fetch");
  }

  // Leaderboard: every N minutes unconditionally
  cron.schedule(`*/${LEADERBOARD_INTERVAL} * * * *`, pollLeaderboard);

  // Odds: every 10 minutes; isPlayTime() check is inside pollOdds
  cron.schedule(`*/10 * * * *`, pollOdds);
});

export default app;
