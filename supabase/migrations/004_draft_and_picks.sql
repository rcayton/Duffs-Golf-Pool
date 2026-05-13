-- Draft state — one row per major.
-- Holds lottery order and per-pick selections.
-- Reset by calling DELETE + re-insert, or via POST /api/draft/reset.

create table if not exists draft_state (
  major_id       text primary key,
  status         text not null default 'idle',
  -- status values: 'idle' | 'in_progress' | 'complete'
  draft_order    jsonb not null default '[]',
  -- Array of pool player ids in lottery order: ["robbie","mike","sullivan",...]
  picks          jsonb not null default '[]',
  -- Array of DraftPickRecord objects (see types)
  completed_at   timestamptz,
  updated_at     timestamptz not null default now()
);

-- Pool picks — authoritative source for each player's golfer selections.
-- Written by POST /api/draft/complete; read by pool-engine via loadPoolPlayers().
-- One row per (major, pool player, round slot).

create table if not exists pool_picks (
  id           bigserial primary key,
  major_id     text not null,
  player_id    text not null,          -- matches PoolPlayer.id
  round_slot   int  not null check (round_slot between 1 and 4),
  golfer_name  text not null default 'TBD',
  espn_id      text,                   -- null until matched by pool-engine
  updated_at   timestamptz not null default now(),
  unique (major_id, player_id, round_slot)
);

create index if not exists pool_picks_major_player
  on pool_picks (major_id, player_id);

-- Enable RLS
alter table draft_state enable row level security;
alter table pool_picks   enable row level security;

-- Public read (frontend anon key)
create policy "Public read draft_state"
  on draft_state for select using (true);

create policy "Public read pool_picks"
  on pool_picks for select using (true);

-- Service role (backend) writes — no anon insert/update policies needed
-- because the backend uses the service key which bypasses RLS.
