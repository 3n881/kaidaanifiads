import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid, normalizePhone } from "@/lib/orders";
import { onOrderPaid } from "@/lib/delivery";

export const runtime = "nodejs";

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
  contact?: string;
  email?: string;
}

/**
 * Razorpay webhook — the authoritative backup to /api/checkout/confirm.
 * Configure in Razorpay (Settings → Webhooks) pointing at
 * https://<your-domain>/api/razorpay/webhook with events payment.captured,
 * order.paid and payment.failed; set RAZORPAY_WEBHOOK_SECRET to its secret.
 *
 * Idempotent: duplicate or out-of-order deliveries never double-fulfil.
 * Always answers 2xx for verified events so Razorpay doesn't retry forever.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    console.error("[webhook] invalid signature");
    return new NextResponse("invalid signature", { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("bad payload", { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const rzpOrderId = payment?.order_id;
  if (!payment || !rzpOrderId) return NextResponse.json({ ok: true });

  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, amount, status, buyer_contact")
    .eq("razorpay_order_id", rzpOrderId)
    .maybeSingle();
  if (!order) {
    console.error("[webhook] unknown razorpay order", rzpOrderId);
    return NextResponse.json({ ok: true });
  }

  if (event.event === "payment.failed") {
    await admin
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id)
      .eq("status", "created");
    return NextResponse.json({ ok: true });
  }

  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    return NextResponse.json({ ok: true });
  }

  if (payment.amount !== order.amount * 100) {
    console.error("[webhook] amount mismatch", {
      order: order.id,
      expected: order.amount * 100,
      got: payment.amount,
    });
    return NextResponse.json({ ok: true });
  }

  // Keep Razorpay's contact details so a buyer who closed the browser can
  // still recover the book (My Books → WhatsApp). Never overwrite.
  if (!order.buyer_contact && (payment.contact || payment.email)) {
    await admin
      .from("orders")
      .update({
        buyer_contact: normalizePhone(payment.contact) || null,
        buyer_email: payment.email ? String(payment.email).slice(0, 200) : null,
      })
      .eq("id", order.id);
  }

  const result = payment.id
    ? await markOrderPaid({ razorpayOrderId: rzpOrderId, razorpayPaymentId: payment.id })
    : null;

  // Auto-WhatsApp needs buyer_contact, which only the webhook knows, so send
  // from here once (payment.captured) — not on the duplicate order.paid.
  if (result && event.event === "payment.captured") {
    await onOrderPaid(result.orderId);
  }

  return NextResponse.json({ ok: true });
}
