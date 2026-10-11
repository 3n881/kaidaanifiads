import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { requireAdmin } from "./auth";

/**
 * Sales are counted from the moment live Razorpay keys went in
 * (2026-10-11 ≈ 14:30 IST). Everything before was Razorpay test mode and is
 * left out of the totals. Refunds are not tracked yet: a refunded payment
 * still counts as paid here.
 */
export const SALES_START = "2026-10-11T09:00:00Z";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface SalesOrder {
  id: string;
  product_id: number | null;
  amount: number;
  locale: "mr" | "hi" | "en" | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  download_count: number | null;
  whatsapp_sends: number | null;
  buyer_contact: string | null;
}

export interface PeriodStats {
  /** Buy taps that opened Razorpay (one order row each). */
  checkouts: number;
  paid: number;
  failed: number;
  revenue: number;
  /** paid ÷ checkouts, null when there were no checkouts. */
  conversion: number | null;
}

export interface SalesOverview {
  today: PeriodStats;
  week: PeriodStats;
  all: PeriodStats;
  /** Paid > 15 min ago, never downloaded — follow up on WhatsApp. */
  paidNotDownloaded: SalesOrder[];
  /** Paid > 5 min ago, no WhatsApp message sent. */
  whatsappMissing: SalesOrder[];
  newMessages: number;
  topBooksWeek: Array<{ productId: number | null; paid: number; revenue: number }>;
  latestPaid: SalesOrder[];
}

function stats(rows: SalesOrder[]): PeriodStats {
  const paidRows = rows.filter((r) => r.status === "paid");
  return {
    checkouts: rows.length,
    paid: paidRows.length,
    failed: rows.filter((r) => r.status === "failed").length,
    revenue: paidRows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    conversion: rows.length ? paidRows.length / rows.length : null,
  };
}

/** Start of today in India, as a UTC timestamp. */
function startOfTodayIst(now: number): number {
  return Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/** Admin-only: the sales numbers on the dashboard overview. */
export async function getSalesOverview(): Promise<SalesOverview> {
  await requireAdmin();
  return computeSalesOverview(getSupabaseAdmin());
}

/** The calculation itself (no auth check — callers must be admin-guarded). */
export async function computeSalesOverview(admin: ReturnType<typeof getSupabaseAdmin>): Promise<SalesOverview> {
  const [ordersRes, messagesRes] = await Promise.all([
    admin
      .from("orders")
      .select("id, product_id, amount, locale, status, created_at, paid_at, download_count, whatsapp_sends, buyer_contact")
      .gte("created_at", SALES_START)
      .order("created_at", { ascending: false })
      .limit(20000),
    admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  const rows = (ordersRes.data ?? []) as SalesOrder[];

  const now = Date.now();
  const todayStart = startOfTodayIst(now);
  const weekStart = now - 7 * DAY_MS;
  const since = (t: number) => rows.filter((r) => Date.parse(r.created_at) >= t);
  const paid = rows.filter((r) => r.status === "paid");
  const paidAgo = (r: SalesOrder, ms: number) => Date.parse(r.paid_at ?? r.created_at) < now - ms;

  const weekPaid = since(weekStart).filter((r) => r.status === "paid");
  const byBook = new Map<number | null, { productId: number | null; paid: number; revenue: number }>();
  for (const r of weekPaid) {
    const entry = byBook.get(r.product_id) ?? { productId: r.product_id, paid: 0, revenue: 0 };
    entry.paid += 1;
    entry.revenue += Number(r.amount || 0);
    byBook.set(r.product_id, entry);
  }

  return {
    today: stats(since(todayStart)),
    week: stats(since(weekStart)),
    all: stats(rows),
    paidNotDownloaded: paid.filter((r) => !r.download_count && paidAgo(r, 15 * 60 * 1000)).slice(0, 20),
    whatsappMissing: paid.filter((r) => !r.whatsapp_sends && paidAgo(r, 5 * 60 * 1000)).slice(0, 20),
    newMessages: messagesRes.count ?? 0,
    topBooksWeek: [...byBook.values()].sort((a, b) => b.paid - a.paid).slice(0, 5),
    latestPaid: paid.slice(0, 10),
  };
}
