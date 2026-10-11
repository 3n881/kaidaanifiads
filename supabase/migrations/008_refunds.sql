-- 008 — Refund tracking (Razorpay refund webhooks + admin "Check with Razorpay").
-- The order keeps status 'paid'; these columns say how much of it was given
-- back. Revenue in the dashboard = amount − refunded_amount. Safe to re-run.

alter table public.orders add column if not exists refunded_amount integer not null default 0; -- ₹, cumulative
alter table public.orders add column if not exists refund_status text;                       -- null | partial | full
alter table public.orders add column if not exists refunded_at timestamptz;                   -- latest refund
alter table public.orders add column if not exists razorpay_refund_id text;                   -- latest refund id

do $$ begin
  alter table public.orders add constraint orders_refund_status_check
    check (refund_status is null or refund_status in ('partial', 'full'));
exception when duplicate_object then null;
end $$;

create index if not exists orders_refunded_idx on public.orders (refunded_at) where refund_status is not null;
