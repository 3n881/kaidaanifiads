import "server-only";
import crypto from "crypto";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { fetchAll } from "./supabase/fetch-all";
import { fetchOrderPayments, isRazorpayConfigured } from "./razorpay";
import { requireAdmin } from "./auth";
import type { PrintAddress } from "./print-address";
import type { PrintPayment } from "./print-copy";

// ---------------------------------------------------------------------------
// Printed-book orders (migration 018, client 26 Nov). Separate from e-book
// `orders`: online ₹399 via Razorpay, or Cash on Delivery ₹449. The admin
// moves each order New → Confirmed (COD) → Shipped → Delivered.
// ---------------------------------------------------------------------------

export const PRINT_STATUSES = ["pending_payment", "paid", "failed", "cod_pending", "confirmed", "shipped", "delivered", "cancelled", "returned"] as const;
export type PrintStatus = (typeof PRINT_STATUSES)[number];

export interface PrintOrder extends PrintAddress {
  id: string;
  order_no: string;
  created_at: string;
  updated_at: string;
  product_id: number | null;
  product_title: string;
  locale: string;
  payment_mode: PrintPayment;
  amount: number;
  status: PrintStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  courier: string | null;
  tracking_no: string | null;
  admin_note: string | null;
  utm_campaign: string | null;
  from_ad: boolean;
}

