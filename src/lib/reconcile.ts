import "server-only";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { fetchOrderPayments, isRazorpayConfigured, listPayments, type RazorpayPayment } from "./razorpay";
import { markOrderPaid, normalizePhone } from "./orders";
import { onOrderPaid } from "./delivery";

// ---------------------------------------------------------------------------
// Safety net for "paid at Razorpay, still `created` here" — e.g. Supabase was
// down when both /api/checkout/confirm and the webhook ran. Asks Razorpay
// directly instead of waiting for webhook retries. Idempotent (markOrderPaid).
// ---------------------------------------------------------------------------

interface PendingOrder {
  id: string;
  razorpay_order_id: string | null;
  amount: number;
}

function capturedFor(order: PendingOrder, payments: RazorpayPayment[]) {
  return payments.find(
    (p) =>
      p.status === "captured" &&
      p.order_id === order.razorpay_order_id &&
      p.amount === order.amount * 100,
  );
}

async function applyPayment(order: PendingOrder, payment: RazorpayPayment): Promise<boolean> {
  const result = await markOrderPaid({
    razorpayOrderId: order.razorpay_order_id!,
    razorpayPaymentId: payment.id,
    orderId: order.id,
  });
  if (!result) return false;
  if (payment.contact || payment.email) {
    await getSupabaseAdmin()
      .from("orders")
      .update({
        buyer_contact: normalizePhone(payment.contact) || null,
        buyer_email: payment.email ? String(payment.email).slice(0, 200) : null,
      })
      .eq("id", order.id)
      .is("buyer_contact", null);
  }
  if (result.newlyPaid) {
    console.error("[reconcile] recovered paid order", order.id);
    await onOrderPaid(order.id);
  }
  return true;
}

/**
 * Checks one pending order against Razorpay (used by the order page while a
 * buyer waits). Returns true if it is now paid. Never throws for Razorpay
 * problems — the page just keeps waiting.
 */
export async function reconcileOrder(order: PendingOrder): Promise<boolean> {
  if (!isRazorpayConfigured || !order.razorpay_order_id) return false;
  let payments: RazorpayPayment[];
  try {
    payments = await fetchOrderPayments(order.razorpay_order_id);
  } catch (error) {
    console.error("[reconcile] Razorpay lookup failed", String(error));
    return false;
  }
  const payment = capturedFor(order, payments);
  return payment ? applyPayment(order, payment) : false;
}

/**
 * Sweeps every `created` order from the last `hours` hours (cron). One
 * Razorpay list call per 100 payments, not one per order.
 */
export async function reconcileRecentOrders(hours = 48): Promise<{
  pending: number;
  recovered: number;
}> {
  if (!isRazorpayConfigured) return { pending: 0, recovered: 0 };
  const since = new Date(Date.now() - hours * 3600_000);
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id, razorpay_order_id, amount")
    .eq("status", "created")
    .not("razorpay_order_id", "is", null)
    .gte("created_at", since.toISOString())
    .limit(2000);
  if (error) throw new DatabaseUnavailableError("reconcile pending orders", error);
  const pending = (data ?? []) as PendingOrder[];
  if (pending.length === 0) return { pending: 0, recovered: 0 };

  const payments = await listPayments(
    Math.floor(since.getTime() / 1000) - 60,
    Math.floor(Date.now() / 1000),
  );
  let recovered = 0;
  for (const order of pending) {
    const payment = capturedFor(order, payments);
    if (payment && (await applyPayment(order, payment))) recovered++;
  }
  return { pending: pending.length, recovered };
}
