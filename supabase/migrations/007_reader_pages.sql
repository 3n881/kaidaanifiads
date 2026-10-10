-- 007 — Sample-reader page images.
-- The first pages of each edition's PDF, rendered to WebP (200/400/800/1600 px)
-- when the PDF is uploaded, so the in-page reader shows them instantly instead
-- of downloading a multi-MB preview PDF. Stores the 800 px URLs (like covers).
-- Safe to re-run.

alter table public.products add column if not exists reader_pages_mr text[];
alter table public.products add column if not exists reader_pages_hi text[];
alter table public.products add column if not exists reader_pages_en text[];