/** Short number shown to the buyer and the admin: P-7F3A21. */
function newOrderNo(): string {
  return `P-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Saves a new order (retries the short number on the rare clash). */
export async function createPrintOrder(input: {
  productId: number;
  productTitle: string;
  locale: string;
  payment: PrintPayment;
  amount: number;
  address: PrintAddress;
  visit?: Record<string, unknown> | null;
}): Promise<{ id: string; orderNo: string }> {
  const admin = getSupabaseAdmin();
  const { address: a } = input;
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNo = newOrderNo();
    const { data, error } = await admin
      .from("print_orders")
      .insert({
        order_no: orderNo,
        product_id: input.productId,
        product_title: input.productTitle,
        locale: input.locale,
        payment_mode: input.payment,
        amount: input.amount,
        status: input.payment === "cod" ? "cod_pending" : "pending_payment",
        name: a.name,
        phone: a.phone,
        house: a.house,
        area: a.area,
        landmark: a.landmark || null,
        pincode: a.pincode,
        city: a.city,
        district: a.district,
        state: a.state,
        ...(input.visit ?? {}),
      })
      .select("id")
      .single();
    if (!error && data) return { id: data.id as string, orderNo };
    if (error?.code !== "23505") throw new DatabaseUnavailableError("create print order", error ?? new Error("no row"));
  }
  throw new Error("could not pick an order number");
}

export async function setPrintRazorpayOrder(id: string, razorpayOrderId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("print_orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", id);
  if (error) throw new DatabaseUnavailableError("save print razorpay order", error);
}

/**
 * Online payment captured → paid. Idempotent (confirm, webhook and the 10-min
 * check may all call it); a failed attempt that is later paid becomes paid.
 * Returns the order when this call or an earlier one marked it paid.
 */
export async function markPrintOrderPaid(opts: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise?: number;
}): Promise<{ id: string; orderNo: string } | null> {
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("print_orders")
    .select("id, order_no, amount, status")
    .eq("razorpay_order_id", opts.razorpayOrderId)
    .maybeSingle();
  if (error) throw new DatabaseUnavailableError("print order lookup", error);
  if (!order) return null;
  if (opts.amountPaise !== undefined && opts.amountPaise !== order.amount * 100) {
    console.error("[print] amount mismatch", order.order_no, opts.amountPaise);
    return null;
  }
  if (order.status === "pending_payment" || order.status === "failed") {
    const { error: updateError } = await admin
      .from("print_orders")
      .update({ status: "paid", razorpay_payment_id: opts.razorpayPaymentId, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .in("status", ["pending_payment", "failed"]);
    if (updateError) throw new DatabaseUnavailableError("mark print order paid", updateError);
    console.error("[print] paid", order.order_no);
  }
  return { id: order.id, orderNo: order.order_no };
}

/** Razorpay reported a failed attempt (the buyer can still retry and pay). */
export async function markPrintOrderFailed(razorpayOrderId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("print_orders")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "pending_payment")
    .select("id");
  if (error) throw new DatabaseUnavailableError("mark print order failed", error);
  return (data ?? []).length > 0;
}

/** Is this Razorpay order a printed-book order? (webhook routing) */
export async function isPrintRazorpayOrder(razorpayOrderId: string): Promise<boolean> {
  const { count, error } = await getSupabaseAdmin()
    .from("print_orders")
    .select("id", { count: "exact", head: true })
    .eq("razorpay_order_id", razorpayOrderId);
  // Migration 018 not applied yet → not a print order.
  if (error) return false;
  return (count ?? 0) > 0;
}

/** 10-min cron: online orders of the last 48 h that Razorpay captured but we never recorded. */
export async function reconcilePrintOrders(hours = 48): Promise<{ pending: number; recovered: number }> {
  if (!isRazorpayConfigured) return { pending: 0, recovered: 0 };
  const { data, error } = await getSupabaseAdmin()
    .from("print_orders")
    .select("razorpay_order_id, amount")
    .in("status", ["pending_payment", "failed"])
    .not("razorpay_order_id", "is", null)
    .gte("created_at", new Date(Date.now() - hours * 3600_000).toISOString())
    .limit(200);
  if (error) {
    if (error.code === "42P01") return { pending: 0, recovered: 0 }; // migration 018 not applied
    throw new DatabaseUnavailableError("print reconcile", error);
  }
  let recovered = 0;
  for (const row of (data ?? []) as Array<{ razorpay_order_id: string; amount: number }>) {
    try {
      const payments = await fetchOrderPayments(row.razorpay_order_id);
      const captured = payments.find((p) => p.status === "captured" && p.amount === row.amount * 100);
      if (captured && (await markPrintOrderPaid({ razorpayOrderId: row.razorpay_order_id, razorpayPaymentId: captured.id }))) recovered++;
    } catch (lookupError) {
      console.error("[print] reconcile lookup failed", String(lookupError));
    }
  }
  return { pending: (data ?? []).length, recovered };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const PRINT_TABS = ["todo", "all", "pending_payment", "cod_pending", "paid", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type PrintTab = (typeof PRINT_TABS)[number];
/** "To do" = waiting for the admin: paid online, or COD to confirm / confirmed, not yet shipped. */
const TODO: PrintStatus[] = ["paid", "cod_pending", "confirmed"];

export async function getPrintOrdersView(filters: { tab: PrintTab; q: string }) {
  await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await fetchAll<PrintOrder>(() =>
    admin.from("print_orders").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }),
  );
  if (error) {
    if (error.code === "42P01") return { ready: false as const };
    throw new Error(error.message);
  }
  const all = data;
  const counts = Object.fromEntries(PRINT_TABS.map((tab) => [tab, 0])) as Record<PrintTab, number>;
  for (const o of all) {
    counts.all++;
    if (TODO.includes(o.status)) counts.todo++;
    if (o.status === "returned") counts.cancelled++;
    else if ((PRINT_TABS as readonly string[]).includes(o.status)) counts[o.status as PrintTab]++;
  }
  const money = {
    // Money in = paid online + delivered COD (cash collected by the courier).
    collected: all.filter((o) => (o.payment_mode === "online" && o.paid_at && o.status !== "cancelled" && o.status !== "returned") || (o.payment_mode === "cod" && o.status === "delivered")).reduce((s, o) => s + o.amount, 0),
    codOpen: all.filter((o) => o.payment_mode === "cod" && ["cod_pending", "confirmed", "shipped"].includes(o.status)).reduce((s, o) => s + o.amount, 0),
  };
  const q = filters.q.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const rows = all
    .filter((o) => (filters.tab === "all" ? true : filters.tab === "todo" ? TODO.includes(o.status) : filters.tab === "cancelled" ? o.status === "cancelled" || o.status === "returned" : o.status === filters.tab))
    .filter((o) => !q || o.order_no.toLowerCase().includes(q.replace(/^#/, "")) || (digits.length >= 3 && o.phone.includes(digits)) || o.name.toLowerCase().includes(q) || o.pincode.includes(q));
  return { ready: true as const, rows, counts, money, total: all.length };
}

/** Admin: move an order along (with courier / tracking when shipping). */
export async function updatePrintOrder(id: string, change: { status?: PrintStatus; courier?: string; tracking?: string; note?: string }) {
  await requireAdmin();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (change.status) {
    patch.status = change.status;
    const stamp: Partial<Record<PrintStatus, string>> = { confirmed: "confirmed_at", shipped: "shipped_at", delivered: "delivered_at", cancelled: "cancelled_at", returned: "cancelled_at" };
    if (stamp[change.status]) patch[stamp[change.status]!] = now;
  }
  if (change.courier !== undefined) patch.courier = change.courier.trim().slice(0, 60) || null;
  if (change.tracking !== undefined) patch.tracking_no = change.tracking.trim().slice(0, 80) || null;
  if (change.note !== undefined) patch.admin_note = change.note.trim().slice(0, 500) || null;
  const { error } = await getSupabaseAdmin().from("print_orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
