-- Major archives — one row per completed major
-- Stores the final enriched pool_players snapshot for the picks view.
-- Automatically written by the backend when phase === "complete".

create table if not exists major_archives (
  major_id      text primary key,   -- e.g. "masters_2026"
  major_name    text not null,       -- e.g. "2026 Masters Tournament"
  short_name    text not null,       -- e.g. "2026 Masters"
  source        text not null,       -- "masters" | "espn"
  pool_players  jsonb not null,      -- EnrichedPoolPlayer[]
  snapshot      jsonb not null,      -- LeaderboardSnapshot (final state)
  pot_total     integer not null default 0,
  winner_id     text,                -- pool player id who won, null if rollover
  archived_at   timestamptz not null default now()
);

-- Enable RLS
alter table major_archives enable row level security;

-- Public read
create policy "Public read major_archives"
  on major_archives for select using (true);
