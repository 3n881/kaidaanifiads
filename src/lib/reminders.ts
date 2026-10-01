import "server-only";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { SITE_URL } from "./supabase/config";
import { isReminderConfigured, sendPaymentReminder } from "./interakt";
import { localizedTitle, normalizeLocale } from "./i18n";

// ---------------------------------------------------------------------------
// "Payment not completed" WhatsApp reminder, run by the cron after the
// reconcile sweep (so an order Razorpay actually captured is already `paid`).
// Only orders whose payment failed carry a phone (Razorpay's `contact`, saved
// by the webhook), so a buyer who closed checkout before typing a number is
// never contacted. Each phone + book gets at most one reminder per day.
// ---------------------------------------------------------------------------

// Wait before reminding: most buyers retry and pay within a few minutes.
const DELAY_MINUTES = Number(process.env.PAYMENT_REMINDER_DELAY_MINUTES || 30);
// Never remind about an attempt older than this.
const WINDOW_HOURS = 24;

interface ReminderOrder {
  id: string;
  name: string | null;
  product_id: number;
  locale: string | null;
  buyer_contact: string;
  products: {
    slug: string;
    is_combo: boolean | null;
    title: string;
    title_mr: string | null;
    title_hi: string | null;
    title_en: string | null;
  } | null;
}

export async function sendPaymentReminders(): Promise<{ due: number; sent: number }> {
  if (!isReminderConfigured) return { due: 0, sent: 0 };
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_HOURS * 3600_000).toISOString();

  const { data, error } = await admin
    .from("orders")
    .select("id, name, product_id, locale, buyer_contact, products(slug, is_combo, title, title_mr, title_hi, title_en)")
    .in("status", ["created", "failed"])
    .is("reminder_sent_at", null)
    .not("buyer_contact", "is", null)
    .lte("created_at", new Date(now - DELAY_MINUTES * 60_000).toISOString())
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new DatabaseUnavailableError("reminder candidates", error);
  const due = (data ?? []) as unknown as ReminderOrder[];

  let sent = 0;
  const seen = new Set<string>();
  for (const order of due) {
    // Claim the order first, so an overlapping sweep can never double-send.
    // reminder_sent_at means "handled": it is set even when we skip.
    const { data: claimed, error: claimError } = await admin
      .from("orders")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", order.id)
      .is("reminder_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw new DatabaseUnavailableError("claim reminder", claimError);
    if (!claimed || !order.products) continue;

    // Several Buy taps by one buyer create several orders: remind once.
    const key = `${order.buyer_contact}:${order.product_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Skip if this buyer has since paid for the book, or was already
    // reminded about it in the last day.
    const { count, error: countError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_contact", order.buyer_contact)
      .eq("product_id", order.product_id)
      .neq("id", order.id)
      .or(`status.eq.paid,reminder_sent_at.gte.${windowStart}`);
    if (countError) throw new DatabaseUnavailableError("reminder duplicate check", countError);
    if ((count ?? 0) > 0) continue;

    const locale = normalizeLocale(order.locale);
    const section = order.products.is_combo ? "combos" : "ebooks";
    const ok = await sendPaymentReminder({
      phone: order.buyer_contact,
      name: order.name && order.name !== "Guest" ? order.name : "ग्राहक",
      productTitle: localizedTitle(order.products, locale),
      productLink: `${SITE_URL.replace(/\/$/, "")}/${section}/${order.products.slug}`,
      locale,
    });
    if (ok) sent++;
  }
  return { due: due.length, sent };
}
