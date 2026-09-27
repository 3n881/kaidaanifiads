-- 003 — Per-language PDFs, localized WhatsApp delivery and product previews.
-- Run once in Supabase SQL Editor before deploying this code. Safe to re-run.

alter table public.products add column if not exists pdf_path_mr text;
alter table public.products add column if not exists pdf_path_hi text;
alter table public.products add column if not exists pdf_path_en text;
alter table public.products add column if not exists gallery_images text[] not null default '{}';
alter table public.products add column if not exists available_locales text[] not null default '{}';

-- Preserve every existing book: the old single PDF was the Marathi edition.
update public.products
   set pdf_path_mr = pdf_path
 where pdf_path_mr is null and pdf_path is not null;

update public.products
   set available_locales = array_remove(array[
     case when coalesce(pdf_path_mr, pdf_path) is not null then 'mr' end,
     case when pdf_path_hi is not null then 'hi' end,
     case when pdf_path_en is not null then 'en' end
   ], null);

alter table public.orders add column if not exists locale text not null default 'mr';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_locale_check'
  ) then
    alter table public.orders add constraint orders_locale_check
      check (locale in ('mr','hi','en'));
  end if;
end $$;
