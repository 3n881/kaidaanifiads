import "server-only";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { SITE_URL } from "./supabase/config";
import { isReminderConfigured, REMINDER_TEMPLATE_NAME, sendPaymentReminder } from "./interakt";
import { logWhatsApp } from "./whatsapp-log";
import { checkOrderWithRazorpay } from "./reconcile";
import { localizedTitle, normalizeLocale } from "./i18n";

// ---------------------------------------------------------------------------
// "Payment not completed" WhatsApp reminders (Interakt `pending_followup_v2`).
// Client's schedule (2026-11-06): 3 per unpaid attempt, at 0 / 10 / 30 s —
//   1st: right away when the payment FAILS (webhook payment.failed) or the
//        buyer CLOSES Razorpay (/api/orders/closed). A buyer who just LEAVES:
//        the Buy popup pings /api/orders/alive every 10 s while Razorpay is
//        open and the page is on screen (migration 017 `last_seen_at`); 30 s
//        of silence = left → burst, unless a payment is still open in Razorpay
//        (buyer in the UPI app: then the payment.failed webhook starts it when
//        UPI times out). Still pinging after 10 min → reminded anyway. No pings
//        at all (page from before this release, migration not applied) → 3 min
//        after Buy (LEFT_DELAY_SECONDS).
//   2nd: 10 s after the 1st;  3rd: 30 s after the 1st (gaps 10, 20 s —
//   REMINDER_GAPS_SECONDS). First asked as 0 / 5 / 13 s, widened the same day.
// Live data 19 Oct–6 Nov (330 paid): median Buy→paid 32 s, 98 % within 3 min,
// 99.7 % within 5 min; 91 % of failures are UPI `payment_timed_out`, which
// Razorpay reports ~12 min after Buy.
// Before EVERY message: still unpaid, newest attempt on that book by that
// phone, the phone doesn't own the book, Razorpay asked live (paid → marked
// paid + PDF, no message; payment open → wait). So a buyer who pays between
// messages gets no further reminder.
// The burst runs in the server process; the 10-min cron finishes any burst a
// restart / deploy cut short (that message then arrives late, not twice).
// History: 18 Oct 2 reminders (right away / 10 min, then +1 h).
// ---------------------------------------------------------------------------

function seconds(value: string | undefined, fallback: string): number[] {
  return (value || fallback)
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
}

/** Seconds between reminders (1→2, 2→3, …). Default "10,20" = 3 reminders at 0 / 10 / 30 s. */
const GAPS_SECONDS = seconds(process.env.REMINDER_GAPS_SECONDS, "10,20");
export const MAX_REMINDERS = 1 + GAPS_SECONDS.length;
/** Buyer left without closing Razorpay or failing: 1st reminder this long after Buy. */
export const LEFT_DELAY_SECONDS = seconds(process.env.LEFT_REMINDER_DELAY_SECONDS, "180")[0] ?? 180;
/** "Left" = no ping from the buyer's page for this long (pings every 10 s). */
const SILENCE_SECONDS = 30;
/** A page still pinging this long after Buy gets its reminders anyway. */
const LEFT_MAX_SECONDS = 600;
/** How often the server looks at a fresh attempt's pings. */
const LEFT_POLL_MS = 10_000;
// No FIRST reminder for an attempt older than this (no messages hours late, e.g.
// right after a deploy).
const START_WITHIN_HOURS = 3;
const WINDOW_HOURS = 24;
// A burst never waits longer than this between two messages in one process.
const MAX_BURST_WAIT_MS = 60_000;

const BASE_COLUMNS =
  "id, name, status, created_at, product_id, locale, buyer_contact, checkout_closed_at, reminder_count, reminder_last_at, razorpay_order_id, amount, products(slug, is_combo, title, title_mr, title_hi, title_en)";
// Migration 017 adds last_seen_at; until it is applied, read without it.
let hasSeenColumn = true;
const columns = () => (hasSeenColumn ? `${BASE_COLUMNS}, last_seen_at` : BASE_COLUMNS);
const isMissingColumn = (error: { code?: string } | null) => error?.code === "42703";
const COLUMNS = BASE_COLUMNS; // admin reminders don't need last_seen_at

interface ReminderOrder {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  product_id: number;
  locale: string | null;
  buyer_contact: string;
  checkout_closed_at: string | null;
  reminder_count: number;
  reminder_last_at: string | null;
  razorpay_order_id: string | null;
  amount: number;
  last_seen_at?: string | null;
  products: {
    slug: string;
    is_combo: boolean | null;
    title: string;
    title_mr: string | null;
    title_hi: string | null;
    title_en: string | null;
  } | null;
}

