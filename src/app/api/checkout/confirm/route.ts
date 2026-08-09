import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { fulfillOrder } from "@/lib/delivery";

export const runtime = "nodejs";

/**
 * Client-side confirmation after the Razorpay popup succeeds. Verifies the
 * signature server-side (never trust the browser), marks the order paid and
 * delivers. The webhook is the authoritative backup; fulfilment is idempotent.
 */
export async function POST(req: NextRequest) {
  const {
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = await req.json();

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    )
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .update({ status: "paid", razorpay_payment_id })
    .eq("id", orderId)
    .eq("razorpay_order_id", razorpay_order_id)
    .select("id")
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  const result = await fulfillOrder(order.id);
  return NextResponse.json({ ok: true, downloadUrl: result.downloadUrl });
}
