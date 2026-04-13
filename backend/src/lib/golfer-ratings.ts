// ─── Golfer ratings ────────────────────────────────────────────────────────────
// Pre-tournament field ratings for each major, keyed by major id.
//
// rating: 0–100 scoring ability scale
//   100 = best player in the world
//     0 = weakest player in a major field
//
// Calibration targets (72-hole total relative to par):
//   rating 98  → expected ~-11 to -14  (contender range)
//   rating 60  → expected ~  0 to  +2  (makes cut, middle of field)
//   rating 20  → expected ~ +8 to +12  (back of field)

export interface GolferRating {
  name: string;       // must match names in the leaderboard (normalisation handles minor diffs)
  ranking: number;    // world ranking (informational)
  rating: number;     // 0–100 scoring ability
}

// ─── Distribution parameters ──────────────────────────────────────────────────
// Per-hole mean and std are linear interpolations between anchor points.

// Tuned via grid search against Polymarket R3/R4 checkpoints, Masters 2026.
// Original defaults: mean100=-0.160, mean0=+0.110, std100=0.78, std0=1.05
const MEAN_AT_100 = -0.350;  // ~-25.2 over 72 holes (elite player)
const MEAN_AT_0   = +0.130;  // ~+9.4 over 72 holes  (weakest field player)
const STD_AT_100  =  0.550;
const STD_AT_0    =  0.850;

export function ratingToMean(rating: number): number {
  const t = Math.max(0, Math.min(100, rating)) / 100;
  return MEAN_AT_0 + t * (MEAN_AT_100 - MEAN_AT_0);
}

export function ratingToStd(rating: number): number {
  const t = Math.max(0, Math.min(100, rating)) / 100;
  return STD_AT_0 + t * (STD_AT_100 - STD_AT_0);
}

// ─── Field ratings per major ──────────────────────────────────────────────────

const FIELD_RATINGS: Record<string, GolferRating[]> = {
  masters_2026: [
    { name: "Scottie Scheffler",   ranking:  1, rating: 98 },
    { name: "Rory McIlroy",        ranking:  2, rating: 95 },
    { name: "Xander Schauffele",   ranking:  3, rating: 90 },
    { name: "Collin Morikawa",     ranking:  4, rating: 89 },
    { name: "Ludvig Aberg",        ranking:  5, rating: 87 },
    { name: "Ludvig Åberg",        ranking:  5, rating: 87 },  // alternate spelling
    { name: "Tommy Fleetwood",     ranking:  6, rating: 85 },
    { name: "Brooks Koepka",       ranking:  7, rating: 84 },
    { name: "Patrick Cantlay",     ranking:  8, rating: 83 },
    { name: "Hideki Matsuyama",    ranking:  9, rating: 82 },
    { name: "Jordan Spieth",       ranking: 10, rating: 81 },
    { name: "Tyrrell Hatton",      ranking: 11, rating: 80 },
    { name: "Shane Lowry",         ranking: 12, rating: 79 },
    { name: "Wyndham Clark",       ranking: 13, rating: 78 },
    { name: "Bryson DeChambeau",   ranking: 14, rating: 77 },
    { name: "Justin Rose",         ranking: 15, rating: 76 },
    { name: "Jason Day",           ranking: 16, rating: 75 },
    { name: "Max Homa",            ranking: 17, rating: 74 },
    { name: "Russell Henley",      ranking: 18, rating: 73 },
    { name: "Sam Burns",           ranking: 19, rating: 72 },
    { name: "Matt Fitzpatrick",    ranking: 20, rating: 71 },
    { name: "Cameron Young",       ranking: 21, rating: 70 },
    { name: "Cam Young",           ranking: 21, rating: 70 },  // alternate
    { name: "Jon Rahm",            ranking: 22, rating: 83 },  // LIV, still elite
    { name: "Viktor Hovland",      ranking: 23, rating: 78 },
    { name: "Patrick Reed",        ranking: 24, rating: 69 },
    { name: "Corey Conners",       ranking: 25, rating: 68 },
    { name: "Chris Gotterup",      ranking: 26, rating: 67 },
    { name: "Robert MacIntyre",    ranking: 27, rating: 72 },
    { name: "Min Woo Lee",         ranking: 28, rating: 70 },
    { name: "Sepp Straka",         ranking: 29, rating: 68 },
    { name: "Si Woo Kim",          ranking: 30, rating: 67 },
    { name: "Nicolai Hojgaard",    ranking: 31, rating: 66 },
    { name: "Nicolai Højgaard",    ranking: 31, rating: 66 },  // alternate
    { name: "Justin Thomas",       ranking: 32, rating: 75 },
    { name: "Akshay Bhatia",       ranking: 33, rating: 68 },
    { name: "Ben Griffin",         ranking: 34, rating: 67 },
    { name: "Nick Taylor",         ranking: 35, rating: 66 },
    { name: "Ryan Gerard",         ranking: 36, rating: 65 },
    { name: "Hao-Tong Li",         ranking: 37, rating: 64 },
    { name: "Michael Brennan",     ranking: 38, rating: 62 },
    { name: "Brian Campbell",      ranking: 39, rating: 61 },
    { name: "Jake Knapp",          ranking: 40, rating: 60 },
  ],

  pga_2026: [
    // Populate before the PGA Championship — use world rankings at that time
  ],
};

// Default rating for golfers not explicitly listed (middle of field)
const DEFAULT_RATING = 65;

export function getFieldRatings(majorId: string): GolferRating[] {
  return FIELD_RATINGS[majorId] ?? [];
}

export function getRating(name: string, majorId: string): GolferRating {
  const field = getFieldRatings(majorId);
  // Exact match first
  const exact = field.find((g) => g.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  // Last-name match
  const lastName = name.split(" ").pop()?.toLowerCase() ?? "";
  const byLast = field.find((g) => {
    const gLast = g.name.split(" ").pop()?.toLowerCase() ?? "";
    return gLast === lastName;
  });
  if (byLast) return byLast;
  // Not found — assign default
  return { name, ranking: 999, rating: DEFAULT_RATING };
}
