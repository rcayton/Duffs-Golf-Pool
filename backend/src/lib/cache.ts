import { supabase } from "./supabase";
import { LeaderboardSnapshot, OddsPlayer, EnrichedPoolPlayer } from "../types";
import { MajorConfig } from "./major-config";

const CACHE_TABLE   = "leaderboard_cache";
const ODDS_TABLE    = "odds_cache";
const ARCHIVE_TABLE = "major_archives";
const CACHE_KEY     = "masters_2026";

// ─── Live snapshot cache ───────────────────────────────────────────────────────

export async function saveSnapshot(snapshot: LeaderboardSnapshot): Promise<void> {
  const { error } = await supabase.from(CACHE_TABLE).upsert(
    { key: CACHE_KEY, data: snapshot, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) console.error("Failed to save snapshot:", error.message);
}

export async function loadSnapshot(): Promise<LeaderboardSnapshot | null> {
  const { data, error } = await supabase
    .from(CACHE_TABLE).select("data").eq("key", CACHE_KEY).single();
  if (error || !data) return null;
  return data.data as LeaderboardSnapshot;
}

// ─── Odds cache ────────────────────────────────────────────────────────────────

export async function saveOdds(odds: OddsPlayer[]): Promise<void> {
  const { error } = await supabase.from(ODDS_TABLE).upsert(
    { key: CACHE_KEY, data: odds, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) console.error("Failed to save odds:", error.message);
}

export async function loadOdds(): Promise<OddsPlayer[]> {
  const { data, error } = await supabase
    .from(ODDS_TABLE).select("data").eq("key", CACHE_KEY).single();
  if (error || !data) return [];
  return data.data as OddsPlayer[];
}

// ─── Major archive ─────────────────────────────────────────────────────────────

export async function isArchived(majorId: string): Promise<boolean> {
  const { data } = await supabase
    .from(ARCHIVE_TABLE).select("major_id").eq("major_id", majorId).single();
  return !!data;
}

export async function saveArchive(
  major: MajorConfig,
  poolPlayers: EnrichedPoolPlayer[],
  snapshot: LeaderboardSnapshot,
  potTotal: number,
  winnerId: string | null
): Promise<void> {
  const { error } = await supabase.from(ARCHIVE_TABLE).upsert(
    {
      major_id:     major.id,
      major_name:   major.name,
      short_name:   major.short_name,
      source:       major.source,
      pool_players: poolPlayers,
      snapshot,
      pot_total:    potTotal,
      winner_id:    winnerId,
      archived_at:  new Date().toISOString(),
    },
    { onConflict: "major_id" }
  );
  if (error) console.error("Failed to save archive:", error.message);
  else console.log(`  Archived ${major.id} (winner: ${winnerId ?? "rollover"})`);
}

export interface MajorSummary {
  major_id: string;
  major_name: string;
  short_name: string;
  winner_id: string | null;
  pot_total: number;
  archived_at: string;
}

export async function listArchivedMajors(): Promise<MajorSummary[]> {
  const { data, error } = await supabase
    .from(ARCHIVE_TABLE)
    .select("major_id, major_name, short_name, winner_id, pot_total, archived_at")
    .order("archived_at", { ascending: false });
  if (error || !data) return [];
  return data as MajorSummary[];
}

export interface MajorArchive {
  major_id: string;
  major_name: string;
  short_name: string;
  pool_players: EnrichedPoolPlayer[];
  snapshot: LeaderboardSnapshot;
  pot_total: number;
  winner_id: string | null;
  archived_at: string;
}

export async function loadArchive(majorId: string): Promise<MajorArchive | null> {
  const { data, error } = await supabase
    .from(ARCHIVE_TABLE).select("*").eq("major_id", majorId).single();
  if (error || !data) return null;
  return data as MajorArchive;
}
