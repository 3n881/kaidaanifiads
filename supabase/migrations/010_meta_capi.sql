-- 010 — Meta Conversions API (server-side Purchase, src/lib/meta-capi.ts).
-- At checkout we keep what Meta needs to match a sale to the ad that brought
-- the buyer: Meta's own browser cookies (_fbp, _fbc), the browser (user agent)
-- and IP. They are cleared again right after the Purchase is sent to Meta.
-- meta_capi_sent_at = the Purchase went to Meta once (never sent twice).
-- All nullable; the app works with or without this migration. Safe to re-run.

alter table public.orders add column if not exists meta_fbp          text;
alter table public.orders add column if not exists meta_fbc          text;
alter table public.orders add column if not exists client_ip         text;
alter table public.orders add column if not exists client_user_agent text;
alter table public.orders add column if not exists meta_capi_sent_at timestamptz;
