-- ===========================================================================
-- 002 — Purchase funnel view (no analytics scripts needed).
-- VISITORS come from Cloudflare Analytics; everything after "Buy" is here.
-- Run after 001. Safe to re-run.
-- ===========================================================================

create or replace view public.funnel_daily
with (security_invoker = true) as
select
  date_trunc('day', o.created_at at time zone 'Asia/Kolkata')::date as day,
  p.slug,
  count(*)                                              as checkouts_started,  -- Buy → Razorpay order
  count(*) filter (where o.status = 'paid')             as payments_succeeded,
  count(*) filter (where o.status = 'failed')           as payments_failed,
  count(*) filter (where o.status = 'created')          as abandoned_or_pending,
  count(*) filter (where o.download_count > 0)          as downloaded,
  count(*) filter (where o.status = 'paid' and o.download_count = 0) as paid_not_downloaded,
  coalesce(sum(o.amount) filter (where o.status = 'paid'), 0) as revenue_inr
from public.orders o
left join public.products p on p.id = o.product_id
group by 1, 2
order by 1 desc, 2;

-- Service role / dashboard SQL editor only (orders are private).
revoke all on public.funnel_daily from anon, authenticated;

-- Alert query: paid more than 15 minutes ago but never downloaded.
-- select id, created_at, paid_at, buyer_contact, whatsapp_number
--   from public.orders
--  where status = 'paid' and download_count = 0
--    and paid_at < now() - interval '15 minutes'
--  order by paid_at desc;
