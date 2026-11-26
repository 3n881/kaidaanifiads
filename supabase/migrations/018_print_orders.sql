-- 018: printed-book orders (client, 26 Nov 2026).
-- Every book can be ordered as a printed copy for home delivery: online
-- payment ₹399 (free delivery) or Cash on Delivery ₹399 + ₹50. Printed copy
-- only (no PDF). Kept apart from `orders` (e-books) so e-book delivery,
-- reminders, the 10-min sweep and analytics are untouched.
--
-- Status:
--   online: pending_payment → paid → shipped → delivered   (failed = Razorpay said no)
--   COD:    cod_pending → confirmed (admin called / messaged) → shipped → delivered
--   any:    cancelled, returned
-- Server-only (RLS on, no policies). Safe to run twice.

create table if not exists public.print_orders (
  id                  uuid primary key default gen_random_uuid(),
  order_no            text not null unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  product_id          bigint references public.products (id) on delete set null,
  product_title       text not null,
  locale              text not null default 'mr',
  payment_mode        text not null check (payment_mode in ('online', 'cod')),
  amount              integer not null check (amount > 0),
  status              text not null check (status in ('pending_payment', 'paid', 'failed', 'cod_pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned')),
  -- delivery address
  name                text not null,
  phone               text not null,
  house               text not null,
  area                text not null,
  landmark            text,
  pincode             text not null,
  city                text not null,
  district            text not null,
  state               text not null,
  -- online payment
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  paid_at             timestamptz,
  -- fulfilment
  confirmed_at        timestamptz,
  shipped_at          timestamptz,
  delivered_at        timestamptz,
  cancelled_at        timestamptz,
  courier             text,
  tracking_no         text,
  admin_note          text,
  -- which visit / campaign (same as orders, migration 016)
  visit_id            text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  utm_content         text,
  from_ad             boolean not null default false,
  referrer_host       text
);
-- (added the same day, for tables created by the first version of this file)
alter table public.print_orders add column if not exists referrer_host text;

create index if not exists print_orders_created_idx on public.print_orders (created_at desc);
create index if not exists print_orders_status_idx on public.print_orders (status, created_at desc);
create index if not exists print_orders_phone_idx on public.print_orders (phone);

alter table public.print_orders enable row level security;
