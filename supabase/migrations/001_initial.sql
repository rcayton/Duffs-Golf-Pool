-- Masters Pool 2026 · Supabase schema
-- Run this in your Supabase SQL editor or via supabase db push

-- Leaderboard snapshot cache (keyed by tournament)
create table if not exists leaderboard_cache (
  key         text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Odds cache (keyed by tournament)
create table if not exists odds_cache (
  key         text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Optional: audit log of every snapshot (useful for post-tournament analysis)
create table if not exists leaderboard_history (
  id          bigserial primary key,
  tournament  text not null default 'masters_2026',
  phase       text,
  round       int,
  data        jsonb not null,
  captured_at timestamptz not null default now()
);

-- Index for querying history by tournament + time
create index if not exists leaderboard_history_tournament_time
  on leaderboard_history (tournament, captured_at desc);

-- Enable Row Level Security (read-only from the frontend anon key)
alter table leaderboard_cache  enable row level security;
alter table odds_cache          enable row level security;
alter table leaderboard_history enable row level security;

-- Allow public read (the frontend uses the anon key)
create policy "Public read leaderboard_cache"
  on leaderboard_cache for select using (true);

create policy "Public read odds_cache"
  on odds_cache for select using (true);

create policy "Public read leaderboard_history"
  on leaderboard_history for select using (true);

-- Only the service role (backend) can write
-- (No insert/update policies needed for anon — service key bypasses RLS)
