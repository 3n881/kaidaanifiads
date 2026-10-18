-- 013 — Payment reminders as a short sequence (owner, 2026-10-18).
-- An unpaid attempt with a WhatsApp number gets a short reminder sequence:
-- right away when the buyer closes Razorpay (or ~10 min after a failed /
-- abandoned attempt), then more after gaps (src/lib/reminders.ts; default
-- since 18 Oct evening: 2 reminders, the 2nd 1 h after the 1st). The back-fill
-- uses 4 = "finished" for any schedule up to 4.
-- reminder_count = reminders sent so far (claimed atomically before sending),
-- reminder_last_at = when the last one went. reminder_sent_at keeps meaning
-- "first reminder handled". Safe to re-run.

alter table public.orders add column if not exists reminder_count   integer not null default 0;
alter table public.orders add column if not exists reminder_last_at timestamptz;

-- Attempts already handled by the old single reminder are finished: never
-- start a sequence for them after this release (no late messages).
update public.orders
   set reminder_count = 4,
       reminder_last_at = coalesce(reminder_last_at, reminder_sent_at)
 where reminder_sent_at is not null
   and reminder_count = 0;

create index if not exists orders_reminder_due_idx
  on public.orders (created_at desc)
  where status in ('created', 'failed') and buyer_contact is not null and reminder_count < 4;
