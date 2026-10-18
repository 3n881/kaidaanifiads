-- 012 — Offers consent given in the Buy popup (2026-10-18).
-- The Buy popup now asks name + WhatsApp number before Razorpay, with an
-- UNTICKED "send me offers / new books on WhatsApp" box. A ticked box is saved
-- as a lead with source 'checkout' (before: only 'cancelled' / 'failed' from
-- the box shown after closing Razorpay). Safe to re-run.

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads
  add constraint leads_source_check check (source in ('cancelled', 'failed', 'checkout'));
