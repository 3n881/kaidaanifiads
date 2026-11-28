-- 020: paid consultation bookings (client, 28 Nov 2026).
-- A buyer (usually after buying a book on that topic) books a ₹999
-- consultation at /consultation: topic, problem description, preferred day /
-- time window / call type / language, paid online via Razorpay. The team then
-- calls / WhatsApps to fix the exact time. Separate from e-book `orders` and
-- `print_orders`. Server-only (RLS on, no policies). Safe to run twice.
--
-- Status: pending_payment → paid → scheduled → done   (failed = Razorpay said no;
--         cancelled / refunded by the admin)

create table if not exists public.consultation_bookings (
  id                  uuid primary key default gen_random_uuid(),
  booking_no          text not null unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  topic               text not null,
  product_id          bigint references public.products (id) on delete set null,
  locale              text not null default 'mr',
  name                text not null,
  phone               text not null,
  district            text not null,
  description         text not null,
  preferred_date      date not null,
  preferred_slot      text not null check (preferred_slot in ('morning', 'afternoon', 'evening')),
  mode                text not null check (mode in ('phone', 'whatsapp', 'video')),
  language            text not null check (language in ('mr', 'hi', 'en')),
  amount              integer not null check (amount > 0),
  status              text not null check (status in ('pending_payment', 'paid', 'failed', 'scheduled', 'done', 'cancelled', 'refunded')),
  consent_at          timestamptz not null default now(),
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  paid_at             timestamptz,
  scheduled_for       timestamptz,
  done_at             timestamptz,
  cancelled_at        timestamptz,
  admin_note          text,
  visit_id            text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  utm_content         text,
  from_ad             boolean not null default false,
  referrer_host       text
);

create index if not exists consultation_bookings_created_idx on public.consultation_bookings (created_at desc);
create index if not exists consultation_bookings_status_idx on public.consultation_bookings (status, created_at desc);
create index if not exists consultation_bookings_phone_idx on public.consultation_bookings (phone);

alter table public.consultation_bookings enable row level security;
