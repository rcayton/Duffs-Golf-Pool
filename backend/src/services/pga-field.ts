// ─── Tournament field fetcher ──────────────────────────────────────────────────
// Pulls the live entry list for the ACTIVE major straight from the PGA Tour
// GraphQL API (the same source that powers the leaderboard). Used to validate
// draft picks and to drive the pick autocomplete.
//
// This replaces the old hardcoded field — the field is now always in sync with
// whichever tournament ACTIVE_MAJOR points at (e.g. the U.S. Open).

import axios from "axios";
import { ACTIVE_MAJOR } from "../lib/major-config";
import { TOURNAMENT_IDS } from "./pgatour";

export interface FieldPlayer {
  espn_id: string; // PGA Tour player id (kept as `espn_id` for compatibility)
  name: string;    // "First Last"
}

const GRAPHQL_URL = "https://orchestrator.pgatour.com/graphql";
const API_KEY = "da2-gsrx5bibzbb4njvhl7t37wqyl4";

let fieldCache: FieldPlayer[] | null = null;

export async function fetchPgaField(): Promise<FieldPlayer[]> {
  if (fieldCache) return fieldCache;

  const tournamentId = TOURNAMENT_IDS[ACTIVE_MAJOR.id];
  if (!tournamentId) {
    console.warn(`[field] No PGA Tour tournament id mapped for ${ACTIVE_MAJOR.id}`);
    return [];
  }

  const query = `{
    field(id: "${tournamentId}") {
      tournamentName
      players {
        id
        firstName
        lastName
        displayName
      }
    }
  }`;

  try {
    const res = await axios.post(
      GRAPHQL_URL,
      { query },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        timeout: 10000,
      }
    );

    const players = res.data?.data?.field?.players;
    if (!Array.isArray(players) || players.length === 0) {
      const errs = res.data?.errors?.map((e: any) => e.message).join("; ");
      console.warn(
        `[field] No field returned for ${ACTIVE_MAJOR.id} (${tournamentId})` +
        (errs ? ` — ${errs}` : " — entry list may not be published yet")
      );
      return [];
    }

    const field: FieldPlayer[] = players
      .map((p: any) => {
        const name =
          p.firstName && p.lastName
            ? `${p.firstName} ${p.lastName}`
            : // displayName comes back as "Last, First" — flip it as a fallback
              String(p.displayName ?? "")
                .split(",")
                .map((s: string) => s.trim())
                .reverse()
                .join(" ");
        return { espn_id: String(p.id ?? ""), name };
      })
      .filter((p: FieldPlayer) => p.name.length > 0)
      .sort((a: FieldPlayer, b: FieldPlayer) => a.name.localeCompare(b.name));

    console.log(`[field] Loaded ${field.length} players for ${ACTIVE_MAJOR.short_name}`);
    fieldCache = field;
    return field;
  } catch (err: any) {
    console.error(`[field] Failed to fetch field for ${ACTIVE_MAJOR.id}:`, err.message);
    return [];
  }
}

/** Clear the in-process field cache (called on draft reset). */
export function clearFieldCache(): void {
  fieldCache = null;
}
