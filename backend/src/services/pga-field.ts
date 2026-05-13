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

  // ─── Fallback: 2026 PGA Championship official field ──────────────────────────
  const fallback: FieldPlayer[] = [
    { espn_id: "", name: "Ludvig Åberg" },
    { espn_id: "", name: "Angel Ayora" },
    { espn_id: "", name: "Derek Berg" },
    { espn_id: "", name: "Daniel Berger" },
    { espn_id: "", name: "Christiaan Bezuidenhout" },
    { espn_id: "", name: "Akshay Bhatia" },
    { espn_id: "", name: "Francisco Bide" },
    { espn_id: "", name: "Chandler Blanchet" },
    { espn_id: "", name: "Michael Block" },
    { espn_id: "", name: "Keegan Bradley" },
    { espn_id: "", name: "Michael Brennan" },
    { espn_id: "", name: "Jacob Bridgeman" },
    { espn_id: "", name: "Daniel Brown" },
    { espn_id: "", name: "Sam Burns" },
    { espn_id: "", name: "Brian Campbell" },
    { espn_id: "", name: "Patrick Cantlay" },
    { espn_id: "", name: "Ricky Castillo" },
    { espn_id: "", name: "Bud Cauley" },
    { espn_id: "", name: "Stewart Cink" },
    { espn_id: "", name: "Wyndham Clark" },
    { espn_id: "", name: "Tyler Collet" },
    { espn_id: "", name: "Corey Conners" },
    { espn_id: "", name: "Pierceson Coody" },
    { espn_id: "", name: "Jason Day" },
    { espn_id: "", name: "Bryson DeChambeau" },
    { espn_id: "", name: "Thomas Detry" },
    { espn_id: "", name: "Luke Donald" },
    { espn_id: "", name: "Jesse Droemer" },
    { espn_id: "", name: "Jason Dufner" },
    { espn_id: "", name: "Nico Echavarria" },
    { espn_id: "", name: "Harris English" },
    { espn_id: "", name: "Bryce Fisher" },
    { espn_id: "", name: "Steven Fisk" },
    { espn_id: "", name: "Alex Fitzpatrick" },
    { espn_id: "", name: "Matthew Fitzpatrick" },
    { espn_id: "", name: "Tommy Fleetwood" },
    { espn_id: "", name: "Rickie Fowler" },
    { espn_id: "", name: "Ryan Fox" },
    { espn_id: "", name: "Chris Gabriele" },
    { espn_id: "", name: "Mark Geddes" },
    { espn_id: "", name: "Ryan Gerard" },
    { espn_id: "", name: "Lucas Glover" },
    { espn_id: "", name: "Chris Gotterup" },
    { espn_id: "", name: "Max Greyserman" },
    { espn_id: "", name: "Ben Griffin" },
    { espn_id: "", name: "Emiliano Grillo" },
    { espn_id: "", name: "Jordan Gumberg" },
    { espn_id: "", name: "Harry Hall" },
    { espn_id: "", name: "Brian Harman" },
    { espn_id: "", name: "Pádraig Harrington" },
    { espn_id: "", name: "Tyrrell Hatton" },
    { espn_id: "", name: "Zach Haynes" },
    { espn_id: "", name: "Russell Henley" },
    { espn_id: "", name: "Kazuki Higa" },
    { espn_id: "", name: "Garrick Higgo" },
    { espn_id: "", name: "Joe Highsmith" },
    { espn_id: "", name: "Daniel Hillier" },
    { espn_id: "", name: "Ryo Hisatsune" },
    { espn_id: "", name: "Rico Hoey" },
    { espn_id: "", name: "Nicolai Højgaard" },
    { espn_id: "", name: "Rasmus Højgaard" },
    { espn_id: "", name: "Ian Holt" },
    { espn_id: "", name: "Max Homa" },
    { espn_id: "", name: "Billy Horschel" },
    { espn_id: "", name: "Viktor Hovland" },
    { espn_id: "", name: "Austin Hurt" },
    { espn_id: "", name: "Sungjae Im" },
    { espn_id: "", name: "Stephan Jaeger" },
    { espn_id: "", name: "Casey Jarvis" },
    { espn_id: "", name: "Dustin Johnson" },
    { espn_id: "", name: "Jared Jones" },
    { espn_id: "", name: "Kota Kaneko" },
    { espn_id: "", name: "Michael Kartrude" },
    { espn_id: "", name: "Martin Kaymer" },
    { espn_id: "", name: "John Keefer" },
    { espn_id: "", name: "Ben Kern" },
    { espn_id: "", name: "Michael Kim" },
    { espn_id: "", name: "Si Woo Kim" },
    { espn_id: "", name: "Chris Kirk" },
    { espn_id: "", name: "Kurt Kitayama" },
    { espn_id: "", name: "Jake Knapp" },
    { espn_id: "", name: "Brooks Koepka" },
    { espn_id: "", name: "Min Woo Lee" },
    { espn_id: "", name: "Ryan Lenahan" },
    { espn_id: "", name: "Haotong Li" },
    { espn_id: "", name: "Mikael Lindberg" },
    { espn_id: "", name: "David Lipsky" },
    { espn_id: "", name: "Shane Lowry" },
    { espn_id: "", name: "Robert MacIntyre" },
    { espn_id: "", name: "Hideki Matsuyama" },
    { espn_id: "", name: "Denny McCarthy" },
    { espn_id: "", name: "Matt McCarty" },
    { espn_id: "", name: "Paul McClure" },
    { espn_id: "", name: "Max McGreevy" },
    { espn_id: "", name: "Rory McIlroy" },
    { espn_id: "", name: "Tom McKibbin" },
    { espn_id: "", name: "Maverick McNealy" },
    { espn_id: "", name: "Shaun Micheel" },
    { espn_id: "", name: "Keith Mitchell" },
    { espn_id: "", name: "Collin Morikawa" },
    { espn_id: "", name: "William Mouw" },
    { espn_id: "", name: "Rasmus Neergaard-Petersen" },
    { espn_id: "", name: "Joaquin Niemann" },
    { espn_id: "", name: "Alex Noren" },
    { espn_id: "", name: "Andrew Novak" },
    { espn_id: "", name: "John Parry" },
    { espn_id: "", name: "Taylor Pendrith" },
    { espn_id: "", name: "Marco Penge" },
    { espn_id: "", name: "Ben Polland" },
    { espn_id: "", name: "J.T. Poston" },
    { espn_id: "", name: "Aldrich Potgieter" },
    { espn_id: "", name: "David Puig" },
    { espn_id: "", name: "Andrew Putnam" },
    { espn_id: "", name: "Jon Rahm" },
    { espn_id: "", name: "Aaron Rai" },
    { espn_id: "", name: "Patrick Reed" },
    { espn_id: "", name: "Kristoffer Reitan" },
    { espn_id: "", name: "Davis Riley" },
    { espn_id: "", name: "Patrick Rodgers" },
    { espn_id: "", name: "Justin Rose" },
    { espn_id: "", name: "Adrien Saddier" },
    { espn_id: "", name: "Garrett Sapp" },
    { espn_id: "", name: "Jayden Schaper" },
    { espn_id: "", name: "Xander Schauffele" },
    { espn_id: "", name: "Scottie Scheffler" },
    { espn_id: "", name: "Adam Schenk" },
    { espn_id: "", name: "Matti Schmid" },
    { espn_id: "", name: "Adam Scott" },
    { espn_id: "", name: "Braden Shattuck" },
    { espn_id: "", name: "Alex Smalley" },
    { espn_id: "", name: "Cameron Smith" },
    { espn_id: "", name: "Jordan Smith" },
    { espn_id: "", name: "Austin Smotherman" },
    { espn_id: "", name: "Elvis Smylie" },
    { espn_id: "", name: "Travis Smyth" },
    { espn_id: "", name: "J.J. Spaun" },
    { espn_id: "", name: "Jordan Spieth" },
    { espn_id: "", name: "Sam Stevens" },
    { espn_id: "", name: "Sepp Straka" },
    { espn_id: "", name: "Andy Sullivan" },
    { espn_id: "", name: "Nick Taylor" },
    { espn_id: "", name: "Sahith Theegala" },
    { espn_id: "", name: "Justin Thomas" },
    { espn_id: "", name: "Michael Thorbjornsen" },
    { espn_id: "", name: "Sami Valimaki" },
    { espn_id: "", name: "Jhonattan Vegas" },
    { espn_id: "", name: "Ryan Vermeer" },
    { espn_id: "", name: "Jimmy Walker" },
    { espn_id: "", name: "Matt Wallace" },
    { espn_id: "", name: "Bernd Wiesberger" },
    { espn_id: "", name: "Timothy Wiseman" },
    { espn_id: "", name: "Gary Woodland" },
    { espn_id: "", name: "Y.E. Yang" },
    { espn_id: "", name: "Cameron Young" },
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
