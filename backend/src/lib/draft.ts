import { supabase } from "./supabase";
import { POOL_PLAYERS } from "./pool-config";
import { ACTIVE_MAJOR } from "./major-config";
import { fetchPgaField, FieldPlayer } from "../services/pga-field";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DraftStatus = "idle" | "in_progress" | "complete";

export interface DraftPickRecord {
  pick_number: number;      // 1–28
  round:        1 | 2 | 3 | 4;
  draft_slot:   number;     // position within the round (1–7)
  player_id:    string;     // pool player making this pick
  player_name:  string;
  golfer_name:  string | null; // null = not yet filled
}

export interface DraftState {
  major_id:     string;
  status:       DraftStatus;
  draft_order:  string[];           // player_ids in lottery order
  picks:        DraftPickRecord[];  // all 28 slots
  completed_at: string | null;
  updated_at:   string;
}

// ─── Snake order builder ───────────────────────────────────────────────────────
// Generates all 28 DraftPickRecords given a lottery order (7 player ids).
// Round 1: left→right (slots 1–7)
// Round 2: right→left (slots 7–1)
// Round 3: left→right (slots 1–7)
// Round 4: right→left (slots 7–1)

export function buildSnakePicks(draftOrder: string[]): DraftPickRecord[] {
  const n = draftOrder.length;
  const picks: DraftPickRecord[] = [];
  let pickNumber = 1;

  for (let round = 1; round <= 4; round++) {
    const reversed = round % 2 === 0;
    for (let slot = 1; slot <= n; slot++) {
      const orderIdx = reversed ? n - slot : slot - 1;
      const playerId = draftOrder[orderIdx];
      const player = POOL_PLAYERS.find((p) => p.id === playerId);
      picks.push({
        pick_number: pickNumber++,
        round: round as 1 | 2 | 3 | 4,
        draft_slot: slot,
        player_id: playerId,
        player_name: player?.name ?? playerId,
        golfer_name: null,
      });
    }
  }

  return picks;
}

// ─── Name normalization (mirrors pool-engine.ts) ───────────────────────────────

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

// ─── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  ok:            boolean;
  error?:        string;
  matched_name?: string;  // canonical name from the field (spelling corrected)
}

export async function validatePick(
  golferName: string,
  excludePickNumber: number,
  currentPicks: DraftPickRecord[]
): Promise<ValidationResult> {
  const field: FieldPlayer[] = await fetchPgaField();
  const norm = normalizeName(golferName);

  // Case-insensitive exact match against the field
  const matched = field.find((f) => normalizeName(f.name) === norm);
  if (!matched) {
    return { ok: false, error: `"${golferName}" is not in the PGA Championship field.` };
  }

  // Duplicate check — same golfer already picked in a different slot
  const duplicate = currentPicks.find(
    (p) =>
      p.pick_number !== excludePickNumber &&
      p.golfer_name !== null &&
      normalizeName(p.golfer_name) === norm
  );
  if (duplicate) {
    return {
      ok: false,
      error: `${matched.name} was already picked by ${duplicate.player_name} (pick #${duplicate.pick_number}).`,
    };
  }

  return { ok: true, matched_name: matched.name };
}

// ─── Supabase CRUD ─────────────────────────────────────────────────────────────

const TABLE = "draft_state";

export async function loadDraftState(): Promise<DraftState | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("major_id", ACTIVE_MAJOR.id)
    .single();

  if (error || !data) return null;

  return {
    major_id:     data.major_id,
    status:       data.status as DraftStatus,
    draft_order:  data.draft_order as string[],
    picks:        data.picks as DraftPickRecord[],
    completed_at: data.completed_at ?? null,
    updated_at:   data.updated_at,
  };
}

async function saveDraftState(state: Omit<DraftState, "updated_at">): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      major_id:     state.major_id,
      status:       state.status,
      draft_order:  state.draft_order,
      picks:        state.picks,
      completed_at: state.completed_at,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: "major_id" }
  );
  if (error) throw new Error(`Failed to save draft state: ${error.message}`);
}

// ─── Business operations ───────────────────────────────────────────────────────

/** Shuffle the pool players into a random lottery order and start the draft. */
export async function runLottery(): Promise<DraftState> {
  // Idempotency check — don't re-run if already in progress or complete
  const existing = await loadDraftState();
  if (existing && existing.status !== "idle") {
    throw new Error(
      `Draft is already ${existing.status}. Reset it first to run the lottery again.`
    );
  }

  // Fisher-Yates shuffle
  const ids = POOL_PLAYERS.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const picks = buildSnakePicks(ids);

  const state: Omit<DraftState, "updated_at"> = {
    major_id:     ACTIVE_MAJOR.id,
    status:       "in_progress",
    draft_order:  ids,
    picks,
    completed_at: null,
  };

  await saveDraftState(state);
  return { ...state, updated_at: new Date().toISOString() };
}

