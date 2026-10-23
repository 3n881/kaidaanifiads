-- 015 — Why a payment failed, for the admin Orders page.
-- Copied from Razorpay's failed payment (webhook payment.failed, or fetched
-- later for older orders by the 10-minute cron):
--   failure_reason      = Razorpay's error_reason code, e.g. payment_timeout
--   failure_description = Razorpay's error_description (shown to the customer)
--   failure_method      = how they tried to pay, e.g. "UPI · PhonePe" (no UPI id stored)
--   failure_checked_at  = when we last asked Razorpay (so older orders are fetched once)
-- Nullable; safe to re-run.

alter table public.orders add column if not exists failure_reason text;
alter table public.orders add column if not exists failure_description text;
alter table public.orders add column if not exists failure_method text;
alter table public.orders add column if not exists failure_checked_at timestamptz;
