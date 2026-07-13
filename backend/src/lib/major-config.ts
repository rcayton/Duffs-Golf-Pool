// ─── Major configuration ───────────────────────────────────────────────────────
// Add a new entry to ALL_MAJORS for each upcoming major, then update
// ACTIVE_MAJOR_ID to switch the live feed and pool config.
//
// source:
//   "masters"  → uses masters.com scores.json (only for The Masters)
//   "espn"     → uses ESPN events API (fallback)
//   "pgatour"  → uses PGA Tour GraphQL API (preferred for non-Masters majors)

export type MajorSource = "masters" | "espn" | "pgatour";

export interface MajorConfig {
  id: string;           // stable key used as Supabase cache key
  name: string;         // full tournament name
  short_name: string;   // used in header subheader and dropdown
  year: number;
  dates: string;        // display string
  start_date: string;   // ISO date "YYYY-MM-DD" — used to detect pre-tournament
  source: MajorSource;
  odds_market_key: string;  // The Odds API sport key (also used as sport identifier, market is "outrights")
  draft_at?: string;    // ISO timestamp (UTC) of the scheduled draft lottery — drives the countdown banner
  play_start_hour_et?: number; // odds/history polling window override (default 8–19 ET)
  play_end_hour_et?: number;   // UK-based majors play overnight ET, so they need earlier hours
}

export const ALL_MAJORS: MajorConfig[] = [
  {
    id: "masters_2026",
    name: "2026 Masters Tournament",
    short_name: "2026 Masters",
    year: 2026,
    dates: "April 9–12, 2026",
    start_date: "2026-04-09",
    source: "masters",
    odds_market_key: "golf_masters_tournament_winner",
  },
  {
    id: "pga_2026",
    name: "2026 PGA Championship",
    short_name: "PGA Championship 2026",
    year: 2026,
    dates: "May 14–17, 2026",
    start_date: "2026-05-14",
    source: "pgatour",
    odds_market_key: "golf_pga_championship_winner",
  },
  {
    id: "us_open_2026",
    name: "2026 U.S. Open",
    short_name: "U.S. Open 2026",
    year: 2026,
    dates: "June 18–21, 2026",
    start_date: "2026-06-18",
    source: "pgatour",
    odds_market_key: "golf_us_open_winner",
    // Draft lottery: Wednesday June 17, 2026, 10:00 PM Central (CDT = UTC−5) → 03:00 UTC Jun 18
    draft_at: "2026-06-18T03:00:00Z",
  },
  {
    id: "the_open_2026",
    name: "2026 Open Championship",
    short_name: "The Open 2026",
    year: 2026,
    dates: "July 16–19, 2026",
    start_date: "2026-07-16",
    source: "pgatour",
    odds_market_key: "golf_the_open_championship_winner",
    // Royal Birkdale tee times ≈ 1:30am–3pm ET
    play_start_hour_et: 2,
    play_end_hour_et: 15,
  },
];

// ─── Active major ──────────────────────────────────────────────────────────────
// Change this ID to switch to the next major. Everything else routes
// automatically based on the MajorConfig above.

export const ACTIVE_MAJOR_ID = "the_open_2026";

export const ACTIVE_MAJOR: MajorConfig =
  ALL_MAJORS.find((m) => m.id === ACTIVE_MAJOR_ID) ?? ALL_MAJORS[0];
