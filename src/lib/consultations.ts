import "server-only";
import crypto from "crypto";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { fetchAll } from "./supabase/fetch-all";
import { fetchOrderPayments, isRazorpayConfigured } from "./razorpay";
import { requireAdmin } from "./auth";
import type { ConsultForm } from "./consult-form";

// ---------------------------------------------------------------------------
// Paid consultation bookings (migration 020, client 28 Nov): ₹999 online via
// Razorpay; the admin then fixes the time (Paid → Scheduled → Done).
// Same payment safety as e-books / printed books: signature-checked confirm,
// webhook routing, 10-min check.
// ---------------------------------------------------------------------------

export const CONSULT_STATUSES = ["pending_payment", "paid", "failed", "scheduled", "done", "cancelled", "refunded"] as const;
export type ConsultStatus = (typeof CONSULT_STATUSES)[number];

export interface ConsultBooking {
  id: string;
  booking_no: string;
  created_at: string;
  topic: string;
  product_id: number | null;
  locale: string;
  name: string;
  phone: string;
  district: string;
  description: string;
  preferred_date: string;
  preferred_slot: string;
  mode: string;
  language: string;
  amount: number;
  status: ConsultStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  scheduled_for: string | null;
  done_at: string | null;
  admin_note: string | null;
  utm_campaign: string | null;
  from_ad: boolean;
}

