-- ===========================================================================
-- Kaydyacha Ani Faydyach — database schema (run once in Supabase SQL Editor)
-- Dashboard → SQL Editor → New query → paste this → Run.
-- Safe to re-run (idempotent).
-- ===========================================================================

-- ---------------------------------------------------------------- products
create table if not exists public.products (
  id            bigint primary key,
  slug          text unique not null,
  title         text not null,
  short_description text,
  description   text,
  mrp           integer not null,
  price         integer not null,
  pages         integer,
  language      text not null default 'Marathi'
                check (language in ('Marathi','Hindi','English')),
  is_combo      boolean not null default false,
  set_size      integer,
  rating        numeric(2,1) default 4.8,
  category      text default 'Other'
                check (category in ('Property Law','Civil Law','Other')),
  cover_image   text,          -- public URL in the `covers` bucket (null → gradient placeholder)
  pdf_path      text,          -- object path in the private `pdfs` bucket
  featured      boolean default false,
  active        boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

-- Which books belong to a combo (many-to-many)
create table if not exists public.combo_items (
  combo_id   bigint references public.products(id) on delete cascade,
  product_id bigint references public.products(id) on delete cascade,
  primary key (combo_id, product_id)
);

-- ------------------------------------------------------------------ orders
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  whatsapp_number    text not null,
  product_id         bigint references public.products(id),
  amount             integer not null,
  razorpay_order_id  text,
  razorpay_payment_id text,
  status             text not null default 'created'
                     check (status in ('created','paid','failed')),
  delivered          boolean default false,
  download_url       text,
  created_at         timestamptz default now()
);
create index if not exists orders_whatsapp_idx on public.orders (whatsapp_number);
create index if not exists orders_rzp_order_idx on public.orders (razorpay_order_id);

-- ---------------------------------------------- guided client onboarding
-- One company-owned settings record. It stores approved public content and
-- checklist statuses only. Never store passwords, OTPs, API keys or KYC files.
create table if not exists public.store_settings (
  id            text primary key default 'main',
  business      jsonb not null default '{}'::jsonb,
  content       jsonb not null default '{}'::jsonb,
  integrations  jsonb not null default '{}'::jsonb,
  launch        jsonb not null default '{}'::jsonb,
  updated_at    timestamptz default now()
);
insert into public.store_settings (id) values ('main') on conflict (id) do nothing;

-- --------------------------------------------------------- Row Level Security
alter table public.products    enable row level security;
alter table public.combo_items enable row level security;
alter table public.orders      enable row level security;
alter table public.store_settings enable row level security;

-- Public (anon) may read only ACTIVE products + combo mappings.
drop policy if exists "public read active products" on public.products;
create policy "public read active products"
  on public.products for select using (active = true);

drop policy if exists "public read combo_items" on public.combo_items;
create policy "public read combo_items"
  on public.combo_items for select using (true);

-- Orders: NO anon access. Writes/reads happen server-side with the
-- service-role key (webhook, admin, /my-books lookup), which bypasses RLS.

-- ------------------------------------------------------------ Storage buckets
insert into storage.buckets (id, name, public)
  values ('covers','covers', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('pdfs','pdfs', false)
  on conflict (id) do nothing;

-- Anyone can read cover images; PDFs stay private (served via signed URLs).
drop policy if exists "public read covers" on storage.objects;
create policy "public read covers"
  on storage.objects for select using (bucket_id = 'covers');

-- Done. Next: run the seed (npm run db:seed) to load the catalog.
