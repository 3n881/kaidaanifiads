-- 011 — Drop-off tracking for the admin Orders page.
-- checkout_closed_at = the buyer closed the Razorpay window without paying
-- (BuyButton's ondismiss → POST /api/orders/closed, needs the order's signed
-- access token). Set once, only on unpaid orders. Unpaid orders without it =
-- left without closing (browser/app closed, or before this migration).
-- Nullable; safe to re-run.

alter table public.orders add column if not exists checkout_closed_at timestamptz;
