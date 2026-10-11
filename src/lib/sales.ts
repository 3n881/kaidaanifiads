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

// ---------------------------------------------------------------------------
// Orders page: filters from the URL (?period=today|7d|all &status=… &q=… &test=1)
// ---------------------------------------------------------------------------

export type OrderPeriod = "today" | "7d" | "all";
export type OrderStatusFilter = "all" | "paid" | "created" | "failed" | "notdownloaded";

export interface OrderRow extends SalesOrder {
  razorpay_payment_id: string | null;
  whatsapp_number: string | null;
}

export interface OrdersView {
  period: OrderPeriod;
  status: OrderStatusFilter;
  q: string;
  includeTest: boolean;
  /** Counts for the cards — the whole period, whatever status is picked. */
  counts: { all: number; paid: number; revenue: number; created: number; failed: number; notDownloaded: number };
  rows: OrderRow[];
  /** true when more rows matched than are shown. */
  truncated: boolean;
}

const ROW_LIMIT = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseOrderFilters(params: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) ?? "";
  const period = (["today", "7d", "all"] as const).find((p) => p === one("period")) ?? "all";
  const status = (["all", "paid", "created", "failed", "notdownloaded"] as const).find((s) => s === one("status")) ?? "all";
  return { period, status, q: one("q").trim().slice(0, 80), includeTest: one("test") === "1" };
}

/** Admin-only: the Orders page list + its summary cards. */
export async function getOrdersView(filters: ReturnType<typeof parseOrderFilters>): Promise<OrdersView> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const periodStart =
    filters.period === "today" ? new Date(startOfTodayIst(now)).toISOString()
    : filters.period === "7d" ? new Date(now - 7 * DAY_MS).toISOString()
    : null;
  // The later of the period start and go-live (unless test orders are wanted).
  const floor = [periodStart, filters.includeTest ? null : SALES_START]
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop();

  const COLUMNS = "id, product_id, amount, locale, status, created_at, paid_at, download_count, whatsapp_sends, buyer_contact, razorpay_payment_id, whatsapp_number";

  let summary = admin.from("orders").select("status, amount, download_count").limit(50000);
  if (floor) summary = summary.gte("created_at", floor);

  let list = admin.from("orders").select(COLUMNS).order("created_at", { ascending: false }).limit(ROW_LIMIT + 1);
  if (floor) list = list.gte("created_at", floor);
  if (filters.status === "notdownloaded") list = list.eq("status", "paid").eq("download_count", 0);
  else if (filters.status !== "all") list = list.eq("status", filters.status);
  if (filters.q) {
    const term = filters.q.replace(/[^0-9a-zA-Z_+-]/g, "");
    // Phones are stored as 10 digits: "+91 98765 43210" → "9876543210".
    const digits = term.replace(/\D/g, "");
    const phone = digits.length > 10 ? digits.slice(-10) : digits;
    if (UUID_RE.test(term)) list = list.eq("id", term);
    else if (/^pay_/i.test(term)) list = list.ilike("razorpay_payment_id", `%${term}%`);
    else if (phone.length >= 3) list = list.or(`buyer_contact.ilike.%${phone}%,whatsapp_number.ilike.%${phone}%`);
    else if (term) list = list.ilike("razorpay_payment_id", `%${term}%`);
  }

  const [summaryRes, listRes] = await Promise.all([summary, list]);
  if (summaryRes.error) throw new Error(summaryRes.error.message);
  if (listRes.error) throw new Error(listRes.error.message);
  const s = (summaryRes.data ?? []) as Array<{ status: string; amount: number; download_count: number | null }>;
  const paid = s.filter((r) => r.status === "paid");
  const rows = (listRes.data ?? []) as OrderRow[];
  return {
    ...filters,
    counts: {
      all: s.length,
      paid: paid.length,
      revenue: paid.reduce((sum, r) => sum + Number(r.amount || 0), 0),
      created: s.filter((r) => r.status === "created").length,
      failed: s.filter((r) => r.status === "failed").length,
      notDownloaded: paid.filter((r) => !r.download_count).length,
    },
    rows: rows.slice(0, ROW_LIMIT),
    truncated: rows.length > ROW_LIMIT,
  };
}
