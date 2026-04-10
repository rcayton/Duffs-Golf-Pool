import { Router, Request, Response } from "express";
import { loadSnapshot, loadOdds, saveSnapshot, saveOdds } from "../lib/cache";
import { buildDashboard } from "../lib/pool-engine";
import { fetchLeaderboard } from "../services/masters";
import { fetchWinOdds } from "../services/odds";

export const router = Router();

// GET /api/dashboard — enriched dashboard data for the frontend
router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const [snapshot, odds] = await Promise.all([loadSnapshot(), loadOdds()]);

    if (!snapshot) {
      return res.status(503).json({
        error: "Leaderboard data not yet available. Try POST /api/refresh to seed it.",
      });
    }

    const dashboard = buildDashboard(snapshot, odds);
    return res.json(dashboard);
  } catch (err: any) {
    console.error("Dashboard error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/leaderboard — raw masters.com snapshot (all players, all fields)
router.get("/leaderboard", async (_req: Request, res: Response) => {
  try {
    const snapshot = await loadSnapshot();
    if (!snapshot) {
      return res.status(503).json({ error: "No leaderboard data cached" });
    }
    return res.json(snapshot);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/odds — raw FanDuel odds for pool picks
router.get("/odds", async (_req: Request, res: Response) => {
  try {
    const odds = await loadOdds();
    return res.json(odds);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/refresh — manually trigger a full data refresh
// Useful for seeding on first run or forcing an update mid-round
router.post("/refresh", async (_req: Request, res: Response) => {
  const startMs = Date.now();

  const [snapshotResult, oddsResult] = await Promise.allSettled([
    fetchLeaderboard(),
    fetchWinOdds(),
  ]);

  if (snapshotResult.status === "fulfilled") {
    await saveSnapshot(snapshotResult.value);
  }
  if (oddsResult.status === "fulfilled" && oddsResult.value.length > 0) {
    await saveOdds(oddsResult.value);
  }

  return res.json({
    leaderboard: snapshotResult.status,
    leaderboard_players: snapshotResult.status === "fulfilled"
      ? snapshotResult.value.players.length
      : null,
    leaderboard_error: snapshotResult.status === "rejected"
      ? (snapshotResult.reason as Error).message
      : null,
    odds: oddsResult.status,
    odds_players: oddsResult.status === "fulfilled"
      ? oddsResult.value.length
      : null,
    odds_error: oddsResult.status === "rejected"
      ? (oddsResult.reason as Error).message
      : null,
    duration_ms: Date.now() - startMs,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
