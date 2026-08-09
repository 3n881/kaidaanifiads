import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { fulfillOrder } from "@/lib/delivery";

export const runtime = "nodejs";

/**
 * Razorpay webhook — the authoritative fulfilment path. Configure in the
 * Razorpay dashboard (Settings → Webhooks) pointing at
 * https://<your-domain>/api/razorpay/webhook with events payment.captured and
 * order.paid, and set RAZORPAY_WEBHOOK_SECRET to the same secret.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return new NextResponse("invalid signature", { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("bad payload", { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const rzpOrderId = payment?.order_id;
    const paymentId = payment?.id;

    if (rzpOrderId) {
      const admin = getSupabaseAdmin();
      const { data: order } = await admin
        .from("orders")
        .update({ status: "paid", razorpay_payment_id: paymentId })
        .eq("razorpay_order_id", rzpOrderId)
        .select("id")
        .maybeSingle();
      if (order) await fulfillOrder(order.id);
    }
  }

  return NextResponse.json({ ok: true });
}
