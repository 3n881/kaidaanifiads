import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { requireAdmin } from "./auth";

/**
 * Sales are counted from the moment live Razorpay keys went in
 * (2026-10-11 ≈ 14:30 IST). Everything before was Razorpay test mode and is
 * left out of the totals. Revenue is net of refunds (migration 008:
 * refunded_amount, filled by the refund webhook / "Check with Razorpay").
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
  refunded_amount: number | null;
  refund_status: "partial" | "full" | null;
}

export interface PeriodStats {
  /** Buy taps that opened Razorpay (one order row each). */
  checkouts: number;
  paid: number;
  failed: number;
  /** ₹ received minus ₹ refunded. */
  revenue: number;
  refunds: number;
  refundedAmount: number;
  /** paid ÷ checkouts, null when there were no checkouts. */
  conversion: number | null;
  /** % change vs the comparison period (null: nothing to compare). */
  revenueChange: number | null;
  paidChange: number | null;
}

export interface SalesOverview {
  today: PeriodStats;
  week: PeriodStats;
  all: PeriodStats;
  /** Paid > 15 min ago, never downloaded — follow up on WhatsApp. */
  paidNotDownloaded: OrderRow[];
  /** Paid > 5 min ago, no WhatsApp message sent. */
  whatsappMissing: OrderRow[];
  /** Failed payments today whose buyer hasn't paid for that book since (they have a phone number). */
  failedToday: OrderRow[];
  newMessages: number;
  /** Interested buyers (leads) still subscribed, and new ones in 7 days. */
  interested: { active: number; newWeek: number };
  topBooksWeek: Array<{ productId: number | null; paid: number; revenue: number }>;
  /** Last 14 IST days, oldest first: paid orders and net ₹ by the day they were paid. */
  daily: Array<{ date: string; paid: number; revenue: number }>;
  latestPaid: OrderRow[];
  readAt: string;
}

function stats(rows: SalesOrder[], before?: SalesOrder[]): PeriodStats {
  const net = (r: SalesOrder) => Number(r.amount || 0) - Number(r.refunded_amount || 0);
  const paidRows = rows.filter((r) => r.status === "paid");
  const revenue = paidRows.reduce((sum, r) => sum + net(r), 0);
  const prevPaid = before?.filter((r) => r.status === "paid");
  const pctChange = (now: number, then: number) => (then > 0 ? ((now - then) / then) * 100 : null);
  return {
    checkouts: rows.length,
    paid: paidRows.length,
    failed: rows.filter((r) => r.status === "failed").length,
    revenue,
    refunds: paidRows.filter((r) => Number(r.refunded_amount || 0) > 0).length,
    refundedAmount: paidRows.reduce((sum, r) => sum + Number(r.refunded_amount || 0), 0),
    conversion: rows.length ? paidRows.length / rows.length : null,
    revenueChange: prevPaid ? pctChange(revenue, prevPaid.reduce((sum, r) => sum + net(r), 0)) : null,
    paidChange: prevPaid ? pctChange(paidRows.length, prevPaid.length) : null,
  };
}

