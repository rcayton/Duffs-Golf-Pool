import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import { fetchLeaderboard as fetchMasters } from "./services/masters";
import { fetchLeaderboard as fetchEspn } from "./services/espn";
import { fetchLeaderboard as fetchPgaTour } from "./services/pgatour";
import { fetchWinOdds } from "./services/odds";
import { saveSnapshot, saveOdds } from "./lib/cache";
import { ACTIVE_MAJOR } from "./lib/major-config";

const fetchLeaderboard =
  ACTIVE_MAJOR.source === "masters" ? fetchMasters :
  ACTIVE_MAJOR.source === "pgatour" ? fetchPgaTour :
  fetchEspn;

const INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES ?? "5", 10);

async function pollAll() {
  const now = new Date().toISOString();
  console.log(`[${now}] Polling ${ACTIVE_MAJOR.source} + Odds API...`);

  // ESPN leaderboard
  try {
    const snapshot = await fetchLeaderboard();
    await saveSnapshot(snapshot);
    console.log(
      `  ${ACTIVE_MAJOR.source}: ${snapshot.players.length} players, phase=${snapshot.phase}, round=${snapshot.current_round}`
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
