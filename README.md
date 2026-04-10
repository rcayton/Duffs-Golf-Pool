# Masters Pool 2026

A live golf pool dashboard for tracking the 2026 Masters Tournament. Pulls real-time scores from ESPN's undocumented JSON API and win probabilities from The Odds API, then maps them to your group's picks.

## Features

- Live leaderboard with score, position, and holes completed
- Cut probability bars during Rounds 1–2 (logistic model based on strokes-to-cut)
- Win probability bars during Rounds 3–4 (from sportsbook consensus via The Odds API)
- Per-player pick cards with color-coded owners
- Automatic cut penalty tracking (+$5 per missed cut)
- Pot total with rollover history
- Auto-refreshes every 60 seconds during rounds
- Deploys as a single Vercel project (backend + frontend)

## Project structure

```
masters-pool/
├── backend/
│   └── src/
│       ├── index.ts              # Express server + cron poller
│       ├── types.ts              # Shared domain types
│       ├── api/routes.ts         # REST endpoints
│       ├── services/
│       │   ├── espn.ts           # ESPN leaderboard fetcher
│       │   └── odds.ts           # The Odds API win probabilities
│       └── lib/
│           ├── pool-config.ts    # Your picks — edit this each major
│           ├── pool-engine.ts    # Enrichment, cut prob model, pot calc
│           ├── cache.ts          # Supabase read/write
│           └── supabase.ts       # Supabase client
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── hooks/useDashboard.ts
│       ├── lib/
│       │   ├── types.ts
│       │   ├── api.ts
│       │   └── utils.ts
│       └── components/
│           ├── Header.tsx
│           ├── Tabs.tsx
│           ├── PotSummary.tsx
│           ├── PlayerCard.tsx
│           ├── Leaderboard.tsx
│           ├── PotBreakdown.tsx
│           └── ProbBar.tsx
├── supabase/migrations/
│   └── 001_initial.sql
├── vercel.json
└── package.json
```

---

## Setup

### 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account
- A [The Odds API](https://the-odds-api.com) key (~$10/month for hobby tier, or free tier for testing)

### 2. Clone and install

```bash
git clone <your-repo>
cd masters-pool
npm install
npm install --workspace=backend
npm install --workspace=frontend
```

### 3. Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run the contents of `supabase/migrations/001_initial.sql`
3. From **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_KEY`

> ⚠️ The `service_role` key bypasses Row Level Security. Never expose it in the frontend. It only lives in the backend `.env`.

### 4. Environment variables

```bash
# Backend
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ODDS_API_KEY=your_odds_api_key_here
PORT=3001
POLL_INTERVAL_MINUTES=5
```

```bash
# Frontend (only needed for production — dev uses Vite proxy)
cp frontend/.env.example frontend/.env.local
```

### 5. Run locally

```bash
# Terminal 1 — backend (starts server + poller)
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001/api

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Full enriched dashboard data |
| `GET` | `/api/leaderboard` | Raw ESPN leaderboard snapshot |
| `GET` | `/api/odds` | Raw odds data |
| `POST` | `/api/refresh` | Manually trigger ESPN + Odds fetch |
| `GET` | `/api/health` | Health check |

### Example: manual refresh

```bash
curl -X POST http://localhost:3001/api/refresh
```

### Example: fetch dashboard

```bash
curl http://localhost:3001/api/dashboard | jq .pot
```

---

## Updating picks for a new major

Open `backend/src/lib/pool-config.ts` and update the `POOL_PLAYERS` array and the `POT_CONFIG.rollovers` object. The structure is self-documenting.

```ts
{
  id: "sullivan",
  name: "Sullivan",
  dues_owed: 45,           // update each major
  picks: [
    { round_slot: 1, golfer_name: "Scottie Scheffler", espn_id: null },
    // ...
  ],
},
```

`espn_id` can stay `null` — the engine resolves it by fuzzy name matching against the ESPN response. If a name isn't matching (check the console logs), override it with the ESPN athlete ID found by inspecting the `/api/leaderboard` response.

---

## Inspecting the ESPN response

The ESPN API field names occasionally shift. If scores aren't parsing correctly, dump the raw response and compare it to the field mapping in `backend/src/services/espn.ts`:

```bash
curl "https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard" | jq .
```

Key fields to verify:
- `events[0].competitions[0].competitors[*].score.displayValue` — score string ("-4", "E", "+3")
- `events[0].competitions[0].competitors[*].status.displayValue` — thru holes ("9", "F")
- `events[0].competitions[0].competitors[*].status.type.name` — status ("STATUS_ACTIVE", "STATUS_CUT")
- `events[0].competitions[0].status.period` — current round number
- `events[0].competitions[0].situation.projectedCut.value` — projected cut score

---

## The Odds API setup

1. Sign up at [the-odds-api.com](https://the-odds-api.com)
2. During the Masters, the relevant market key is `golf_masters_tournament_winner`
3. The service fetches odds every 30 minutes (odds don't change as fast as scores)
4. If no odds are found, win probability bars show 0% — the rest of the app still works

To check your remaining API quota:
```bash
curl "https://api.the-odds-api.com/v4/sports?apiKey=YOUR_KEY" -I
# Look for: x-requests-remaining and x-requests-used headers
```

---

## Deploy to Vercel

### One-time setup

```bash
npm i -g vercel
vercel login
```

### Set secrets

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add ODDS_API_KEY
```

### Deploy

```bash
vercel --prod
```

Vercel will build the frontend statically and deploy the backend as a serverless function. The `vercel.json` at the project root handles routing: `/api/*` goes to the backend, everything else serves the frontend.

> **Note on the cron poller in serverless environments:** Vercel serverless functions don't run continuously, so the `node-cron` scheduler won't fire between requests. For persistent polling in production, either:
> - Use **Vercel Cron Jobs** (add a `crons` block to `vercel.json`) pointing at `/api/refresh`
> - Or run the backend on [Railway](https://railway.app) or [Render](https://render.com) where the Node.js process stays alive

### Vercel Cron (recommended for production)

Add this to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/refresh",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This calls `/api/refresh` every 5 minutes, which triggers the ESPN + Odds fetches and writes results to Supabase.

---

## Cut probability model

During Rounds 1–2, the app estimates each golfer's probability of making the cut using a logistic approximation of the normal distribution:

```
P(make cut) = logistic( -(strokes_above_projected_cut) / sqrt(holes_remaining × 0.0625) )
```

The variance term (`0.0625 per hole`) reflects that scoring at Augusta averages roughly ±0.25 strokes/hole of variance. This is a simplified model — it doesn't account for weather, tee times, or course conditions — but it's accurate enough for a pool dashboard.

After Round 2, once the official cut is applied, `cut_made` flips to `true`/`false` based on the player's `status` field from ESPN.

---

## Troubleshooting

**"Leaderboard data not yet available"**  
The poller hasn't run yet. Hit `POST /api/refresh` or wait for the first cron cycle.

**Golfer name not matching picks**  
Check `backend/src/lib/pool-config.ts` — the name needs to match how ESPN spells it. ESPN's `displayName` is usually "First Last". Special characters (Åberg, Højgaard) are normalized before matching, but unusual spellings may need a manual `espn_id` override.

**Odds showing 0% for everyone**  
Either the ODDS_API_KEY is missing/invalid, or the Masters market isn't live yet (it opens a few days before the tournament). The rest of the app works without odds data.

**TypeScript compilation errors**  
Make sure to fix the typo in `backend/src/lib/pool-engine.ts` line 4: `EnrichedPicke` → `EnrichedPick`.