/** Start of today in India, as a UTC timestamp. */
function startOfTodayIst(now: number): number {
  return Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/** YYYY-MM-DD of a timestamp in India. */
const istDate = (ms: number) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Admin-only: the sales numbers on the dashboard overview. */
export async function getSalesOverview(): Promise<SalesOverview> {
  await requireAdmin();
  return computeSalesOverview(getSupabaseAdmin());
}

/** The calculation itself (no auth check — callers must be admin-guarded). */
export async function computeSalesOverview(admin: ReturnType<typeof getSupabaseAdmin>): Promise<SalesOverview> {
  const [ordersRes, messagesRes, leadsRes] = await Promise.all([
    admin
      .from("orders")
      .select(
        "id, product_id, amount, locale, status, created_at, paid_at, download_count, whatsapp_sends, buyer_contact, refunded_amount, refund_status, razorpay_payment_id, whatsapp_number, checkout_closed_at, name",
      )
      .gte("created_at", SALES_START)
      .order("created_at", { ascending: false })
      .limit(20000),
    admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
    admin.from("leads").select("created_at").is("opted_out_at", null).limit(20000),
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  const rows = (ordersRes.data ?? []) as OrderRow[];

  const now = Date.now();
  const todayStart = startOfTodayIst(now);
  const weekStart = now - 7 * DAY_MS;
  const between = (from: number, to: number) =>
    rows.filter((r) => {
      const t = Date.parse(r.created_at);
      return t >= from && t < to;
    });
  const since = (t: number) => between(t, Infinity);
  const paid = rows.filter((r) => r.status === "paid");
  const paidAgo = (r: SalesOrder, ms: number) => Date.parse(r.paid_at ?? r.created_at) < now - ms;

  const weekPaid = since(weekStart).filter((r) => r.status === "paid");
  const byBook = new Map<number | null, { productId: number | null; paid: number; revenue: number }>();
  for (const r of weekPaid) {
    const entry = byBook.get(r.product_id) ?? { productId: r.product_id, paid: 0, revenue: 0 };
    entry.paid += 1;
    entry.revenue += Number(r.amount || 0) - Number(r.refunded_amount || 0);
    byBook.set(r.product_id, entry);
  }

  // Last 14 days by the IST day the order was paid.
  const daily = Array.from({ length: 14 }, (_, i) => ({ date: istDate(todayStart - (13 - i) * DAY_MS), paid: 0, revenue: 0 }));
  const dayIndex = new Map(daily.map((d, i) => [d.date, i]));
  for (const r of paid) {
    const i = dayIndex.get(istDate(Date.parse(r.paid_at ?? r.created_at)));
    if (i === undefined) continue;
    daily[i].paid += 1;
    daily[i].revenue += Number(r.amount || 0) - Number(r.refunded_amount || 0);
  }

  // A failed attempt is settled once the same phone paid for the same book afterwards.
  const paidLater = (f: OrderRow) =>
    paid.some((p) => p.buyer_contact && p.buyer_contact === f.buyer_contact && p.product_id === f.product_id && p.created_at >= f.created_at);

  return {
    today: stats(since(todayStart), between(todayStart - DAY_MS, now - DAY_MS)),
    week: stats(since(weekStart), between(now - 14 * DAY_MS, weekStart)),
    all: stats(rows),
    paidNotDownloaded: paid.filter((r) => !r.download_count && paidAgo(r, 15 * 60 * 1000)).slice(0, 20),
    whatsappMissing: paid.filter((r) => !r.whatsapp_sends && paidAgo(r, 5 * 60 * 1000)).slice(0, 20),
    failedToday: since(todayStart).filter((r) => r.status === "failed" && !paidLater(r)).slice(0, 20),
    newMessages: messagesRes.count ?? 0,
    interested: {
      active: (leadsRes.data ?? []).length,
      newWeek: ((leadsRes.data ?? []) as Array<{ created_at: string }>).filter((l) => Date.parse(l.created_at) >= weekStart).length,
    },
    topBooksWeek: [...byBook.values()].sort((a, b) => b.paid - a.paid).slice(0, 5),
    daily,
    latestPaid: paid.slice(0, 5),
    readAt: new Date(now).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Orders page: filters from the URL
//   ?period=today|week|month|2m|3m|all|custom (&from=&to= YYYY-MM-DD, IST)
//   &status=all|paid|pending|failed|cancelled|refunded|notdownloaded &q=… &test=1
// ---------------------------------------------------------------------------

export const ORDER_PERIODS = ["today", "week", "month", "2m", "3m", "all", "custom"] as const;
export type OrderPeriod = (typeof ORDER_PERIODS)[number];
export const ORDER_STATUSES = ["all", "paid", "pending", "failed", "cancelled", "refunded", "notdownloaded"] as const;
export type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

const PERIOD_DAYS: Partial<Record<OrderPeriod, number>> = { week: 7, month: 30, "2m": 60, "3m": 90 };
// Old links (Overview page, bookmarks) → new names.
const PERIOD_ALIASES: Record<string, OrderPeriod> = { "7d": "week" };
const STATUS_ALIASES: Record<string, OrderStatusFilter> = { created: "pending" };

export interface OrderRow extends SalesOrder {
  razorpay_payment_id: string | null;
  whatsapp_number: string | null;
  checkout_closed_at: string | null;
  /** From the Buy popup since 2026-10-18; "Guest" before. */
  name: string | null;
}

/** Short order number shown on cards and searchable: first 6 characters of the id, e.g. #3F9A2C. */
export function shortOrderId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

/** Drop-off group of an unpaid order (migration 011). */
export function dropOffKind(o: Pick<OrderRow, "status" | "checkout_closed_at">): "failed" | "cancelled" | "pending" | null {
  if (o.status === "paid") return null;
  if (o.status === "failed") return "failed";
  return o.checkout_closed_at ? "cancelled" : "pending";
}

export interface OrdersView {
  period: OrderPeriod;
  from: string;
  to: string;
  status: OrderStatusFilter;
  q: string;
  includeTest: boolean;
  /** Numbers for the whole period, whatever status tab is picked. */
  kpis: {
    revenue: number;
    paid: number;
    /** % change vs the previous period of the same length (null: no comparison). */
    revenueChange: number | null;
    paidChange: number | null;
    avgOrder: number | null;
    /** paid ÷ all attempts. */
    conversion: number | null;
    attempts: number;
    /** ₹ and count of unpaid attempts (failed + pending + cancelled). */
    recoveryAmount: number;
    recoveryCount: number;
    refunded: number;
    refundedAmount: number;
    notDownloaded: number;
  };
  dropOff: { cancelled: number; failed: number; pending: number };
  /** Rows per status tab (for the tab labels). */
  tabCounts: Record<OrderStatusFilter, number>;
  rows: OrderRow[];
  /** true when more rows matched than are shown. */
  truncated: boolean;
  /** When this was read (the page shows "updated …"). */
  readAt: string;
}

const ROW_LIMIT = 200;
export const EXPORT_LIMIT = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOrderFilters(params: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) ?? "";
  const rawPeriod = PERIOD_ALIASES[one("period")] ?? one("period");
  const rawStatus = STATUS_ALIASES[one("status")] ?? one("status");
  const period = ORDER_PERIODS.find((p) => p === rawPeriod) ?? "all";
  const status = ORDER_STATUSES.find((s) => s === rawStatus) ?? "all";
  const from = DATE_RE.test(one("from")) ? one("from") : "";
  const to = DATE_RE.test(one("to")) ? one("to") : "";
  return {
    period,
    from,
    to,
    status,
    q: one("q").trim().slice(0, 80),
    includeTest: one("test") === "1",
  };
}

/** Midnight IST of a YYYY-MM-DD date, as epoch ms. */
const istMidnight = (date: string) => Date.parse(`${date}T00:00:00+05:30`);

/** [start, end) of the chosen period and of the one before it (same length), epoch ms. */
function periodRange(f: ReturnType<typeof parseOrderFilters>, now: number) {
  const today = startOfTodayIst(now);
  if (f.period === "today") return { start: today, end: now, prevStart: today - DAY_MS, prevEnd: now - DAY_MS };
  const days = PERIOD_DAYS[f.period];
  if (days) return { start: now - days * DAY_MS, end: now, prevStart: now - 2 * days * DAY_MS, prevEnd: now - days * DAY_MS };
  if (f.period === "custom" && (f.from || f.to)) {
    const start = f.from ? istMidnight(f.from) : Date.parse(SALES_START);
    const end = f.to ? istMidnight(f.to) + DAY_MS : now;
    return { start, end, prevStart: start - (end - start), prevEnd: start };
  }
  return { start: null, end: null, prevStart: null, prevEnd: null };
}

const change = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);

type SummaryRow = Pick<OrderRow, "status" | "amount" | "download_count" | "refunded_amount" | "checkout_closed_at">;

/** Admin-only: the Orders page (KPIs, drop-off, tabs, list). `rowLimit` is raised for the CSV export. */
export async function getOrdersView(filters: ReturnType<typeof parseOrderFilters>, rowLimit = ROW_LIMIT): Promise<OrdersView> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const range = periodRange(filters, now);
  // Test orders (before live payments) stay out unless asked for.
  const floorMs = filters.includeTest ? null : Date.parse(SALES_START);
  const iso = (ms: number) => new Date(ms).toISOString();
  const lower = (ms: number | null) => {
    const v = [ms, floorMs].filter((x): x is number => x !== null);
    return v.length ? iso(Math.max(...v)) : null;
  };
  const start = lower(range.start);
  const end = range.end !== null ? iso(range.end) : null;

  const COLUMNS =
    "id, product_id, amount, locale, status, created_at, paid_at, download_count, whatsapp_sends, buyer_contact, razorpay_payment_id, whatsapp_number, refunded_amount, refund_status, checkout_closed_at, name";
  const SUMMARY = "status, amount, download_count, refunded_amount, checkout_closed_at";

  let summary = admin.from("orders").select(SUMMARY).limit(50000);
  if (start) summary = summary.gte("created_at", start);
  if (end) summary = summary.lt("created_at", end);

  let previous = null;
  if (range.prevStart !== null && range.prevEnd !== null) {
    const prevStart = lower(range.prevStart)!;
    const prevEnd = iso(range.prevEnd);
    previous = prevStart < prevEnd
      ? admin.from("orders").select("status, amount, refunded_amount").gte("created_at", prevStart).lt("created_at", prevEnd).limit(50000)
      : null;
  }

  let list = admin.from("orders").select(COLUMNS).order("created_at", { ascending: false }).limit(rowLimit + 1);
  if (start) list = list.gte("created_at", start);
  if (end) list = list.lt("created_at", end);
  if (filters.status === "notdownloaded") list = list.eq("status", "paid").eq("download_count", 0);
  else if (filters.status === "refunded") list = list.gt("refunded_amount", 0);
  else if (filters.status === "pending") list = list.eq("status", "created").is("checkout_closed_at", null);
  else if (filters.status === "cancelled") list = list.eq("status", "created").not("checkout_closed_at", "is", null);
  else if (filters.status !== "all") list = list.eq("status", filters.status);
  if (filters.q) {
    const term = filters.q.replace(/^#/, "").replace(/[^0-9a-zA-Z_+-]/g, "");
    // Phones are stored as 10 digits: "+91 98765 43210" → "9876543210".
    const digits = term.replace(/\D/g, "");
    const phone = digits.length > 10 ? digits.slice(-10) : digits;
    if (UUID_RE.test(term)) list = list.eq("id", term);
    else if (/^pay_/i.test(term)) list = list.ilike("razorpay_payment_id", `%${term}%`);
    else if (/^[0-9a-f]{4,8}$/i.test(term) && /[a-f]/i.test(term)) {
      // Short order number (#3F9A2C): ids starting with it, as a uuid range.
      const hex = term.toLowerCase();
      const pad = (c: string) => (hex + c.repeat(32)).slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
      list = list.gte("id", pad("0")).lte("id", pad("f"));
    } else if (phone.length >= 3) list = list.or(`buyer_contact.ilike.%${phone}%,whatsapp_number.ilike.%${phone}%`);
    else if (/\p{L}{2,}/u.test(filters.q)) {
      // Buyer name (Marathi / Hindi / English), from the Buy popup.
      const name = filters.q.replace(/[%_*,()"\\]/g, " ").replace(/\s+/g, " ").trim();
      list = list.ilike("name", `%${name}%`);
    } else if (term) list = list.ilike("razorpay_payment_id", `%${term}%`);
  }

  const [summaryRes, previousRes, listRes] = await Promise.all([summary, previous, list]);
  if (summaryRes.error) throw new Error(summaryRes.error.message);
  if (previousRes?.error) throw new Error(previousRes.error.message);
  if (listRes.error) throw new Error(listRes.error.message);

  const s = (summaryRes.data ?? []) as SummaryRow[];
  const net = (r: Pick<SummaryRow, "amount" | "refunded_amount">) => Number(r.amount || 0) - Number(r.refunded_amount || 0);
  const paid = s.filter((r) => r.status === "paid");
  const revenue = paid.reduce((sum, r) => sum + net(r), 0);
  const unpaid = s.filter((r) => r.status !== "paid");
  const dropOff = { cancelled: 0, failed: 0, pending: 0 };
  for (const r of unpaid) dropOff[dropOffKind(r) ?? "pending"] += 1;

  const prev = previousRes ? ((previousRes.data ?? []) as Array<Pick<SummaryRow, "status" | "amount" | "refunded_amount">>) : null;
  const prevPaid = prev?.filter((r) => r.status === "paid") ?? [];
  const refundedRows = paid.filter((r) => Number(r.refunded_amount || 0) > 0);
  const notDownloaded = paid.filter((r) => !r.download_count).length;

  const rows = (listRes.data ?? []) as OrderRow[];
  return {
    ...filters,
    kpis: {
      revenue,
      paid: paid.length,
      revenueChange: prev ? change(revenue, prevPaid.reduce((sum, r) => sum + net(r), 0)) : null,
      paidChange: prev ? change(paid.length, prevPaid.length) : null,
      avgOrder: paid.length ? Math.round(revenue / paid.length) : null,
      conversion: s.length ? paid.length / s.length : null,
      attempts: s.length,
      recoveryAmount: unpaid.reduce((sum, r) => sum + Number(r.amount || 0), 0),
      recoveryCount: unpaid.length,
      refunded: refundedRows.length,
      refundedAmount: refundedRows.reduce((sum, r) => sum + Number(r.refunded_amount || 0), 0),
      notDownloaded,
    },
    dropOff,
    tabCounts: {
      all: s.length,
      paid: paid.length,
      pending: dropOff.pending,
      failed: dropOff.failed,
      cancelled: dropOff.cancelled,
      refunded: refundedRows.length,
      notdownloaded: notDownloaded,
    },
    rows: rows.slice(0, rowLimit),
    truncated: rows.length > rowLimit,
    readAt: new Date(now).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// One order, everything about it (admin order detail page).
// ---------------------------------------------------------------------------

export interface OrderDetail extends OrderRow {
  name: string | null;
  buyer_email: string | null;
  razorpay_order_id: string | null;
  last_downloaded_at: string | null;
  reminder_sent_at: string | null;
  /** Reminders sent in the sequence (migration 013, up to 4). */
  reminder_count?: number | null;
  reminder_last_at?: string | null;
  refunded_at: string | null;
  razorpay_refund_id: string | null;
  delivered: boolean | null;
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  await requireAdmin();
  if (!UUID_RE.test(orderId)) return null;
  const { data, error } = await getSupabaseAdmin().from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OrderDetail | null) ?? null;
}

// ---------------------------------------------------------------------------
// Interested buyers (leads, migration 009) for /dashboard/leads.
// ---------------------------------------------------------------------------

export interface LeadView {
  id: string;
  created_at: string;
  phone: string;
  product_id: number | null;
  locale: string;
  source: "cancelled" | "failed" | "checkout";
  consent_at: string;
  followup_sent_at: string | null;
  opted_out_at: string | null;
  /** A paid order from this phone after the sign-up. */
  boughtLater: boolean;
}

export async function getLeadsView(): Promise<{ leads: LeadView[]; total: number; active: number; bought: number; followups: number; optedOut: number }> {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("leads")
    .select("id, created_at, phone, product_id, locale, source, consent_at, followup_sent_at, opted_out_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Omit<LeadView, "boughtLater">[];

  // Paid orders from these phones (in chunks — URL length).
  const paidByPhone = new Map<string, string[]>();
  const phones = [...new Set(rows.map((r) => r.phone))];
  for (let i = 0; i < phones.length; i += 200) {
    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("buyer_contact, created_at")
      .eq("status", "paid")
      .in("buyer_contact", phones.slice(i, i + 200));
    if (ordersError) throw new Error(ordersError.message);
    for (const o of (orders ?? []) as Array<{ buyer_contact: string; created_at: string }>) {
      paidByPhone.set(o.buyer_contact, [...(paidByPhone.get(o.buyer_contact) ?? []), o.created_at]);
    }
  }
  const leads = rows.map((r) => ({ ...r, boughtLater: (paidByPhone.get(r.phone) ?? []).some((at) => at >= r.created_at) }));
  return {
    leads,
    total: leads.length,
    active: leads.filter((l) => !l.opted_out_at).length,
    bought: leads.filter((l) => l.boughtLater).length,
    followups: leads.filter((l) => l.followup_sent_at).length,
    optedOut: leads.filter((l) => l.opted_out_at).length,
  };
}
