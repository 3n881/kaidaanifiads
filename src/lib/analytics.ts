import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "./supabase/server";
import { requireAdmin } from "./auth";
import { failureLabel } from "./payment-failure";
import { ADMIN_DATA_TAG, SALES_START, parseOrderFilters, periodRange } from "./sales";

// ---------------------------------------------------------------------------
// Dashboard → Analytics: everything we can learn from data we already keep
// (orders, the WhatsApp record, products). Read once per request (cached 30 s
// like the other admin pages) and summed up here, so the page only draws.
// Live payments only (from SALES_START). "Lost sale" = one buyer + one book
// that wasn't paid in the period, however many times they tried — so retries
// don't inflate it.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDate = (ms: number) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
const istHour = (ms: number) => new Date(ms + IST_OFFSET_MS).getUTCHours();
/** 0 = Monday … 6 = Sunday, in India. */
const istWeekday = (ms: number) => (new Date(ms + IST_OFFSET_MS).getUTCDay() + 6) % 7;

/** Meta's ad-click cookie is saved at checkout from 16 Oct 12:12 IST (migration 010 + token). */
export const AD_DATA_START = "2026-10-16T06:42:00Z";
/** The WhatsApp record (migration 014) starts 18 Oct evening. */
export const WHATSAPP_LOG_START = "2026-10-18T12:00:00Z";

type OrderRow = {
  id: string;
  product_id: number | null;
  amount: number;
  locale: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  buyer_contact: string | null;
  whatsapp_number: string | null;
  refunded_amount: number | null;
  checkout_closed_at: string | null;
  download_count: number | null;
  whatsapp_sends: number | null;
  reminder_count: number | null;
  failure_reason: string | null;
  failure_description: string | null;
  failure_method: string | null;
  meta_fbc: string | null;
};
type LogRow = { order_id: string | null; kind: string; ok: boolean; created_at: string };
type ProductRow = { id: number; is_combo: boolean; title: string | null; title_mr: string | null };

export type Counted = Array<[label: string, count: number]>;
export type DropKind = "failed" | "cancelled" | "pending";

export interface Analytics {
  readAt: string;
  period: { start: string | null; end: string; previousDays: number | null };
  money: {
    revenue: number;
    paid: number;
    attempts: number;
    tries: number;
    avgOrder: number | null;
    conversion: number | null;
    refunds: number;
    refundedAmount: number;
    revenueChange: number | null;
    paidChange: number | null;
    conversionChange: number | null;
  };
  /** One entry per IST day of the period (at least the last 7 days), oldest first. */
  daily: Array<{ date: string; paid: number; revenue: number; tries: number }>;
  lost: {
    sales: number;
    value: number;
    byKind: Record<DropKind, { sales: number; recovered: number }>;
    recovered: number;
    recoveredValue: number;
    otherBook: number;
    stillLost: number;
    stillLostValue: number;
    /** Median minutes from the first unpaid try to paying (recovered ones). */
    medianMinutesBack: number | null;
    /** Lost sales with a WhatsApp number: reminded vs not. */
    reminded: { sales: number; recovered: number; value: number };
    notReminded: { sales: number; recovered: number };
  };
  failures: { total: number; reasons: Counted; methods: Counted };
  books: Array<{ productId: number; tries: number; paid: number; revenue: number; conversion: number | null; lowConversion: boolean }>;
  languages: Array<{ locale: string; paid: number; revenue: number }>;
  kinds: { combo: { paid: number; revenue: number }; single: { paid: number; revenue: number } };
  customers: {
    buyers: number;
    newBuyers: number;
    repeatBuyers: number;
    booksPerBuyer: number | null;
    /** All-time buyers with exactly one paid book: the audience for a second-book offer. */
    oneBookBuyers: number;
    allTimeBuyers: number;
    /** Books bought by the same person (all time), most common pairs first. */
    pairs: Array<{ a: number; b: number; buyers: number }>;
  };
  hours: Array<{ hour: number; paid: number; tries: number; failed: number }>;
  weekdays: Array<{ day: number; paid: number; tries: number }>;
  whatsapp: {
    since: string;
    sent: number;
    refused: number;
    pdf: { sent: number; refused: number };
    reminders: { sent: number; refused: number };
    paid: number;
    paidWithPdf: number;
    downloaded: number;
    /** The latest messages (any period) were all refused — likely the Interakt wallet. */
    refusingNow: boolean;
  };
  ads: { since: string; fromAds: { tries: number; paid: number; revenue: number }; other: { tries: number; paid: number; revenue: number } };
  insights: Array<{ tone: "good" | "bad" | "info"; text: string }>;
}