const newBookingNo = () => `C-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

export async function createConsultBooking(input: {
  form: ConsultForm;
  productId: number | null;
  locale: string;
  amount: number;
  visit?: Record<string, unknown> | null;
}): Promise<{ id: string; bookingNo: string }> {
  const admin = getSupabaseAdmin();
  const f = input.form;
  for (let attempt = 0; attempt < 3; attempt++) {
    const bookingNo = newBookingNo();
    const { data, error } = await admin
      .from("consultation_bookings")
      .insert({
        booking_no: bookingNo,
        topic: f.topic,
        product_id: input.productId,
        locale: input.locale,
        name: f.name,
        phone: f.phone,
        district: f.district,
        description: f.description,
        preferred_date: f.date,
        preferred_slot: f.slot,
        mode: f.mode,
        language: f.language,
        amount: input.amount,
        status: "pending_payment",
        ...(input.visit ?? {}),
      })
      .select("id")
      .single();
    if (!error && data) return { id: data.id as string, bookingNo };
    if (error?.code !== "23505") throw new DatabaseUnavailableError("create consultation", error ?? new Error("no row"));
  }
  throw new Error("could not pick a booking number");
}

export async function setConsultRazorpayOrder(id: string, razorpayOrderId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("consultation_bookings").update({ razorpay_order_id: razorpayOrderId }).eq("id", id);
  if (error) throw new DatabaseUnavailableError("save consultation razorpay order", error);
}

/** Payment captured → paid (idempotent; a failed attempt later paid becomes paid). */
export async function markConsultPaid(opts: { razorpayOrderId: string; razorpayPaymentId: string; amountPaise?: number }): Promise<{ id: string; bookingNo: string } | null> {
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin
    .from("consultation_bookings")
    .select("id, booking_no, amount, status")
    .eq("razorpay_order_id", opts.razorpayOrderId)
    .maybeSingle();
  if (error) throw new DatabaseUnavailableError("consultation lookup", error);
  if (!row) return null;
  if (opts.amountPaise !== undefined && opts.amountPaise !== row.amount * 100) {
    console.error("[consult] amount mismatch", row.booking_no, opts.amountPaise);
    return null;
  }
  if (row.status === "pending_payment" || row.status === "failed") {
    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("consultation_bookings")
      .update({ status: "paid", razorpay_payment_id: opts.razorpayPaymentId, paid_at: now, updated_at: now })
      .eq("id", row.id)
      .in("status", ["pending_payment", "failed"]);
    if (updateError) throw new DatabaseUnavailableError("mark consultation paid", updateError);
    console.error("[consult] paid", row.booking_no);
  }
  return { id: row.id, bookingNo: row.booking_no };
}

export async function markConsultFailed(razorpayOrderId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("consultation_bookings")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "pending_payment")
    .select("id");
  if (error) throw new DatabaseUnavailableError("mark consultation failed", error);
  return (data ?? []).length > 0;
}

/** Webhook routing: is this Razorpay order a consultation booking? */
export async function isConsultRazorpayOrder(razorpayOrderId: string): Promise<boolean> {
  const { count, error } = await getSupabaseAdmin()
    .from("consultation_bookings")
    .select("id", { count: "exact", head: true })
    .eq("razorpay_order_id", razorpayOrderId);
  if (error) return false; // migration 020 not applied → not a consultation
  return (count ?? 0) > 0;
}

/** 10-min cron: bookings of the last 48 h Razorpay captured but we never recorded. */
export async function reconcileConsultations(hours = 48): Promise<{ pending: number; recovered: number }> {
  if (!isRazorpayConfigured) return { pending: 0, recovered: 0 };
  const { data, error } = await getSupabaseAdmin()
    .from("consultation_bookings")
    .select("razorpay_order_id, amount")
    .in("status", ["pending_payment", "failed"])
    .not("razorpay_order_id", "is", null)
    .gte("created_at", new Date(Date.now() - hours * 3600_000).toISOString())
    .limit(200);
  if (error) {
    if (error.code === "42P01") return { pending: 0, recovered: 0 };
    throw new DatabaseUnavailableError("consultation reconcile", error);
  }
  let recovered = 0;
  for (const row of (data ?? []) as Array<{ razorpay_order_id: string; amount: number }>) {
    try {
      const payments = await fetchOrderPayments(row.razorpay_order_id);
      const captured = payments.find((p) => p.status === "captured" && p.amount === row.amount * 100);
      if (captured && (await markConsultPaid({ razorpayOrderId: row.razorpay_order_id, razorpayPaymentId: captured.id }))) recovered++;
    } catch (lookupError) {
      console.error("[consult] reconcile lookup failed", String(lookupError));
    }
  }
  return { pending: (data ?? []).length, recovered };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const CONSULT_TABS = ["todo", "all", "scheduled", "done", "pending_payment", "cancelled"] as const;
export type ConsultTab = (typeof CONSULT_TABS)[number];

export async function getConsultationsView(filters: { tab: ConsultTab; q: string }) {
  await requireAdmin();
  const { data, error } = await fetchAll<ConsultBooking>(() =>
    getSupabaseAdmin().from("consultation_bookings").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }),
  );
  if (error) {
    if (error.code === "42P01") return { ready: false as const };
    throw new Error(error.message);
  }
  const all = data;
  const inTab = (o: ConsultBooking, tab: ConsultTab) =>
    tab === "all" ? true
      : tab === "todo" ? o.status === "paid"
        : tab === "pending_payment" ? o.status === "pending_payment" || o.status === "failed"
          : tab === "cancelled" ? o.status === "cancelled" || o.status === "refunded"
            : o.status === tab;
  const counts = Object.fromEntries(CONSULT_TABS.map((tab) => [tab, all.filter((o) => inTab(o, tab)).length])) as Record<ConsultTab, number>;
  const paidStatuses: ConsultStatus[] = ["paid", "scheduled", "done"];
  const revenue = all.filter((o) => paidStatuses.includes(o.status)).reduce((s, o) => s + o.amount, 0);
  const q = filters.q.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const rows = all
    .filter((o) => inTab(o, filters.tab))
    .filter((o) => !q || o.booking_no.toLowerCase().includes(q.replace(/^#/, "")) || (digits.length >= 3 && o.phone.includes(digits)) || o.name.toLowerCase().includes(q) || o.district.toLowerCase().includes(q));
  return { ready: true as const, rows, counts, revenue, total: all.length };
}

/** Admin: schedule (date + time), mark done, cancel / refunded, notes. */
export async function updateConsultation(id: string, change: { status?: ConsultStatus; scheduledFor?: string | null; note?: string }) {
  await requireAdmin();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (change.status) {
    patch.status = change.status;
    if (change.status === "done") patch.done_at = now;
    if (change.status === "cancelled" || change.status === "refunded") patch.cancelled_at = now;
  }
  if (change.scheduledFor !== undefined) patch.scheduled_for = change.scheduledFor;
  if (change.note !== undefined) patch.admin_note = change.note.trim().slice(0, 1000) || null;
  const { error } = await getSupabaseAdmin().from("consultation_bookings").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
