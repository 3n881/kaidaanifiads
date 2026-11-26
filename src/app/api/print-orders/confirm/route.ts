import { NextResponse, type NextRequest } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { markPrintOrderPaid } from "@/lib/print-orders";
import { DatabaseUnavailableError } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * After the Razorpay popup succeeds on /print-order: verifies the signature on
 * the server (never trust the browser) and marks the printed order paid. The
 * webhook and the 10-min check do the same if this never arrives.
 */
export async function POST(req: NextRequest) {
  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const razorpayOrderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  if (!razorpayOrderId || !paymentId || !signature || !verifyPaymentSignature(razorpayOrderId, paymentId, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  try {
    const order = await markPrintOrderPaid({ razorpayOrderId, razorpayPaymentId: paymentId });
    if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });
    return NextResponse.json({ ok: true, orderNo: order.orderNo });
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) throw error;
    // The payment is genuine; the webhook (retried) records it once the database is back.
    console.error("[print confirm] database unavailable", error.message);
    return NextResponse.json({ ok: true, pending: true }, { status: 202 });
  }
}
