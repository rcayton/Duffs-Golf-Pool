import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import { fetchLeaderboard } from "./services/espn";
import { fetchWinOdds } from "./services/odds";
import { saveSnapshot, saveOdds } from "./lib/cache";

const INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES ?? "5", 10);

async function pollAll() {
  const now = new Date().toISOString();
  console.log(`[${now}] Polling ESPN + Odds API...`);

  // ESPN leaderboard
  try {
    const snapshot = await fetchLeaderboard();
    await saveSnapshot(snapshot);
    console.log(
      `  ESPN: ${snapshot.players.length} players, phase=${snapshot.phase}, round=${snapshot.current_round}`
    );
  } catch (err: any) {
    console.error("  ESPN fetch failed:", err.message);
  }

  // Odds API (less frequent — save API calls)
  // Only fetch odds every 30 min since they don't change as fast
  const minute = new Date().getMinutes();
  if (minute % 30 === 0 || minute === 0) {
    try {
      const odds = await fetchWinOdds();
      if (odds.length > 0) {
        await saveOdds(odds);
        console.log(`  Odds: ${odds.length} players updated`);
      }
    } catch (err: any) {
      console.error("  Odds fetch failed:", err.message);
    }
  }
}

// Run immediately on start
pollAll();

// Then schedule at configured interval
const cronExpr = `*/${INTERVAL} * * * *`;
console.log(`Poller started — running every ${INTERVAL} minutes (${cronExpr})`);

cron.schedule(cronExpr, pollAll);
