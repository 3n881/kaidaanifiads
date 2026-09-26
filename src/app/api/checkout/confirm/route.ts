import { NextResponse, type NextRequest } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { markOrderPaid, orderPagePath } from "@/lib/orders";
import { DatabaseUnavailableError } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Client-side confirmation after the Razorpay popup succeeds. Verifies the
 * signature server-side (never trust the browser) and atomically marks the
 * order paid, so the buyer gets their download immediately without waiting
 * for the webhook. The webhook runs the same idempotent transition.
 */
export async function POST(req: NextRequest) {
  let body: {
    orderId?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "");
  const razorpayOrderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");

  if (
    !orderId ||
    !razorpayOrderId ||
    !paymentId ||
    !signature ||
    !verifyPaymentSignature(razorpayOrderId, paymentId, signature)
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let result;
  try {
    result = await markOrderPaid({
      razorpayOrderId,
      razorpayPaymentId: paymentId,
      orderId,
    });
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) throw error;
    // Payment is genuine (signature verified) but we can't record it right
    // now. Send the buyer to their order page, which keeps checking; the
    // Razorpay webhook (retried until the DB is back) marks it paid.
    console.error("[confirm] database unavailable", error.message);
    return NextResponse.json(
      { error: "temporarily unavailable", orderUrl: orderPagePath(orderId) },
      { status: 503 },
    );
  }
  if (!result) {
    console.error("[confirm] verified payment for unknown order", razorpayOrderId);
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, orderUrl: orderPagePath(result.orderId) });
}
