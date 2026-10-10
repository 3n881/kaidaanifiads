-- 006 — Contact page "Send us a message" form.
-- Messages are written by the server (service role) and read in the admin
-- dashboard (/dashboard/messages). No public access. Safe to re-run.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 80),
  email text check (email is null or char_length(email) <= 120),
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  subject text check (subject is null or char_length(subject) <= 120),
  message text not null check (char_length(message) between 5 and 2000),
  locale text not null default 'mr',
  -- SHA-256 of the sender's IP: lets the server rate-limit without storing the IP.
  ip_hash text,
  handled boolean not null default false
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_ip_idx on public.contact_messages (ip_hash, created_at desc);

-- Row Level Security on, no policies: only the service role (server) can read/write.
alter table public.contact_messages enable row level security;
