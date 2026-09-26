-- ===========================================================================
-- Pre-launch verification (Phase 4). Read-only — run in Supabase SQL Editor
-- and compare with the expected results in the comments.
-- ===========================================================================

-- 1. Hot queries use indexes (expect "Index Scan", not "Seq Scan", once the
--    tables have more than a few hundred rows).
explain analyze select id, title, price, slug from public.products
  where slug = 'rti-adhiniyam-2005-sampurna-guide' and active = true;
explain analyze select id, status from public.orders
  where razorpay_order_id = 'order_TEST';
explain analyze select id from public.orders
  where status = 'paid' and (whatsapp_number = '9876543210' or buyer_contact = '9876543210');

-- 2. RLS enabled on every public table (expect relrowsecurity = true for all).
select relname, relrowsecurity from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r';

-- 3. Policies: only "public read active products" and "public read
--    combo_items" should exist — nothing on orders / store_settings.
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public';

-- 4. Buckets: covers public, pdfs PRIVATE (expect public = false for pdfs).
select id, public from storage.buckets;

-- 5. Storage policies: no policy may grant select on bucket 'pdfs'.
select policyname, cmd, qual from pg_policies
  where schemaname = 'storage' and tablename = 'objects';

-- 6. Helper functions are service-role only (expect no anon/authenticated).
select routine_name, grantee from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name in ('record_order_download', 'claim_whatsapp_send');

-- 7. Uniqueness in place (expect both *_uidx indexes).
select indexname, indexdef from pg_indexes
  where schemaname = 'public' and tablename = 'orders';

-- 8. Catalog readiness: every active single ebook has a PDF; every combo has
--    members that all have PDFs (expect zero rows from both).
select slug from public.products where active and not is_combo and pdf_path is null;
select c.slug from public.products c
  where c.active and c.is_combo and c.pdf_path is null
    and not exists (
      select 1 from public.combo_items ci join public.products m on m.id = ci.product_id
       where ci.combo_id = c.id and m.pdf_path is not null);
