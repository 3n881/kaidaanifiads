-- ===========================================================================
-- 001 — Viral readiness: idempotent payments, short-lived downloads, recovery.
-- Run once in Supabase SQL Editor BEFORE deploying the Phase 1 code.
-- Safe to re-run.
-- ===========================================================================

-- ------------------------------------------------------------ order columns
alter table public.orders add column if not exists paid_at            timestamptz;
alter table public.orders add column if not exists buyer_contact      text;  -- from Razorpay payment (last 10 digits)
alter table public.orders add column if not exists buyer_email        text;  -- from Razorpay payment
alter table public.orders add column if not exists download_count     integer not null default 0;
alter table public.orders add column if not exists last_downloaded_at timestamptz;
alter table public.orders add column if not exists whatsapp_sends     integer not null default 0;

-- Long-lived signed URLs are no longer stored (downloads go through
-- /api/download with 5-minute URLs). Clear the old 30-day links.
update public.orders set download_url = null where download_url is not null;

-- ------------------------------------------------------------ uniqueness
-- If these fail, there are duplicate Razorpay ids — inspect with:
--   select razorpay_order_id, count(*) from orders group by 1 having count(*) > 1;
create unique index if not exists orders_rzp_order_uidx
  on public.orders (razorpay_order_id) where razorpay_order_id is not null;
create unique index if not exists orders_rzp_payment_uidx
  on public.orders (razorpay_payment_id) where razorpay_payment_id is not null;
drop index if exists public.orders_rzp_order_idx;

-- ------------------------------------------------------------ lookups
create index if not exists orders_paid_whatsapp_idx
  on public.orders (whatsapp_number) where status = 'paid';
create index if not exists orders_paid_contact_idx
  on public.orders (buyer_contact) where status = 'paid';
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

-- ------------------------------------------------------------ atomic helpers
-- Counts a download and enforces a per-order cap. Returns false when capped
-- or when the order is not paid.
create or replace function public.record_order_download(p_order uuid, p_limit integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.orders
       set download_count = download_count + 1,
           last_downloaded_at = now()
     where id = p_order
       and status = 'paid'
       and download_count < p_limit
    returning 1
  )
  select exists (select 1 from updated);
$$;

-- Reserves one WhatsApp send for an order. Returns false once the cap is hit.
create or replace function public.claim_whatsapp_send(p_order uuid, p_limit integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.orders
       set whatsapp_sends = whatsapp_sends + 1
     where id = p_order
       and status = 'paid'
       and whatsapp_sends < p_limit
    returning 1
  )
  select exists (select 1 from updated);
$$;

revoke all on function public.record_order_download(uuid, integer) from public, anon, authenticated;
revoke all on function public.claim_whatsapp_send(uuid, integer) from public, anon, authenticated;
grant execute on function public.record_order_download(uuid, integer) to service_role;
grant execute on function public.claim_whatsapp_send(uuid, integer) to service_role;
