-- 004 — Complete per-language product listings and media.
-- Run after 003. Safe to re-run.

alter table public.products add column if not exists title_mr text;
alter table public.products add column if not exists title_hi text;
alter table public.products add column if not exists title_en text;
alter table public.products add column if not exists short_description_mr text;
alter table public.products add column if not exists short_description_hi text;
alter table public.products add column if not exists short_description_en text;
alter table public.products add column if not exists description_mr text;
alter table public.products add column if not exists description_hi text;
alter table public.products add column if not exists description_en text;
alter table public.products add column if not exists pages_mr integer;
alter table public.products add column if not exists pages_hi integer;
alter table public.products add column if not exists pages_en integer;
alter table public.products add column if not exists cover_image_mr text;
alter table public.products add column if not exists cover_image_hi text;
alter table public.products add column if not exists cover_image_en text;
alter table public.products add column if not exists gallery_images_mr text[] not null default '{}';
alter table public.products add column if not exists gallery_images_hi text[] not null default '{}';
alter table public.products add column if not exists gallery_images_en text[] not null default '{}';

-- Existing rows were authored in Marathi. Preserve them as the Marathi
-- edition while leaving Hindi and English ready for independent content.
update public.products
   set title_mr = coalesce(title_mr, title),
       short_description_mr = coalesce(short_description_mr, short_description),
       description_mr = coalesce(description_mr, description),
       pages_mr = coalesce(pages_mr, pages),
       cover_image_mr = coalesce(cover_image_mr, cover_image),
       gallery_images_mr = case
         when cardinality(gallery_images_mr) = 0 then coalesce(gallery_images, '{}')
         else gallery_images_mr
       end;

-- Do not advertise a translated edition until its listing, cover, page count
-- and PDF are all ready. Marathi keeps the legacy-column fallback.
update public.products
   set available_locales = array_remove(array[
     case when coalesce(title_mr, title) is not null
                 and coalesce(short_description_mr, short_description) is not null
                 and coalesce(description_mr, description) is not null
                 and coalesce(pages_mr, pages) is not null
                 and coalesce(cover_image_mr, cover_image) is not null
                 and coalesce(pdf_path_mr, pdf_path) is not null then 'mr' end,
     case when title_hi is not null and short_description_hi is not null
                 and description_hi is not null and pages_hi is not null
                 and cover_image_hi is not null and pdf_path_hi is not null then 'hi' end,
     case when title_en is not null and short_description_en is not null
                 and description_en is not null and pages_en is not null
                 and cover_image_en is not null and pdf_path_en is not null then 'en' end
   ], null)
 where not is_combo;

update public.products
   set available_locales = array_remove(array[
     case when 'mr' = any(available_locales)
                 and coalesce(title_mr, title) is not null
                 and coalesce(short_description_mr, short_description) is not null
                 and coalesce(description_mr, description) is not null
                 and coalesce(cover_image_mr, cover_image) is not null then 'mr' end,
     case when 'hi' = any(available_locales)
                 and title_hi is not null and short_description_hi is not null
                 and description_hi is not null and cover_image_hi is not null then 'hi' end,
     case when 'en' = any(available_locales)
                 and title_en is not null and short_description_en is not null
                 and description_en is not null and cover_image_en is not null then 'en' end
   ], null)
 where is_combo;