/** When this attempt's next reminder is due (epoch ms), or null when none is left. */
export function nextDueAt(
  order: Pick<ReminderOrder, "reminder_count" | "created_at" | "checkout_closed_at" | "status" | "reminder_last_at" | "last_seen_at">,
): number | null {
  const count = order.reminder_count ?? 0;
  if (count >= MAX_REMINDERS) return null;
  if (count === 0) {
    const created = Date.parse(order.created_at);
    if (created < Date.now() - START_WITHIN_HOURS * 3600_000) return null;
    if (order.checkout_closed_at) return Date.parse(order.checkout_closed_at); // closed → now
    if (order.status === "failed") return created; // failed → now
    // Left: 30 s after the buyer's page went quiet (capped at 10 min after Buy);
    // no pings at all → 3 min after Buy.
    if (order.last_seen_at) {
      return Math.min(Date.parse(order.last_seen_at) + SILENCE_SECONDS * 1000, created + LEFT_MAX_SECONDS * 1000);
    }
    return created + LEFT_DELAY_SECONDS * 1000;
  }
  const last = Date.parse(order.reminder_last_at ?? order.created_at);
  return last + GAPS_SECONDS[count - 1] * 1000;
}

/** Cron: every due reminder of every pending attempt (one step per attempt per run). */
export async function sendPaymentReminders(): Promise<{ due: number; sent: number }> {
  if (!isReminderConfigured) return { due: 0, sent: 0 };
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const query = () =>
    admin
      .from("orders")
      .select(columns())
      .in("status", ["created", "failed"])
      .not("buyer_contact", "is", null)
      .lt("reminder_count", MAX_REMINDERS)
      .gte("created_at", new Date(now - WINDOW_HOURS * 3600_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(300);
  let { data, error } = await query();
  if (isMissingColumn(error) && hasSeenColumn) {
    hasSeenColumn = false;
    ({ data, error } = await query());
  }
  if (error) throw new DatabaseUnavailableError("reminder candidates", error);
  const candidates = (data ?? []) as unknown as ReminderOrder[];

  // Newest attempt per phone + book within this list (list is newest first);
  // remind() also checks the database for newer attempts outside this list.
  const newest = new Set<string>();
  const due: ReminderOrder[] = [];
  for (const order of candidates) {
    const key = `${order.buyer_contact}:${order.product_id}`;
    if (newest.has(key)) continue;
    newest.add(key);
    const at = nextDueAt(order);
    if (at !== null && at <= now) due.push(order);
  }

  let sent = 0;
  for (const order of due) if ((await remind(order)) === "sent") sent++;
  return { due: due.length, sent };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadOrder(orderId: string): Promise<ReminderOrder | null> {
  const query = () => getSupabaseAdmin().from("orders").select(columns()).eq("id", orderId).maybeSingle();
  let { data, error } = await query();
  if (isMissingColumn(error) && hasSeenColumn) {
    hasSeenColumn = false;
    ({ data, error } = await query());
  }
  if (error || !data) return null;
  return data as unknown as ReminderOrder;
}

/**
 * The whole sequence for one attempt, right now: 1st message, then the 2nd and
 * 3rd after their gaps (seconds). Called when the payment fails (webhook), the
 * buyer closes Razorpay, or the "left" timer fires. Stops as soon as the buyer
 * pays / owns the book / tries again, or a payment is open in Razorpay. Two
 * overlapping bursts (close + failure) can't double a message: each one is
 * claimed in the database first. Best effort — the cron covers anything missed.
 */
export async function runReminderBurst(orderId: string): Promise<number> {
  if (!isReminderConfigured) return 0;
  let sent = 0;
  // Each message can take a wait + a send, plus a lost claim — bounded either way.
  for (let step = 0; step < MAX_REMINDERS * 3 + 2; step++) {
    const order = await loadOrder(orderId);
    if (!order || !order.buyer_contact || (order.status !== "created" && order.status !== "failed")) break;
    const at = nextDueAt(order);
    if (at === null) break;
    const wait = at - Date.now();
    if (wait > MAX_BURST_WAIT_MS) break; // not due soon (e.g. "left" timer) — the timer / cron sends it
    if (wait > 0) {
      await sleep(wait);
      continue; // re-read after waiting: paid / closed / another burst may have moved on
    }
    const result = await remind(order);
    if (result === "sent" || result === "refused") sent += result === "sent" ? 1 : 0;
    else if (result === "lost_claim") continue; // another burst sent this step; follow it
    else break; // finished, or a payment is open / Razorpay can't be asked
  }
  return sent;
}

/** @deprecated name kept for older callers — same as runReminderBurst. */
export const sendReminderNowIfDue = runReminderBurst;

// "Left" watch: buyer tapped Buy and then nothing (no close, no failure).
// Looks at the attempt's pings every 10 s from 30 s after Buy; starts the
// burst once the page has been quiet for 30 s (or 3 min with no pings at all,
// 10 min at most). In-process; a restart drops it and the cron sends instead
// (≤ 10 min late). A close / failure starts its own burst and ends the watch.
const leftWatches = new Set<string>();

export function scheduleLeftReminder(orderId: string): void {
  if (!isReminderConfigured || leftWatches.has(orderId)) return;
  leftWatches.add(orderId);
  const stop = () => leftWatches.delete(orderId);
  const tick = async () => {
    try {
      const order = await loadOrder(orderId);
      // Paid, failed or closed (those start their own burst), already reminded, or gone.
      if (!order || order.status !== "created" || order.checkout_closed_at || (order.reminder_count ?? 0) > 0) return stop();
      const at = nextDueAt(order);
      if (at === null) return stop();
      const wait = at - Date.now();
      if (wait <= LEFT_POLL_MS) {
        stop();
        if (wait > 0) await sleep(wait);
        await runReminderBurst(orderId);
        return;
      }
      later(LEFT_POLL_MS);
    } catch (error) {
      stop();
      console.error("[reminders] left watch failed", orderId, error instanceof Error ? error.message : error);
    }
  };
  const later = (ms: number) => {
    const timer = setTimeout(() => void tick(), ms);
    timer.unref?.();
  };
  later(SILENCE_SECONDS * 1000);
}

type RemindResult = "sent" | "refused" | "lost_claim" | "finished" | "paying" | "unreachable";

async function remind(order: ReminderOrder): Promise<RemindResult> {
  const admin = getSupabaseAdmin();
  if (!order.products) return "finished";

  // A NEWER attempt on this book by this number exists (pending, finished or
  // paid) → this older one is finished. Checked against the database, not just
  // the cron's candidate list: on 18 Oct an older attempt started its own
  // reminders once the newer one had finished — 4 messages for one book.
  const { count: newer, error: newerError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_contact", order.buyer_contact)
    .eq("product_id", order.product_id)
    .gt("created_at", order.created_at);
  if (newerError) throw new DatabaseUnavailableError("reminder newer check", newerError);
  if ((newer ?? 0) > 0) {
    await admin.from("orders").update({ reminder_count: MAX_REMINDERS }).eq("id", order.id).lt("reminder_count", MAX_REMINDERS);
    return "finished";
  }

  // Owns the book (paid for it before or since) → this attempt is finished.
  const { count: owned, error: ownedError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_contact", order.buyer_contact)
    .eq("product_id", order.product_id)
    .eq("status", "paid");
  if (ownedError) throw new DatabaseUnavailableError("reminder owned check", ownedError);
  if ((owned ?? 0) > 0) {
    await admin.from("orders").update({ reminder_count: MAX_REMINDERS }).eq("id", order.id);
    return "finished";
  }

  // Ask Razorpay now. Paid → marked paid + PDF sent, no reminder. A payment
  // still open (UPI app waiting for approval, retry in the popup) → wait: its
  // failure webhook or the cron continues. Unreachable → the cron tries later.
  const razorpay = await checkOrderWithRazorpay({ id: order.id, razorpay_order_id: order.razorpay_order_id, amount: order.amount });
  if (razorpay === "paid") return "finished";
  if (razorpay === "in_progress") return "paying";
  if (razorpay === "unreachable") return "unreachable";

  // Claim this reminder first (count n → n+1, still unpaid), so an overlapping
  // burst or the cron can never send the same reminder twice.
  const count = order.reminder_count ?? 0;
  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("orders")
    .update({
      reminder_count: count + 1,
      reminder_last_at: nowIso,
      ...(count === 0 ? { reminder_sent_at: nowIso } : {}),
    })
    .eq("id", order.id)
    .eq("reminder_count", count)
    .in("status", ["created", "failed"])
    .select("id")
    .maybeSingle();
  if (claimError) throw new DatabaseUnavailableError("claim reminder", claimError);
  if (!claimed) return "lost_claim";

  const ok = await sendReminderMessage(order);
  await logWhatsApp({
    orderId: order.id,
    phone: order.buyer_contact,
    name: order.name,
    productId: order.product_id,
    kind: "reminder",
    template: REMINDER_TEMPLATE_NAME,
    step: count + 1,
    ok,
  });
  if (!ok) console.error("[reminders] Interakt refused", order.id, `#${count + 1}`);
  return ok ? "sent" : "refused";
}


function sendReminderMessage(order: ReminderOrder): Promise<boolean> {
  const products = order.products!;
  const locale = normalizeLocale(order.locale);
  const section = products.is_combo ? "combos" : "ebooks";
  return sendPaymentReminder({
    phone: order.buyer_contact,
    name: order.name && order.name !== "Guest" ? order.name : "ग्राहक",
    productTitle: localizedTitle(products, locale),
    productLink: `${SITE_URL.replace(/\/$/, "")}/${section}/${products.slug}`,
    locale,
  });
}

export type AdminReminderResult =
  | "sent"
  | "failed"
  | "owns_book"
  | "not_pending"
  | "newer_attempt"
  | "paid_now"
  | "paying"
  | "razorpay_unreachable"
  | "no_number"
  | "too_soon"
  | "off";

// A second tap / a double selection can't send the same message twice.
const ADMIN_MIN_GAP_MINUTES = 10;

/**
 * Dashboard: an admin sends the "payment not completed" reminder to a pending,
 * cancelled or failed attempt now (one order, or several selected — each one
 * checked on its own, right before its message). Same checks as the automatic
 * ones: still unpaid, newest attempt on that book, the number doesn't own the
 * book, Razorpay says not paid (and no payment in progress), status re-read
 * just before sending. Doesn't change the automatic sequence. Recorded with the
 * admin's e-mail.
 */
export async function sendAdminReminder(orderId: string, by: string): Promise<AdminReminderResult> {
  if (!isReminderConfigured) return "off";
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("orders")
    .select(COLUMNS)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new DatabaseUnavailableError("admin reminder order", error);
  const order = data as unknown as (ReminderOrder & { razorpay_order_id: string | null; amount: number }) | null;

  // 1. Still unpaid, with a number.
  if (!order || (order.status !== "created" && order.status !== "failed")) return "not_pending";
  if (!order.buyer_contact || !order.products) return "no_number";

  // 2. Only the newest attempt on this book by this number (no duplicates for repeat taps).
  const { count: newer, error: newerError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_contact", order.buyer_contact)
    .eq("product_id", order.product_id)
    .gt("created_at", order.created_at);
  if (newerError) throw new DatabaseUnavailableError("admin reminder newer check", newerError);
  if ((newer ?? 0) > 0) return "newer_attempt";

  // 3. The number doesn't own the book (bought before or since).
  const { count: owned, error: ownedError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_contact", order.buyer_contact)
    .eq("product_id", order.product_id)
    .eq("status", "paid");
  if (ownedError) throw new DatabaseUnavailableError("admin reminder owned check", ownedError);
  if ((owned ?? 0) > 0) return "owns_book";

  // Not the same number + book twice within a few minutes (double tap / bulk overlap).
  const since = new Date(Date.now() - ADMIN_MIN_GAP_MINUTES * 60_000).toISOString();
  const { count: recent } = await admin
    .from("whatsapp_log")
    .select("id", { count: "exact", head: true })
    .eq("phone", order.buyer_contact)
    .eq("product_id", order.product_id)
    .in("kind", ["reminder", "reminder_admin"])
    .eq("ok", true)
    .gte("created_at", since);
  if ((recent ?? 0) > 0) return "too_soon";

  // 4. Ask Razorpay now: paid (→ marked paid + PDF sent), still paying, or unreachable → no reminder.
  const razorpay = await checkOrderWithRazorpay({ id: order.id, razorpay_order_id: order.razorpay_order_id, amount: order.amount });
  if (razorpay === "paid") return "paid_now";
  if (razorpay === "in_progress") return "paying";
  if (razorpay === "unreachable") return "razorpay_unreachable";

  // 5. Re-read the status a moment before sending (paid in the meantime → nothing).
  const { data: fresh } = await admin.from("orders").select("status").eq("id", order.id).maybeSingle();
  if (!fresh || (fresh.status !== "created" && fresh.status !== "failed")) return "not_pending";

  const ok = await sendReminderMessage(order);
  await logWhatsApp({
    orderId: order.id,
    phone: order.buyer_contact,
    name: order.name,
    productId: order.product_id,
    kind: "reminder_admin",
    template: REMINDER_TEMPLATE_NAME,
    ok,
    by,
  });
  return ok ? "sent" : "failed";
}
