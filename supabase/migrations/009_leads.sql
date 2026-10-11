-- 009 — Interested buyers ("leads"): visitors who closed Razorpay without
-- paying and chose to get offers / new books on WhatsApp (explicit consent).
-- Written only by the server (service role); read in /dashboard/leads.
-- One row per phone: a later sign-up updates the book and re-confirms consent.
-- Safe to re-run.

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  phone            text not null unique check (phone ~ '^[6-9][0-9]{9}$'),
  product_id       bigint,                               -- the book they were buying
  locale           text not null default 'mr' check (locale in ('mr', 'hi', 'en')),
  source           text not null default 'cancelled' check (source in ('cancelled', 'failed')),
  consent_at       timestamptz not null,                 -- when they ticked the consent box
  consent_text     text not null,                        -- the exact sentence they agreed to
  ip_hash          text,                                 -- SHA-256 of the IP, for rate limiting only
  followup_sent_at timestamptz,                          -- next-day WhatsApp follow-up handled
  opted_out_at     timestamptz                           -- STOP / removed by the admin
);

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_ip_idx on public.leads (ip_hash, updated_at desc);

-- Row Level Security on, no policies: only the service role (server) can read/write.
alter table public.leads enable row level security;
