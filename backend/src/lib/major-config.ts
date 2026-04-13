// ─── Major configuration ───────────────────────────────────────────────────────
// Add a new entry to ALL_MAJORS for each upcoming major, then update
// ACTIVE_MAJOR_ID to switch the live feed and pool config.
//
// source:
//   "masters" → uses masters.com scores.json (only for The Masters)
//   "espn"    → uses ESPN events API (PGA Championship, US Open, The Open)

export type MajorSource = "masters" | "espn";

export interface MajorConfig {
  id: string;           // stable key used as Supabase cache key
  name: string;         // full tournament name
  short_name: string;   // used in header subheader and dropdown
  year: number;
  dates: string;        // display string
  source: MajorSource;
  odds_market_key: string;  // The Odds API market key
}

export const ALL_MAJORS: MajorConfig[] = [
  {
    id: "masters_2026",
    name: "2026 Masters Tournament",
    short_name: "2026 Masters",
    year: 2026,
    dates: "April 9–12, 2026",
    source: "masters",
    odds_market_key: "golf_masters_tournament_winner",
  },
  {
    id: "pga_2026",
    name: "2026 PGA Championship",
    short_name: "PGA Championship 2026",
    year: 2026,
    dates: "May 14–17, 2026",
    source: "espn",
    odds_market_key: "golf_pga_championship_winner",
  },
];

// ─── Active major ──────────────────────────────────────────────────────────────
// Change this ID to switch to the next major. Everything else routes
// automatically based on the MajorConfig above.

export const ACTIVE_MAJOR_ID = "pga_2026";

export const ACTIVE_MAJOR: MajorConfig =
  ALL_MAJORS.find((m) => m.id === ACTIVE_MAJOR_ID) ?? ALL_MAJORS[0];
