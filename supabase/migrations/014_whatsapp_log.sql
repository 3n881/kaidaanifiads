-- 014 — Record of every WhatsApp message the store sends (2026-10-18).
-- One row per send attempt through Interakt: PDF delivery, automatic payment
-- reminders, reminders sent by an admin from the dashboard, offer follow-ups.
-- Written only by the server (service role); read in /dashboard/whatsapp and on
-- each order's page. Safe to re-run.

create table if not exists public.whatsapp_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  order_id    uuid references public.orders(id) on delete set null,
  lead_id     uuid,
  phone       text not null,
  name        text,
  product_id  bigint,
  -- pdf = the book after payment · reminder = automatic "payment not completed"
  -- · reminder_admin = sent by an admin · offer = follow-up to an interested buyer
  kind        text not null check (kind in ('pdf', 'reminder', 'reminder_admin', 'offer')),
  template    text,
  step        integer,                    -- automatic reminder number (1, 2, …)
  ok          boolean not null,           -- Interakt accepted the message
  sent_by     text not null default 'auto' -- 'auto' or the admin's e-mail
);

create index if not exists whatsapp_log_created_idx on public.whatsapp_log (created_at desc);
create index if not exists whatsapp_log_order_idx on public.whatsapp_log (order_id, created_at desc);
create index if not exists whatsapp_log_phone_idx on public.whatsapp_log (phone, product_id, created_at desc);

-- Row Level Security on, no policies: only the server can read/write.
alter table public.whatsapp_log enable row level security;
