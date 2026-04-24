-- Run this in your Supabase project's SQL editor.

create table watchlist (
  id                            uuid default gen_random_uuid() primary key,
  card_name                     text not null,
  set_code                      text not null,
  target_price                  numeric(10,2) not null check (target_price > 0),
  card_id                       text not null,
  last_known_price              numeric(10,2),
  last_checked_at               timestamptz,
  last_alerted_at               timestamptz,
  last_price_above_threshold_at timestamptz,
  created_at                    timestamptz default now()
);

-- No auth in Phase 1 — service role key used server-side only.
-- Disable RLS so the service role key can read/write freely.
alter table watchlist disable row level security;
