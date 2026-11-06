-- 017: "buyer still here" signal (2026-11-06).
-- While the Razorpay window is open and our page is on screen, the Buy popup
-- pings /api/orders/alive every 10 s; the server keeps the latest time here.
-- No ping for 30 s + no payment open in Razorpay = the buyer left → the 3
-- "payment not completed" WhatsApp reminders start (src/lib/reminders.ts).
-- Safe to run twice. The code works without it (falls back to 3 min after Buy).

alter table public.orders add column if not exists last_seen_at timestamptz;
