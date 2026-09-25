-- Guided client onboarding settings
-- Run once in Supabase SQL Editor. Safe to run again.

create table if not exists public.store_settings (
  id            text primary key default 'main',
  business      jsonb not null default '{}'::jsonb,
  content       jsonb not null default '{}'::jsonb,
  integrations  jsonb not null default '{}'::jsonb,
  launch        jsonb not null default '{}'::jsonb,
  updated_at    timestamptz default now()
);

insert into public.store_settings (id)
values ('main')
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

-- No public policies are created. The protected dashboard accesses this table
-- server-side with the service-role client after checking the admin allowlist.
