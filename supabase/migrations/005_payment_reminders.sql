-- 005 — "Payment not completed" WhatsApp reminders.
-- Run once in Supabase SQL Editor before turning reminders on. Safe to re-run.

-- When the reminder for this order was handled (sent or deliberately
-- skipped). Null = not yet considered.
alter table public.orders add column if not exists reminder_sent_at timestamptz;

-- Finds a buyer's other orders for the same book (paid since / reminded).
create index if not exists orders_contact_product_idx
  on public.orders (buyer_contact, product_id)
  where buyer_contact is not null;
