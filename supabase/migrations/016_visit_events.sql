-- 016 — First-party visit funnel + campaign tracking (Dashboard → Analytics).
-- 1. events: one row per step a visit reaches on the public site
--      visit → book_view → buy_tap → details → razorpay_open
--    ("paid" comes from orders, linked by visit_id). No personal data: no name,
--    phone, IP or user agent — only random ids made in the visitor's browser
--    (localStorage), the page path, the product id and how the visit arrived
--    (utm_* tags, whether an ad-click id was present, the referring site).
--    Written only by the server (/api/events, service role).
-- 2. orders: the same visit id + campaign tags, saved at checkout, so every
--    sale can be credited to the campaign / ad that brought the buyer.
-- 3. campaign_spend: ad spend per campaign typed in by an admin → return on ad spend.
-- 4. analytics_funnel(): counts per step, grouped in the database so the admin
--    page never downloads raw events.
-- Safe to re-run.

create table if not exists public.events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  visitor_id    text not null,
  visit_id      text not null,
  name          text not null check (name in ('visit', 'book_view', 'buy_tap', 'details', 'razorpay_open')),
  product_id    bigint,
  path          text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  from_ad       boolean not null default false,  -- landed with Meta's fbclid
  referrer_host text
);

create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_visit_idx on public.events (visit_id);

alter table public.events enable row level security;

alter table public.orders add column if not exists visit_id text;
alter table public.orders add column if not exists utm_source text;
alter table public.orders add column if not exists utm_medium text;
alter table public.orders add column if not exists utm_campaign text;
alter table public.orders add column if not exists utm_content text;
alter table public.orders add column if not exists from_ad boolean;
alter table public.orders add column if not exists referrer_host text;

create index if not exists orders_visit_idx on public.orders (visit_id) where visit_id is not null;

create table if not exists public.campaign_spend (
  campaign    text primary key,
  spend       numeric(12, 2) not null check (spend >= 0),
  updated_at  timestamptz not null default now()
);

alter table public.campaign_spend enable row level security;

-- One row per (kind, group, furthest step reached) with the number of visits.
--   kind 'visit': grouped by how the visit arrived; step = furthest step of the visit
--   kind 'book':  grouped by book;                  step = furthest step for that book
-- Steps: 1 visit · 2 book_view · 3 buy_tap · 4 details · 5 razorpay_open · 6 paid.
-- A visit is counted when it has an event in [p_start, p_end).
create or replace function public.analytics_funnel(p_start timestamptz, p_end timestamptz)
returns table (
  kind          text,
  product_id    bigint,
  source        text,
  utm_campaign  text,
  utm_content   text,
  from_ad       boolean,
  step          int,
  visits        bigint
)
language sql
stable
set search_path = public
as $$
  with ev as (
    select e.visit_id, e.product_id, e.created_at,
           case e.name when 'visit' then 1 when 'book_view' then 2 when 'buy_tap' then 3
                       when 'details' then 4 when 'razorpay_open' then 5 end as step,
           e.utm_source, e.utm_campaign, e.utm_content, e.from_ad, e.referrer_host
    from public.events e
    where e.created_at >= p_start and e.created_at < p_end
  ),
  paid as (
    select o.visit_id, o.product_id, 6 as step
    from public.orders o
    where o.status = 'paid' and o.visit_id in (select visit_id from ev)
  ),
  visit_attr as (
    -- How the visit arrived: taken from its first event in the period.
    select distinct on (visit_id) visit_id,
           coalesce(nullif(utm_source, ''), case when from_ad then 'facebook' end, referrer_host, 'direct') as source,
           utm_campaign, utm_content, from_ad
    from ev
    order by visit_id, created_at
  ),
  visit_step as (
    select visit_id, max(step) as step
    from (select visit_id, step from ev union all select visit_id, step from paid) s
    group by visit_id
  ),
  book_step as (
    select visit_id, product_id, max(step) as step
    from (select visit_id, product_id, step from ev where product_id is not null
          union all select visit_id, product_id, step from paid where product_id is not null) s
    group by visit_id, product_id
  )
  select 'visit', null::bigint, a.source, a.utm_campaign, a.utm_content, a.from_ad, s.step, count(*)
  from visit_step s join visit_attr a using (visit_id)
  group by a.source, a.utm_campaign, a.utm_content, a.from_ad, s.step
  union all
  select 'book', b.product_id, null, null, null, null, b.step, count(*)
  from book_step b
  group by b.product_id, b.step
$$;

revoke all on function public.analytics_funnel(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.analytics_funnel(timestamptz, timestamptz) to service_role;