const buyerOf = (o: OrderRow) => (o.buyer_contact || o.whatsapp_number || "").replace(/\D/g, "").slice(-10) || null;
const net = (o: OrderRow) => Number(o.amount || 0) - Number(o.refunded_amount || 0);
const dropKind = (o: OrderRow): DropKind => (o.status === "failed" ? "failed" : o.checkout_closed_at ? "cancelled" : "pending");
const pctChange = (now: number, then: number) => (then > 0 ? ((now - then) / then) * 100 : null);
const ms = (iso: string) => Date.parse(iso);

function countBy<T>(items: T[], key: (t: T) => string): Counted {
  const map = new Map<string, number>();
  for (const t of items) map.set(key(t), (map.get(key(t)) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/** Tries = distinct buyer + book pairs (a buyer without a number counts per attempt). */
function tries(rows: OrderRow[]): number {
  return new Set(rows.map((o) => `${buyerOf(o) ?? o.id}|${o.product_id}`)).size;
}

export async function getAnalytics(filters: ReturnType<typeof parseOrderFilters>): Promise<Analytics> {
  await requireAdmin();
  return cachedAnalytics(filters.period, filters.from, filters.to);
}

const cachedAnalytics = unstable_cache(
  (period: string, from: string, to: string) =>
    computeAnalytics(parseOrderFilters({ period, from, to })),
  ["admin-analytics-v1"],
  { revalidate: 30, tags: [ADMIN_DATA_TAG] },
);

async function computeAnalytics(filters: ReturnType<typeof parseOrderFilters>): Promise<Analytics> {
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const [ordersRes, logRes, productsRes] = await Promise.all([
    admin
      .from("orders")
      .select(
        "id, product_id, amount, locale, status, created_at, paid_at, buyer_contact, whatsapp_number, refunded_amount, checkout_closed_at, download_count, whatsapp_sends, reminder_count, failure_reason, failure_description, failure_method, meta_fbc",
      )
      .gte("created_at", SALES_START)
      .order("created_at", { ascending: true })
      .limit(50000),
    admin.from("whatsapp_log").select("order_id, kind, ok, created_at").order("created_at", { ascending: true }).limit(50000),
    admin.from("products").select("id, is_combo, title, title_mr"),
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  const all = (ordersRes.data ?? []) as OrderRow[];
  // The WhatsApp record is optional (migration 014): without it those numbers stay empty.
  const log = (logRes.error ? [] : logRes.data ?? []) as LogRow[];
  const products = (productsRes.data ?? []) as ProductRow[];
  const isCombo = new Map(products.map((p) => [p.id, p.is_combo]));

  // Period [start, end) and the one before it.
  const range = periodRange(filters, now);
  const floor = ms(SALES_START);
  const start = Math.max(range.start ?? floor, floor);
  const end = range.end ?? now;
  const inRange = (iso: string, a: number, b: number) => ms(iso) >= a && ms(iso) < b;
  const rows = all.filter((o) => inRange(o.created_at, start, end));
  const prevStart = range.prevStart !== null ? Math.max(range.prevStart, floor) : null;
  const prev = prevStart !== null && range.prevEnd !== null && prevStart < range.prevEnd ? all.filter((o) => inRange(o.created_at, prevStart, range.prevEnd!)) : null;

  // ---- money
  const paidRows = rows.filter((o) => o.status === "paid");
  const revenue = paidRows.reduce((s, o) => s + net(o), 0);
  const triesNow = tries(rows);
  const conversion = triesNow ? paidRows.length / triesNow : null;
  const prevPaid = prev?.filter((o) => o.status === "paid") ?? null;
  const prevRevenue = prevPaid?.reduce((s, o) => s + net(o), 0) ?? 0;
  const prevConversion = prev && tries(prev) ? prevPaid!.length / tries(prev) : null;
  const money: Analytics["money"] = {
    revenue,
    paid: paidRows.length,
    attempts: rows.length,
    tries: triesNow,
    avgOrder: paidRows.length ? Math.round(revenue / paidRows.length) : null,
    conversion,
    refunds: paidRows.filter((o) => Number(o.refunded_amount || 0) > 0).length,
    refundedAmount: paidRows.reduce((s, o) => s + Number(o.refunded_amount || 0), 0),
    revenueChange: prevPaid ? pctChange(revenue, prevRevenue) : null,
    paidChange: prevPaid ? pctChange(paidRows.length, prevPaid.length) : null,
    conversionChange: conversion !== null && prevConversion ? (conversion - prevConversion) * 100 : null,
  };

  // ---- daily (at least 7 days, at most the last 120)
  const dayStart = Math.min(start, now - 6 * DAY_MS);
  const days: string[] = [];
  for (let t = dayStart; istDate(t) <= istDate(end - 1); t += DAY_MS) days.push(istDate(t));
  const dayList = [...new Set(days)].slice(-120);
  const daily = dayList.map((date) => {
    const of = all.filter((o) => istDate(ms(o.created_at)) === date);
    const paid = of.filter((o) => o.status === "paid");
    return { date, paid: paid.length, revenue: paid.reduce((s, o) => s + net(o), 0), tries: tries(of) };
  });

  // ---- lost sales & recovery
  const unpaid = rows.filter((o) => o.status !== "paid");
  const groups = new Map<string, OrderRow[]>();
  for (const o of unpaid) {
    const key = `${buyerOf(o) ?? o.id}|${o.product_id}`;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const paidAll = all.filter((o) => o.status === "paid");
  const remindedOrders = new Set(log.filter((l) => l.ok && l.kind !== "pdf" && l.order_id).map((l) => l.order_id!));
  const byKind: Analytics["lost"]["byKind"] = { failed: { sales: 0, recovered: 0 }, cancelled: { sales: 0, recovered: 0 }, pending: { sales: 0, recovered: 0 } };
  let lostValue = 0, stillLostValue = 0, recovered = 0, recoveredValue = 0, otherBook = 0;
  const minutesBack: number[] = [];
  const reminded = { sales: 0, recovered: 0, value: 0 };
  const notReminded = { sales: 0, recovered: 0 };
  for (const list of groups.values()) {
    const first = list[0];
    const last = list[list.length - 1];
    const buyer = buyerOf(first);
    const kind = dropKind(last);
    lostValue += Number(last.amount || 0);
    byKind[kind].sales++;
    const paidLater = buyer
      ? paidAll.find((p) => buyerOf(p) === buyer && p.product_id === first.product_id && ms(p.created_at) > ms(first.created_at))
      : undefined;
    const wasReminded = list.some((o) => (o.reminder_count ?? 0) > 0 || remindedOrders.has(o.id));
    if (paidLater) {
      recovered++;
      recoveredValue += net(paidLater);
      byKind[kind].recovered++;
      minutesBack.push((ms(paidLater.paid_at ?? paidLater.created_at) - ms(first.created_at)) / 60000);
    } else {
      stillLostValue += Number(last.amount || 0);
    }
    if (!paidLater && buyer && paidAll.some((p) => buyerOf(p) === buyer && ms(p.created_at) > ms(first.created_at))) {
      otherBook++;
    }
    if (buyer && /^[6-9]\d{9}$/.test(buyer)) {
      const bucket = wasReminded ? reminded : notReminded;
      bucket.sales++;
      if (paidLater) {
        bucket.recovered++;
        if (wasReminded) reminded.value += net(paidLater);
      }
    }
  }
  minutesBack.sort((a, b) => a - b);
  const lost: Analytics["lost"] = {
    sales: groups.size,
    value: lostValue,
    byKind,
    recovered,
    recoveredValue,
    otherBook,
    stillLost: groups.size - recovered,
    stillLostValue,
    medianMinutesBack: minutesBack.length ? Math.round(minutesBack[Math.floor(minutesBack.length / 2)]) : null,
    reminded,
    notReminded,
  };

  // ---- why payments failed
  const failedRows = rows.filter((o) => o.status === "failed");
  const failures: Analytics["failures"] = {
    total: failedRows.length,
    reasons: countBy(failedRows, (o) => failureLabel(o) ?? "Not known yet"),
    methods: countBy(failedRows.filter((o) => o.failure_method), (o) => o.failure_method!),
  };

  // ---- books, languages, combo vs single
  const productIds = [...new Set(rows.map((o) => o.product_id).filter((id): id is number => id !== null))];
  const booksRaw = productIds.map((productId) => {
    const of = rows.filter((o) => o.product_id === productId);
    const paid = of.filter((o) => o.status === "paid");
    const t = tries(of);
    return { productId, tries: t, paid: paid.length, revenue: paid.reduce((s, o) => s + net(o), 0), conversion: t ? paid.length / t : null };
  });
  const books = booksRaw
    .map((b) => ({ ...b, lowConversion: b.tries >= 5 && conversion !== null && b.conversion !== null && b.conversion <= conversion / 2 }))
    .sort((a, b) => b.revenue - a.revenue || b.tries - a.tries);
  const languages = ["mr", "hi", "en"]
    .map((locale) => {
      const paid = paidRows.filter((o) => (o.locale ?? "mr") === locale);
      return { locale, paid: paid.length, revenue: paid.reduce((s, o) => s + net(o), 0) };
    })
    .filter((l) => l.paid > 0);
  const kindSum = (combo: boolean) => {
    const paid = paidRows.filter((o) => o.product_id !== null && Boolean(isCombo.get(o.product_id)) === combo);
    return { paid: paid.length, revenue: paid.reduce((s, o) => s + net(o), 0) };
  };

  // ---- customers
  const buyersNow = new Set(paidRows.map(buyerOf).filter((b): b is string => Boolean(b)));
  const paidCount = new Map<string, number>();
  const firstPaid = new Map<string, number>();
  const owns = new Map<string, Set<number>>();
  for (const p of paidAll) {
    const b = buyerOf(p);
    if (!b) continue;
    paidCount.set(b, (paidCount.get(b) ?? 0) + 1);
    firstPaid.set(b, Math.min(firstPaid.get(b) ?? Infinity, ms(p.created_at)));
    if (p.product_id !== null) owns.set(b, (owns.get(b) ?? new Set()).add(p.product_id));
  }
  const pairCount = new Map<string, number>();
  for (const set of owns.values()) {
    const ids = [...set].sort((x, y) => x - y);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const key = `${ids[i]}|${ids[j]}`;
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    }
  }
  const pairs = [...pairCount.entries()]
    .map(([key, buyers]) => {
      const [a, b] = key.split("|").map(Number);
      return { a, b, buyers };
    })
    .sort((x, y) => y.buyers - x.buyers)
    .slice(0, 5);
  const customers: Analytics["customers"] = {
    buyers: buyersNow.size,
    newBuyers: [...buyersNow].filter((b) => (firstPaid.get(b) ?? 0) >= start).length,
    repeatBuyers: [...buyersNow].filter((b) => (paidCount.get(b) ?? 0) >= 2).length,
    booksPerBuyer: buyersNow.size ? paidRows.filter((o) => buyerOf(o)).length / buyersNow.size : null,
    oneBookBuyers: [...owns.values()].filter((s) => s.size === 1).length,
    allTimeBuyers: owns.size,
    pairs,
  };

  // ---- timing (when people try and buy)
  const hours = Array.from({ length: 24 }, (_, hour) => {
    const of = rows.filter((o) => istHour(ms(o.created_at)) === hour);
    return { hour, paid: of.filter((o) => o.status === "paid").length, tries: tries(of), failed: of.filter((o) => o.status === "failed").length };
  });
  const weekdays = Array.from({ length: 7 }, (_, day) => {
    const of = rows.filter((o) => istWeekday(ms(o.created_at)) === day);
    return { day, paid: of.filter((o) => o.status === "paid").length, tries: tries(of) };
  });

  // ---- WhatsApp
  const logNow = log.filter((l) => inRange(l.created_at, start, end));
  const latest = log.slice(-3);
  const whatsapp: Analytics["whatsapp"] = {
    since: WHATSAPP_LOG_START,
    sent: logNow.filter((l) => l.ok).length,
    refused: logNow.filter((l) => !l.ok).length,
    pdf: { sent: logNow.filter((l) => l.ok && l.kind === "pdf").length, refused: logNow.filter((l) => !l.ok && l.kind === "pdf").length },
    reminders: {
      sent: logNow.filter((l) => l.ok && l.kind.startsWith("reminder")).length,
      refused: logNow.filter((l) => !l.ok && l.kind.startsWith("reminder")).length,
    },
    paid: paidRows.length,
    paidWithPdf: paidRows.filter((o) => (o.whatsapp_sends ?? 0) > 0).length,
    downloaded: paidRows.filter((o) => (o.download_count ?? 0) > 0).length,
    refusingNow: latest.length === 3 && latest.every((l) => !l.ok) && now - ms(latest[2].created_at) < 12 * 60 * 60 * 1000,
  };

  // ---- Meta ads (orders that came from an ad click carry Meta's fbc cookie)
  const adRows = rows.filter((o) => ms(o.created_at) >= ms(AD_DATA_START));
  const adPart = (list: OrderRow[]) => {
    const paid = list.filter((o) => o.status === "paid");
    return { tries: tries(list), paid: paid.length, revenue: paid.reduce((s, o) => s + net(o), 0) };
  };
  const ads: Analytics["ads"] = {
    since: AD_DATA_START,
    fromAds: adPart(adRows.filter((o) => o.meta_fbc)),
    other: adPart(adRows.filter((o) => !o.meta_fbc)),
  };

  return {
    readAt: new Date(now).toISOString(),
    period: { start: new Date(start).toISOString(), end: new Date(end).toISOString(), previousDays: prev ? Math.round((end - start) / DAY_MS) : null },
    money,
    daily,
    lost,
    failures,
    books,
    languages,
    kinds: { combo: kindSum(true), single: kindSum(false) },
    customers,
    hours,
    weekdays,
    whatsapp,
    ads,
    insights: buildInsights({ money, lost, failures, books, hours, whatsapp, ads }, (id) => {
      const p = products.find((x) => x.id === id);
      return p?.title_mr || p?.title || `#${id}`;
    }),
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`;

/** Plain-language findings for the top of the page, most urgent first. */
function buildInsights(
  a: Pick<Analytics, "money" | "lost" | "failures" | "books" | "hours" | "whatsapp" | "ads">,
  title: (productId: number) => string,
): Analytics["insights"] {
  const out: Analytics["insights"] = [];
  if (a.whatsapp.refusingNow) {
    out.push({ tone: "bad", text: "WhatsApp is refusing messages right now — check the Interakt wallet balance, then use “Send all again” on the WhatsApp page." });
  }
  if (a.money.revenueChange !== null) {
    const up = a.money.revenueChange >= 0;
    out.push({ tone: up ? "good" : "bad", text: `Revenue is ${up ? "up" : "down"} ${Math.abs(Math.round(a.money.revenueChange))}% compared with the period before.` });
  }
  if (a.failures.total >= 3 && a.failures.reasons[0]) {
    const [label, n] = a.failures.reasons[0];
    const share = n / a.failures.total;
    if (label !== "Not known yet" && share >= 0.4) {
      out.push({
        tone: "info",
        text:
          label === "Payment timed out"
            ? `${pct(share)} of failed payments timed out: the buyer didn't approve in the UPI app in time. Not a site problem — the WhatsApp reminder is what brings them back.`
            : `Most failed payments (${pct(share)}): ${label}.`,
      });
    }
  }
  if (a.lost.sales > 0) {
    out.push({
      tone: a.lost.recovered > 0 ? "good" : "info",
      text: `${a.lost.recovered} of ${a.lost.sales} lost sales came back and paid later (${inr(a.lost.recoveredValue)}). ${inr(a.lost.stillLostValue)} is still unpaid.`,
    });
  }
  const r = a.lost.reminded;
  const n = a.lost.notReminded;
  if (r.sales >= 5 && n.sales >= 5) {
    const withRate = r.recovered / r.sales;
    const withoutRate = n.recovered / n.sales;
    out.push({
      tone: withRate > withoutRate ? "good" : "info",
      text: `Buyers who got a WhatsApp reminder came back ${pct(withRate)} of the time, against ${pct(withoutRate)} without one.`,
    });
  }
  const bestHours = [...a.hours].sort((x, y) => y.paid - x.paid).filter((h) => h.paid > 0).slice(0, 3);
  if (bestHours.length >= 2 && a.money.paid >= 10) {
    out.push({ tone: "info", text: `Most sales come around ${bestHours.map((h) => hourLabel(h.hour)).join(", ")} — good times to run ads.` });
  }
  const low = a.books.find((b) => b.lowConversion);
  if (low) {
    out.push({ tone: "bad", text: `“${title(low.productId)}”: ${low.tries} people tried, only ${low.paid} paid — check its price, cover and description.` });
  }
  const ad = a.ads.fromAds;
  const totalPaid = ad.paid + a.ads.other.paid;
  if (totalPaid >= 5) {
    out.push({ tone: "info", text: `${pct(ad.paid / totalPaid)} of sales come from Meta ad clicks (${inr(ad.revenue)}).` });
  }
  return out;
}
