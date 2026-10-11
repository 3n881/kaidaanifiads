import "server-only";
import { DatabaseUnavailableError, getSupabaseAdmin } from "./supabase/server";
import { fetchPayment, fetchPaymentRefunds, isRazorpayConfigured, type RazorpayPayment, type RazorpayRefund } from "./razorpay";
import { reconcileOrder } from "./reconcile";

// ---------------------------------------------------------------------------
// Refund tracking (migration 008). An order stays `paid`; refunded_amount /
// refund_status say how much of it Razorpay gave back. Written by the webhook
// (refund.* events) and by the admin "Check with Razorpay" button. Delivery
// is not changed by a refund.
// ---------------------------------------------------------------------------

/** Saves Razorpay's refund state of a payment on our order. */
export async function applyRefundState(
  orderId: string,
  payment: Pick<RazorpayPayment, "amount_refunded" | "refund_status">,
  latestRefund?: Pick<RazorpayRefund, "id" | "created_at"> | null,
): Promise<void> {
  const refundedPaise = Number(payment.amount_refunded ?? 0);
  if (!refundedPaise) return; // nothing refunded — leave the columns alone
  const { error } = await getSupabaseAdmin()
    .from("orders")
    .update({
      refunded_amount: Math.round(refundedPaise / 100),
      refund_status: payment.refund_status === "full" ? "full" : "partial",
      refunded_at: latestRefund?.created_at
        ? new Date(latestRefund.created_at * 1000).toISOString()
        : new Date().toISOString(),
      ...(latestRefund?.id ? { razorpay_refund_id: latestRefund.id } : {}),
    })
    .eq("id", orderId);
  if (error) throw new DatabaseUnavailableError("save refund", error);
}

export interface SyncResult {
  ok: boolean;
  message: string;
}

/**
 * Admin "Check with Razorpay": brings one order up to date — an unpaid order
 * that Razorpay captured becomes paid (same path as the reconcile cron), and a
 * paid order gets its refund state. Never throws for Razorpay problems.
 */
export async function syncOrderWithRazorpay(orderId: string): Promise<SyncResult> {
  if (!isRazorpayConfigured) return { ok: false, message: "Razorpay keys are not set on this server." };
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, status, amount, razorpay_order_id, razorpay_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new DatabaseUnavailableError("sync order lookup", error);
  if (!order) return { ok: false, message: "Order not found." };

  try {
    if (order.status !== "paid") {
      const nowPaid = await reconcileOrder(order);
      if (!nowPaid) return { ok: true, message: "Razorpay has no captured payment for this order — it is still unpaid." };
      const { data: fresh } = await admin.from("orders").select("razorpay_payment_id").eq("id", orderId).maybeSingle();
      order.razorpay_payment_id = fresh?.razorpay_payment_id ?? order.razorpay_payment_id;
    }
    if (!order.razorpay_payment_id) return { ok: true, message: "No Razorpay payment id on this order." };

    const payment = await fetchPayment(order.razorpay_payment_id);
    if (!payment.amount_refunded) {
      return { ok: true, message: `Razorpay: ${payment.status}, no refund.` };
    }
    const refunds = await fetchPaymentRefunds(order.razorpay_payment_id);
    await applyRefundState(order.id, payment, refunds[0] ?? null);
    return {
      ok: true,
      message: `Razorpay: ₹${Math.round(payment.amount_refunded / 100)} refunded (${payment.refund_status === "full" ? "full" : "partial"}). Saved.`,
    };
  } catch (syncError) {
    if (syncError instanceof DatabaseUnavailableError) throw syncError;
    console.error("[refunds] sync failed", orderId, syncError);
    return { ok: false, message: "Could not reach Razorpay. Try again in a minute." };
  }
}
