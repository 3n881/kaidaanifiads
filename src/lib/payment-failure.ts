import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { fetchOrderPayments, isRazorpayConfigured, type RazorpayPayment } from "./razorpay";

// ---------------------------------------------------------------------------
// Why a payment failed (migration 015): Razorpay's reason + how the buyer tried
// to pay, saved on the order. New failures come with the payment.failed
// webhook; older failed orders are fetched from Razorpay by the 10-minute cron
// (a few per run, each order once). The UPI id itself is never stored — only
// the app it belongs to.
// ---------------------------------------------------------------------------

export interface PaymentFailure {
  failure_reason: string | null;
  failure_description: string | null;
  failure_method: string | null;
}

// UPI handle → app (the part after @).
const UPI_APPS: Array<[RegExp, string]> = [
  [/^(ybl|ibl|axl)$/, "PhonePe"],
  [/^ok(axis|hdfcbank|icici|sbi)$/, "Google Pay"],
  [/^(paytm|pt(yes|axis|hdfc|sbi))$/, "Paytm"],
  [/^apl$/, "Amazon Pay"],
  [/^(upi|bhim)$/, "BHIM"],
  [/^(fbl|fam|fifederal)$/, "Fampay"],
  [/^(naviaxis|nav)$/, "Navi"],
];

/** The parts of a Razorpay payment that say why and how it failed. */
export type FailedPaymentFields = Pick<RazorpayPayment, "error_reason" | "error_description" | "method" | "vpa" | "upi" | "wallet" | "bank">;

const METHODS: Record<string, string> = { upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet", emi: "EMI", paylater: "Pay later" };

function methodOf(p: FailedPaymentFields): string | null {
  if (!p.method) return null;
  const base = METHODS[p.method] ?? p.method;
  if (p.method === "upi") {
    const handle = (p.vpa ?? p.upi?.vpa ?? "").split("@")[1]?.toLowerCase() ?? "";
    const app = UPI_APPS.find(([re]) => re.test(handle))?.[1];
    return app ? `UPI · ${app}` : base;
  }
  if (p.method === "wallet" && p.wallet) return `Wallet · ${p.wallet}`;
  if (p.method === "netbanking" && p.bank) return `Net banking · ${p.bank}`;
  return base;
}

export function failureFromPayment(p: FailedPaymentFields): PaymentFailure {
  return {
    failure_reason: p.error_reason?.slice(0, 80) || null,
    failure_description: p.error_description?.slice(0, 300) || null,
    failure_method: methodOf(p)?.slice(0, 60) ?? null,
  };
}

// Razorpay's error_reason codes → short English for the dashboard.
const LABELS: Record<string, string> = {
  payment_timeout: "Payment timed out",
  payment_timed_out: "Payment timed out",
  payment_cancelled: "Cancelled by the customer",
  payment_failed: "Payment failed",
  incorrect_pin: "Wrong UPI PIN",
  incorrect_otp: "Wrong OTP",
  insufficient_funds: "Not enough balance",
  insufficient_balance: "Not enough balance",
  payment_declined: "Declined by the bank",
  bank_technical_error: "Bank technical error",
  gateway_technical_error: "Payment network error",
  server_error: "Payment network error",
  authentication_failed: "OTP / authentication failed",
  payment_risk_check_failed: "Blocked by risk check",
  card_declined: "Card declined",
  transaction_limit_exceeded: "Bank's daily limit reached",
  payment_collect_request_expired: "UPI request expired",
  invalid_vpa: "Wrong UPI ID",
  upi_app_not_installed: "UPI app not available",
};

/** Short label for a failed order; null = no reason known (yet). */
export function failureLabel(o: { failure_reason?: string | null; failure_description?: string | null }): string | null {
  if (o.failure_reason && LABELS[o.failure_reason]) return LABELS[o.failure_reason];
  if (o.failure_description) return o.failure_description;
  if (o.failure_reason) return o.failure_reason.replace(/_/g, " ");
  return null;
}

/** Saves the reason of a failed Razorpay payment on our order. Best effort: never throws. */
export async function saveFailure(orderId: string, payment: FailedPaymentFields): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("orders")
      .update({ ...failureFromPayment(payment), failure_checked_at: new Date().toISOString() })
      .eq("id", orderId)
      .neq("status", "paid");
    // 42703 = migration 015 not applied yet: failure still recorded as status.
    if (error && error.code !== "42703") console.error("[payment-failure] not saved", orderId, error.message);
  } catch (error) {
    console.error("[payment-failure] not saved", orderId, String(error));
  }
}

/**
 * Cron: fetch the reason for failed orders we haven't asked Razorpay about yet
 * (orders from before migration 015, or a webhook that came without one).
 */
export async function backfillFailureReasons(limit = 15): Promise<{ checked: number; found: number }> {
  if (!isRazorpayConfigured) return { checked: 0, found: 0 };
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("orders")
    .select("id, razorpay_order_id")
    .eq("status", "failed")
    .is("failure_checked_at", null)
    .not("razorpay_order_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42703") return { checked: 0, found: 0 };
    throw new Error(error.message);
  }
  let found = 0;
  for (const order of data ?? []) {
    let payments: RazorpayPayment[];
    try {
      payments = await fetchOrderPayments(order.razorpay_order_id!);
    } catch {
      continue; // Razorpay unreachable: try again next run
    }
    const failed = payments
      .filter((p) => p.status === "failed")
      .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];
    if (failed) {
      await saveFailure(order.id, failed);
      found++;
    } else {
      await admin.from("orders").update({ failure_checked_at: new Date().toISOString() }).eq("id", order.id);
    }
  }
  return { checked: data?.length ?? 0, found };
}
