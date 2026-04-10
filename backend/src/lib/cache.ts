import { supabase } from "./supabase";
import { DashboardData, LeaderboardSnapshot, OddsPlayer } from "../types";

const CACHE_TABLE = "leaderboard_cache";
const ODDS_TABLE = "odds_cache";
const CACHE_KEY = "masters_2026";

export async function saveSnapshot(snapshot: LeaderboardSnapshot): Promise<void> {
  const { error } = await supabase.from(CACHE_TABLE).upsert(
    {
      key: CACHE_KEY,
      data: snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) console.error("Failed to save snapshot:", error.message);
}

export async function loadSnapshot(): Promise<LeaderboardSnapshot | null> {
  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select("data")
    .eq("key", CACHE_KEY)
    .single();

  if (error || !data) return null;
  return data.data as LeaderboardSnapshot;
}

export async function saveOdds(odds: OddsPlayer[]): Promise<void> {
  const { error } = await supabase.from(ODDS_TABLE).upsert(
    {
      key: CACHE_KEY,
      data: odds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) console.error("Failed to save odds:", error.message);
}

export async function loadOdds(): Promise<OddsPlayer[]> {
  const { data, error } = await supabase
    .from(ODDS_TABLE)
    .select("data")
    .eq("key", CACHE_KEY)
    .single();

  if (error || !data) return [];
  return data.data as OddsPlayer[];
}
