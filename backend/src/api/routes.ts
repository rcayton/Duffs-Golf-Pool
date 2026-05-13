import { Router, Request, Response } from "express";
import { loadSnapshot, loadOdds, saveSnapshot, saveOdds, listArchivedMajors, loadArchive, loadWinProbHistory } from "../lib/cache";
import { buildDashboard } from "../lib/pool-engine";
import { fetchLeaderboard } from "../services/masters";
import { fetchWinOdds } from "../services/odds";
import { ALL_MAJORS, ACTIVE_MAJOR } from "../lib/major-config";
import {
  loadDraftState,
  runLottery,
  setPick,
  completeDraft,
  resetDraft,
} from "../lib/draft";
import { fetchPgaField, clearFieldCache } from "../services/pga-field";

export const router = Router();

// GET /api/dashboard
router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const [snapshot, odds] = await Promise.all([loadSnapshot(), loadOdds()]);
    if (!snapshot) {
      return res.status(503).json({
        error: "Leaderboard data not yet available. Try POST /api/refresh to seed it.",
      });
    }
    const dashboard = await buildDashboard(snapshot, odds);
    return res.json(dashboard);
  } catch (err: any) {
    console.error("Dashboard error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/leaderboard
router.get("/leaderboard", async (_req: Request, res: Response) => {
  try {
    const snapshot = await loadSnapshot();
    if (!snapshot) return res.status(503).json({ error: "No leaderboard data cached" });
    return res.json(snapshot);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/odds
router.get("/odds", async (_req: Request, res: Response) => {
  try {
    const odds = await loadOdds();
    return res.json(odds);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/refresh
router.post("/refresh", async (_req: Request, res: Response) => {
  const startMs = Date.now();
  const [snapshotResult, oddsResult] = await Promise.allSettled([
    fetchLeaderboard(),
    fetchWinOdds(),
  ]);
  if (snapshotResult.status === "fulfilled") await saveSnapshot(snapshotResult.value);
  if (oddsResult.status === "fulfilled" && oddsResult.value.length > 0) await saveOdds(oddsResult.value);
  return res.json({
    leaderboard: snapshotResult.status,
    leaderboard_players: snapshotResult.status === "fulfilled" ? snapshotResult.value.players.length : null,
    leaderboard_error: snapshotResult.status === "rejected" ? (snapshotResult.reason as Error).message : null,
    odds: oddsResult.status,
    odds_players: oddsResult.status === "fulfilled" ? oddsResult.value.length : null,
    odds_error: oddsResult.status === "rejected" ? (oddsResult.reason as Error).message : null,
    duration_ms: Date.now() - startMs,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/majors
router.get("/majors", async (_req: Request, res: Response) => {
  try {
    const archived = await listArchivedMajors();
    const archivedIds = new Set(archived.map((a) => a.major_id));
    const majors = ALL_MAJORS.map((m) => ({
      ...m,
      is_active: m.id === ACTIVE_MAJOR.id,
      is_archived: archivedIds.has(m.id),
      archive_summary: archived.find((a) => a.major_id === m.id) ?? null,
    }));
    return res.json(majors);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/charts
router.get("/charts", async (_req: Request, res: Response) => {
  try {
    const history = await loadWinProbHistory(ACTIVE_MAJOR.id);
    return res.json({ major_id: ACTIVE_MAJOR.id, history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/major/:id
router.get("/major/:id", async (req: Request, res: Response) => {
  try {
    const archive = await loadArchive(req.params.id);
    if (!archive) return res.status(404).json({ error: "Major not found or not yet archived" });
    return res.json(archive);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Draft routes ──────────────────────────────────────────────────────────────

// GET /api/draft
router.get("/draft", async (_req: Request, res: Response) => {
  try {
    const state = await loadDraftState();
    if (!state) {
      return res.json({
        major_id: ACTIVE_MAJOR.id,
        status: "idle",
        draft_order: [],
        picks: [],
        completed_at: null,
        updated_at: new Date().toISOString(),
      });
    }
    return res.json(state);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/pga-field
router.get("/pga-field", async (_req: Request, res: Response) => {
  try {
    const field = await fetchPgaField();
    return res.json({ players: field.map((f) => f.name) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/draft/lottery
router.post("/draft/lottery", async (_req: Request, res: Response) => {
  try {
    const state = await runLottery();
    return res.json(state);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/draft/pick   body: { pick_number: number, golfer_name: string }
router.post("/draft/pick", async (req: Request, res: Response) => {
  try {
    const { pick_number, golfer_name } = req.body;
    if (typeof pick_number !== "number" || pick_number < 1 || pick_number > 28) {
      return res.status(400).json({ error: "pick_number must be 1–28." });
    }
    if (typeof golfer_name !== "string") {
      return res.status(400).json({ error: "golfer_name must be a string." });
    }
    const { state, error } = await setPick(pick_number, golfer_name);
    if (error) return res.status(400).json({ error, state });
    return res.json(state);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/draft/complete
router.post("/draft/complete", async (_req: Request, res: Response) => {
  try {
    const { state, error } = await completeDraft();
    if (error) return res.status(400).json({ error, state });
    return res.json(state);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/draft/reset
router.post("/draft/reset", async (_req: Request, res: Response) => {
  try {
    await resetDraft();
    clearFieldCache();
    return res.json({ ok: true, message: `Draft reset for ${ACTIVE_MAJOR.short_name}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