/** Set a single pick by pick_number. Validates field membership + duplicates. */
export async function setPick(
  pickNumber: number,
  golferName: string
): Promise<{ state: DraftState; error?: string }> {
  const state = await loadDraftState();
  if (!state) {
    return { state: null as any, error: "Draft has not been started. Run the lottery first." };
  }
  if (state.status === "idle") {
    return { state, error: "Draft has not been started. Run the lottery first." };
  }
  if (state.status === "complete") {
    return { state, error: "Draft is already complete. Reset to make changes." };
  }

  const slot = state.picks.find((p) => p.pick_number === pickNumber);
  if (!slot) {
    return { state, error: `Invalid pick number: ${pickNumber}` };
  }

  // Allow clearing a pick (empty string)
  const trimmed = golferName.trim();
  if (trimmed === "") {
    slot.golfer_name = null;
    await saveDraftState({ ...state, picks: state.picks });
    return { state: { ...state, picks: state.picks } };
  }

  const validation = await validatePick(trimmed, pickNumber, state.picks);
  if (!validation.ok) {
    return { state, error: validation.error };
  }

  slot.golfer_name = validation.matched_name!;
  await saveDraftState({ ...state, picks: state.picks });
  return { state: { ...state, picks: state.picks } };
}

/** Check all 28 picks are filled and valid (used before completing). */
export function allPicksValid(picks: DraftPickRecord[]): {
  ok: boolean;
  missing: number[];
} {
  const missing = picks
    .filter((p) => !p.golfer_name)
    .map((p) => p.pick_number);
  return { ok: missing.length === 0, missing };
}

/** Mark draft complete and write picks to pool_picks table. */
export async function completeDraft(): Promise<{ state: DraftState; error?: string }> {
  const state = await loadDraftState();
  if (!state) {
    return { state: null as any, error: "No draft in progress." };
  }
  if (state.status !== "in_progress") {
    return { state, error: `Cannot complete draft with status "${state.status}".` };
  }

  // Final validation pass
  const { ok, missing } = allPicksValid(state.picks);
  if (!ok) {
    return {
      state,
      error: `Cannot complete draft — picks missing for pick numbers: ${missing.join(", ")}.`,
    };
  }

  // Write each pick to pool_picks table
  // Group by player: each player has exactly 4 picks (round_slot 1–4)
  const playerPicks: Record<string, DraftPickRecord[]> = {};
  for (const pick of state.picks) {
    if (!playerPicks[pick.player_id]) playerPicks[pick.player_id] = [];
    playerPicks[pick.player_id].push(pick);
  }

  // Assign round_slot based on round (1–4) from the draft
  const rows: {
    major_id:    string;
    player_id:   string;
    round_slot:  number;
    golfer_name: string;
    espn_id:     null;
  }[] = [];

  for (const [playerId, picks] of Object.entries(playerPicks)) {
    // Sort by round so round_slot matches the actual round
    picks.sort((a, b) => a.round - b.round);
    picks.forEach((pick) => {
      rows.push({
        major_id:   ACTIVE_MAJOR.id,
        player_id:  playerId,
        round_slot: pick.round as number,
        golfer_name: pick.golfer_name!,
        espn_id:    null,
      });
    });
  }

  const { error: upsertError } = await supabase
    .from("pool_picks")
    .upsert(rows, { onConflict: "major_id,player_id,round_slot" });

  if (upsertError) {
    return { state, error: `Failed to save picks: ${upsertError.message}` };
  }

  // Mark draft complete
  const completedState = {
    ...state,
    status: "complete" as DraftStatus,
    completed_at: new Date().toISOString(),
  };
  await saveDraftState(completedState);
  return { state: { ...completedState, updated_at: new Date().toISOString() } };
}

/** Reset draft — wipes draft_state + pool_picks for the active major. */
export async function resetDraft(): Promise<void> {
  // Clear pool_picks for this major
  const { error: picksErr } = await supabase
    .from("pool_picks")
    .delete()
    .eq("major_id", ACTIVE_MAJOR.id);
  if (picksErr) throw new Error(`Failed to clear pool_picks: ${picksErr.message}`);

  // Reset draft_state to idle
  const { error: stateErr } = await supabase.from(TABLE).upsert(
    {
      major_id:     ACTIVE_MAJOR.id,
      status:       "idle",
      draft_order:  [],
      picks:        [],
      completed_at: null,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: "major_id" }
  );
  if (stateErr) throw new Error(`Failed to reset draft state: ${stateErr.message}`);
}
