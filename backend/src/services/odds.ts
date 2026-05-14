import axios, { AxiosResponse } from "axios";
import { OddsPlayer } from "../types";
import { loadPoolPlayers } from "../lib/pool-picks";
import { ACTIVE_MAJOR } from "../lib/major-config";
import dotenv from "dotenv";
dotenv.config();

const ODDS_BASE = "https://api.the-odds-api.com/v4";
const API_KEY   = process.env.ODDS_API_KEY!;
const BOOKMAKER = "fanduel";

// Free tier: 500 requests/month. Set ODDS_TOKEN_FLOOR in .env to halt when low.
const TOKEN_FLOOR = parseInt(process.env.ODDS_TOKEN_FLOOR ?? "20", 10);

interface OddsApiOutcome {
  name: string;
  price: number;
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Array<{ key: string; outcomes: OddsApiOutcome[] }>;
}

interface OddsApiEvent {
  id: string;
  bookmakers: OddsApiBookmaker[];
}

// ─── Shared name normalizer ────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ø/g, "o").replace(/Ø/g, "o")
    .replace(/æ/g, "ae").replace(/Æ/g, "ae")
    .replace(/ð/g, "d").replace(/þ/g, "th")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastName(normalized: string): string {
  return normalized.split(" ").pop() ?? normalized;
}

// ─── Build set of all drafted golfer names from Supabase ─────────────────────

async function buildPickedNamesSet(): Promise<Set<string>> {
  const names = new Set<string>();
  try {
    const poolPlayers = await loadPoolPlayers();
    poolPlayers.forEach((p) =>
      p.picks
        .filter((pick) => pick.golfer_name && pick.golfer_name !== "TBD")
        .forEach((pick) => names.add(norm(pick.golfer_name)))
    );
  } catch (err) {
    console.warn("[odds] Failed to load pool picks for filtering:", err);
  }
  return names;
}

// ─── Token usage logging ──────────────────────────────────────────────────────

function logTokenUsage(res: AxiosResponse): number | null {
  const remaining = res.headers["x-requests-remaining"];
  const used      = res.headers["x-requests-used"];
  if (remaining !== undefined) {
    const rem = parseInt(remaining, 10);
    console.log(`  Odds API quota: ${used ?? "?"} used, ${rem} remaining this month`);
    if (rem <= TOKEN_FLOOR) {
      console.warn(`  WARNING: only ${rem} tokens left (floor: ${TOKEN_FLOOR}). Pausing odds fetches.`);
    }
    return rem;
  }
  return null;
}

// ─── Check token balance (costs 1 token) ──────────────────────────────────────

export async function getRemainingTokens(): Promise<number | null> {
  if (!API_KEY) return null;
  try {
    const res = await axios.get(`${ODDS_BASE}/sports`, {
      params: { apiKey: API_KEY },
      timeout: 5000,
    });
    const remaining = res.headers["x-requests-remaining"];
    return remaining !== undefined ? parseInt(remaining, 10) : null;
  } catch {
    return null;
  }
}

// ─── Probability helpers ──────────────────────────────────────────────────────

function americanToImpliedProb(american: number): number {
  return american > 0
    ? (100 / (american + 100)) * 100
    : (Math.abs(american) / (Math.abs(american) + 100)) * 100;
}

// Remove vig so probabilities sum to 100
function normalizeProbs(players: OddsPlayer[]): OddsPlayer[] {
  const total = players.reduce((s, p) => s + p.win_probability, 0);
  if (total === 0) return players;
  return players.map((p) => ({
    ...p,
    win_probability: parseFloat(((p.win_probability / total) * 100).toFixed(2)),
  }));
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchWinOdds(): Promise<OddsPlayer[]> {
  if (!API_KEY) {
    console.warn("  ODDS_API_KEY not set — skipping odds fetch");
    return [];
  }

  // On the-odds-api.com, golf outrights use the full market key as the sport key.
  // e.g. "golf_pga_championship_winner" is BOTH the sport key and the identifier.
  // The market parameter within that sport is always "outrights".
  const sportKey   = ACTIVE_MAJOR.odds_market_key; // e.g. "golf_pga_championship_winner"
  const oddsMarket = "outrights";

  let oddsRes: AxiosResponse<OddsApiEvent[]>;
  try {
    oddsRes = await axios.get<OddsApiEvent[]>(
      `${ODDS_BASE}/sports/${sportKey}/odds`,
      {
        params: {
          apiKey:     API_KEY,
          markets:    oddsMarket,
          bookmakers: BOOKMAKER,
          oddsFormat: "american",
        },
        timeout: 10000,
      }
    );
  } catch (err: any) {
    console.error("  Odds API request failed:", err.message);
    return [];
  }

  if (!(oddsRes.data?.[0]?.bookmakers?.length)) {
    console.warn(`  No FanDuel odds for ${sportKey} — market may not be open yet`);
    return [];
  }

  const remainingAfter = logTokenUsage(oddsRes);
  if (remainingAfter !== null && remainingAfter <= TOKEN_FLOOR) {
    console.warn("  Token floor reached — future fetches will be skipped.");
  }

  const event     = oddsRes.data[0];
  const bookmaker = event.bookmakers[0];
  const market    = bookmaker.markets.find((m) => m.key === oddsMarket);

  if (!market?.outcomes?.length) {
    console.warn("  FanDuel outrights market found but has no outcomes");
    return [];
  }

  // Build all players from the outrights market
  const allPlayers: OddsPlayer[] = market.outcomes.map((o) => ({
    name:            o.name,
    win_probability: americanToImpliedProb(o.price),
    implied_odds:    o.price,
    sportsbook:      bookmaker.title,
    last_updated:    bookmaker.last_update,
  }));

  // Filter to only the drafted pool picks (from Supabase)
  const pickedNames = await buildPickedNamesSet();

  if (pickedNames.size === 0) {
    console.warn("  No drafted picks found — returning full field odds");
    return normalizeProbs(allPlayers);
  }

  const picked = allPlayers.filter((player) => {
    const n    = norm(player.name);
    if (pickedNames.has(n)) return true;
    const last = lastName(n);
    return [...pickedNames].some((pn) => lastName(pn) === last);
  });

  if (picked.length < 3) {
    console.warn(
      `  Only ${picked.length} pool picks matched FanDuel names — ` +
      `returning full field. Check name spelling in draft picks.`
    );
    return normalizeProbs(allPlayers);
  }

  console.log(
    `  FanDuel: ${picked.length}/${pickedNames.size} pool picks matched ` +
    `(from ${allPlayers.length} total in market)`
  );

  return normalizeProbs(picked);
}

// ─── Name matching utility (used by pool-engine) ──────────────────────────────

export function matchOddsToEspn(
  oddsName: string,
  espnNames: string[]
): string | null {
  const normOdds = norm(oddsName);

  const exact = espnNames.find((n) => norm(n) === normOdds);
  if (exact) return exact;

  const oddsLast = lastName(normOdds);
  return espnNames.find((n) => lastName(norm(n)) === oddsLast) ?? null;
}
