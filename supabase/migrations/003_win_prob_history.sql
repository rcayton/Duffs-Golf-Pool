-- Win probability history — one row per poll during active play.
-- Resets each major (rows are keyed by major_id).
-- Each row stores a snapshot of every participant's combined_win_odds at that moment.

create table if not exists win_prob_history (
  id          bigserial primary key,
  major_id    text not null,
  phase       text not null,
  captured_at timestamptz not null default now(),
  probs       jsonb not null  -- { player_id: combined_win_odds, ... }
);

create index if not exists win_prob_history_major_time
  on win_prob_history (major_id, captured_at asc);

alter table win_prob_history enable row level security;

create policy "Public read win_prob_history"
  on win_prob_history for select using (true);
