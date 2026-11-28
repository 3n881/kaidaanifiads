import { NextResponse, type NextRequest } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { markConsultPaid } from "@/lib/consultations";
import { DatabaseUnavailableError } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * After the Razorpay popup succeeds on /consultation: verifies the signature on
 * the server and marks the booking paid. The webhook and the 10-min check do
 * the same if this never arrives.
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
    const booking = await markConsultPaid({ razorpayOrderId, razorpayPaymentId: paymentId });
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    return NextResponse.json({ ok: true, bookingNo: booking.bookingNo });
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) throw error;
    console.error("[consult confirm] database unavailable", error.message);
    return NextResponse.json({ ok: true, pending: true }, { status: 202 });
  }
}
