import "server-only";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { SITE_URL } from "./supabase/config";
import { isReminderConfigured, REMINDER_TEMPLATE_NAME, sendPaymentReminder } from "./interakt";
import { logWhatsApp } from "./whatsapp-log";
import { checkOrderWithRazorpay } from "./reconcile";
import { localizedTitle, normalizeLocale } from "./i18n";

// ---------------------------------------------------------------------------
// "Payment not completed" WhatsApp reminders (Interakt `pending_followup_v2`).
// Owner's schedule (2026-10-18, migration 013): 2 per unpaid attempt —
//   1st: right away when the buyer closes Razorpay (/api/orders/closed), or
//        FIRST_DELAY_MINUTES after a failed / abandoned attempt (the cron);
//   2nd: 1 h after the 1st. (Same evening it was briefly 4: +10, +30, +60 min.)
// No daily cap per phone: two pending books get their own reminders. Several
// Buy taps on the SAME book by one phone → only the newest attempt is reminded.
// Never to a phone that owns that book (paid before or since). Every new order
// carries the number typed in our Buy popup; older ones only Razorpay's contact
// on a failed payment. The cron runs this after the reconcile sweep, so an
// order Razorpay actually captured is already `paid`.
// ---------------------------------------------------------------------------

/** Minutes between reminders (1→2, …). Default "60" = 2 reminders; e.g. "10,30,60" = 4. */
const GAPS_MINUTES = (process.env.REMINDER_GAPS_MINUTES || "60")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);
export const MAX_REMINDERS = 1 + GAPS_MINUTES.length;
// Before the 1st reminder when the buyer did NOT close Razorpay (failed, or left
// the app): they may still be paying in their UPI app. Same env as before.
const FIRST_DELAY_MINUTES = Number(
  process.env.PAYMENT_FAILED_REMINDER_DELAY_MINUTES || process.env.PAYMENT_REMINDER_DELAY_MINUTES || 10,
);
// No FIRST reminder for an attempt older than this (no messages hours late, e.g.
// right after a deploy); a started sequence finishes within ~1 h anyway.
const START_WITHIN_HOURS = 3;
const WINDOW_HOURS = 24;

const COLUMNS =
  "id, name, status, created_at, product_id, locale, buyer_contact, checkout_closed_at, reminder_count, reminder_last_at, products(slug, is_combo, title, title_mr, title_hi, title_en)";

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
export function nextDueAt(order: ReminderOrder): number | null {
  const count = order.reminder_count ?? 0;
  if (count >= MAX_REMINDERS) return null;
  if (count === 0) {
    const created = Date.parse(order.created_at);
    if (created < Date.now() - START_WITHIN_HOURS * 3600_000) return null;
    // Closed Razorpay → right away; otherwise give a running UPI payment time.
    return order.checkout_closed_at ? Date.parse(order.checkout_closed_at) : created + FIRST_DELAY_MINUTES * 60_000;
  }
  const last = Date.parse(order.reminder_last_at ?? order.created_at);
  return last + GAPS_MINUTES[count - 1] * 60_000;
}

/** Cron: every due reminder of every pending attempt. */
export async function sendPaymentReminders(): Promise<{ due: number; sent: number }> {
  if (!isReminderConfigured) return { due: 0, sent: 0 };
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const { data, error } = await admin
    .from("orders")
    .select(COLUMNS)
    .in("status", ["created", "failed"])
    .not("buyer_contact", "is", null)
    .lt("reminder_count", MAX_REMINDERS)
    .gte("created_at", new Date(now - WINDOW_HOURS * 3600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(300);
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
  for (const order of due) if (await remind(order)) sent++;
  return { due: due.length, sent };
}

/**
 * The buyer just closed Razorpay (/api/orders/closed): send the 1st reminder
 * now instead of waiting for the cron. Best effort; the cron covers misses.
 */
export async function sendReminderNowIfDue(orderId: string): Promise<boolean> {
  if (!isReminderConfigured) return false;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("orders").select(COLUMNS).eq("id", orderId).maybeSingle();
  if (error || !data) return false;
  const order = data as unknown as ReminderOrder;
  if (!order.buyer_contact || (order.status !== "created" && order.status !== "failed")) return false;
  // A newer attempt on the same book by this phone takes over the sequence.
  const { count: newer } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_contact", order.buyer_contact)
    .eq("product_id", order.product_id)
    .gt("created_at", order.created_at);
  if ((newer ?? 0) > 0) return false;
  const at = nextDueAt(order);
  return at !== null && at <= Date.now() ? remind(order) : false;
}

async function remind(order: ReminderOrder): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!order.products) return false;

  // A NEWER attempt on this book by this number exists (pending, finished or
  // paid) → this older one is finished. Checked against the database, not just
  // the cron's candidate list: on 18 Oct an older attempt started its own
  // reminders once the newer one had finished its 2 (the candidate list only
  // held attempts with reminders left) — 4 messages for one book.
  const { count: newer, error: newerError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_contact", order.buyer_contact)
    .eq("product_id", order.product_id)
    .gt("created_at", order.created_at);
  if (newerError) throw new DatabaseUnavailableError("reminder newer check", newerError);
  if ((newer ?? 0) > 0) {
    await admin.from("orders").update({ reminder_count: MAX_REMINDERS }).eq("id", order.id).lt("reminder_count", MAX_REMINDERS);
    return false;
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
    return false;
  }

  // Claim this reminder first (count n → n+1), so an overlapping run or the
  // close-time send can never send the same reminder twice.
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
  if (!claimed) return false;

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
  return ok;
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
    .select(`${COLUMNS}, razorpay_order_id, amount`)
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
