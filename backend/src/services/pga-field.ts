import axios from "axios";
import { ACTIVE_MAJOR } from "../lib/major-config";

// ─── PGA field fetcher ─────────────────────────────────────────────────────────
// Primary: ESPN events endpoint (same one espn.ts uses for scores).
// The competitors[] array IS the field — every entrant appears even pre-tournament.
// Fallback: hardcoded 2026 PGA Championship field (used when ESPN returns empty
// or the tournament hasn't been seeded into the events feed yet).

export interface FieldPlayer {
  espn_id: string;
  name: string;       // "Scottie Scheffler"
}

// Cache: re-fetch at most once per hour per process lifetime.
let fieldCache: FieldPlayer[] | null = null;
let fieldCachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchPgaField(): Promise<FieldPlayer[]> {
  if (fieldCache && Date.now() - fieldCachedAt < CACHE_TTL_MS) {
    return fieldCache;
  }

  try {
    const ESPN_EVENTS_URL =
      "https://site.api.espn.com/apis/site/v2/sports/golf/pga/events?limit=200";

    const res = await axios.get<any>(ESPN_EVENTS_URL, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DuffsPool/1.0)" },
    });

    const event = res.data?.events?.[0];
    const competitors: any[] = event?.competitors ?? [];

    if (competitors.length > 0) {
      const field: FieldPlayer[] = competitors
        .filter((c) => c.id && c.displayName)
        .map((c) => ({ espn_id: String(c.id), name: c.displayName as string }))
        .sort((a, b) => a.name.localeCompare(b.name));

      fieldCache = field;
      fieldCachedAt = Date.now();
      console.log(`[pga-field] Fetched ${field.length} players from ESPN for ${ACTIVE_MAJOR.short_name}`);
      return field;
    }
  } catch (err: any) {
    console.warn("[pga-field] ESPN fetch failed:", err.message, "— using fallback field");
  }

  // ─── Fallback: 2026 PGA Championship field ─────────────────────────────────
  // Sourced from the confirmed entry list. Update espn_ids after the ESPN feed
  // goes live (inspect /api/leaderboard after R1 starts).
  const fallback: FieldPlayer[] = [
    { espn_id: "", name: "Akshay Bhatia" },
    { espn_id: "", name: "Alex Noren" },
    { espn_id: "", name: "Andrew Putnam" },
    { espn_id: "", name: "Austin Eckroat" },
    { espn_id: "", name: "Billy Horschel" },
    { espn_id: "", name: "Brian Harman" },
    { espn_id: "", name: "Brooks Koepka" },
    { espn_id: "", name: "Bryson DeChambeau" },
    { espn_id: "", name: "Cameron Davis" },
    { espn_id: "", name: "Cameron Smith" },
    { espn_id: "", name: "Cameron Young" },
    { espn_id: "", name: "Christiaan Bezuidenhout" },
    { espn_id: "", name: "Collin Morikawa" },
    { espn_id: "", name: "Corey Conners" },
    { espn_id: "", name: "Denny McCarthy" },
    { espn_id: "", name: "Dustin Johnson" },
    { espn_id: "", name: "Erik van Rooyen" },
    { espn_id: "", name: "Francesco Molinari" },
    { espn_id: "", name: "Freddie Jacobson" },
    { espn_id: "", name: "Gary Woodland" },
    { espn_id: "", name: "Hideki Matsuyama" },
    { espn_id: "", name: "J.J. Spaun" },
    { espn_id: "", name: "Jacob Bridgeman" },
    { espn_id: "", name: "Jake Knapp" },
    { espn_id: "", name: "Jason Day" },
    { espn_id: "", name: "Jhonattan Vegas" },
    { espn_id: "", name: "Jon Rahm" },
    { espn_id: "", name: "Jordan Spieth" },
    { espn_id: "", name: "Jose Luis Ballester" },
    { espn_id: "", name: "Justin Rose" },
    { espn_id: "", name: "Justin Thomas" },
    { espn_id: "", name: "Keegan Bradley" },
    { espn_id: "", name: "Kevin Kisner" },
    { espn_id: "", name: "Kevin Yu" },
    { espn_id: "", name: "Kurt Kitayama" },
    { espn_id: "", name: "Louis Oosthuizen" },
    { espn_id: "", name: "Ludvig Aberg" },
    { espn_id: "", name: "Luke List" },
    { espn_id: "", name: "Marc Leishman" },
    { espn_id: "", name: "Mark Hubbard" },
    { espn_id: "", name: "Matt Fitzpatrick" },
    { espn_id: "", name: "Matt Kuchar" },
    { espn_id: "", name: "Matt Wallace" },
    { espn_id: "", name: "Max Greyserman" },
    { espn_id: "", name: "Max Homa" },
    { espn_id: "", name: "Min Woo Lee" },
    { espn_id: "", name: "Nick Dunlap" },
    { espn_id: "", name: "Nick Taylor" },
    { espn_id: "", name: "Nicolai Hojgaard" },
    { espn_id: "", name: "Patrick Cantlay" },
    { espn_id: "", name: "Patrick Reed" },
    { espn_id: "", name: "Paul Casey" },
    { espn_id: "", name: "Peter Malnati" },
    { espn_id: "", name: "Rasmus Hojgaard" },
    { espn_id: "", name: "Rickie Fowler" },
    { espn_id: "", name: "Robert MacIntyre" },
    { espn_id: "", name: "Rory McIlroy" },
    { espn_id: "", name: "Russell Henley" },
    { espn_id: "", name: "Ryan Fox" },
    { espn_id: "", name: "Sam Burns" },
    { espn_id: "", name: "Sahith Theegala" },
    { espn_id: "", name: "Scottie Scheffler" },
    { espn_id: "", name: "Seamus Power" },
    { espn_id: "", name: "Shane Lowry" },
    { espn_id: "", name: "Si Woo Kim" },
    { espn_id: "", name: "Stephan Jaeger" },
    { espn_id: "", name: "Sungjae Im" },
    { espn_id: "", name: "Taylor Moore" },
    { espn_id: "", name: "Thomas Detry" },
    { espn_id: "", name: "Tom Kim" },
    { espn_id: "", name: "Tommy Fleetwood" },
    { espn_id: "", name: "Tony Finau" },
    { espn_id: "", name: "Troy Merritt" },
    { espn_id: "", name: "Tyrrell Hatton" },
    { espn_id: "", name: "Victor Perez" },
    { espn_id: "", name: "Viktor Hovland" },
    { espn_id: "", name: "Webb Simpson" },
    { espn_id: "", name: "Will Zalatoris" },
    { espn_id: "", name: "Wyndham Clark" },
    { espn_id: "", name: "Xander Schauffele" },
    { espn_id: "", name: "Zach Johnson" },
  ].sort((a, b) => a.name.localeCompare(b.name));

  fieldCache = fallback;
  fieldCachedAt = Date.now();
  return fallback;
}

/** Clear the in-process field cache (called on draft reset so next pick sees fresh data). */
export function clearFieldCache(): void {
  fieldCache = null;
  fieldCachedAt = 0;
}
