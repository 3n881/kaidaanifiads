import { NextResponse, type NextRequest } from "next/server";
import { DatabaseUnavailableError } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import { createOrderAccessToken, createRazorpayOrder, isRazorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { getProductBySlug } from "@/lib/products";
import { localizedTitle, normalizeLocale } from "@/lib/i18n";
import { checkAddress } from "@/lib/print-address";
import { printTotal, type PrintPayment } from "@/lib/print-copy";
import { createPrintOrder, markPrintOrderPaid, setPrintRazorpayOrder } from "@/lib/print-orders";
import { cleanId, cleanVisitSource } from "@/lib/visit-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A real buyer places one or two orders; more from one address in 10 min is a bot / fake COD spree.
const LIMIT = 6;
const WINDOW_MS = 10 * 60_000;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  if (hits.size > 5000) hits.clear();
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

const BUSY = "ऑर्डर सध्या घेता आली नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.";

/**
 * POST /api/print-orders — a printed-book order from /print-order/<slug>.
 * Body: { slug, locale, payment: "online" | "cod", address, visit? }.
 * The price comes from the server (₹399, COD +₹50), never from the browser.
 * COD → saved as cod_pending, answered with the order number.
 * Online → saved as pending_payment + a Razorpay order for the page to open.
 */
export async function POST(req: NextRequest) {
  if (!hasServiceRole) return NextResponse.json({ error: BUSY }, { status: 503 });
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  // Cash on Delivery only (client, 28 Nov). Set to true to offer online payment again
  // (the Razorpay path below, /confirm, the webhook and the 10-min check are all kept).
  const ONLINE_PAYMENT = false;
  const payment: PrintPayment | null =
    body.payment === "cod" ? "cod" : body.payment === "online" && ONLINE_PAYMENT ? "online" : null;
  if (!payment) return NextResponse.json({ error: "payment" }, { status: 400 });
  const { address, bad } = checkAddress((body.address ?? {}) as Record<string, unknown>);
  if (bad.length) return NextResponse.json({ error: "address", fields: bad }, { status: 400 });

  const product = await getProductBySlug(String(body.slug ?? "")).catch(() => null);
  if (!product) return NextResponse.json({ error: "book not found" }, { status: 404 });
  // Counted only for complete orders (a buyer fixing typos isn't limited).
  if (limited(ip)) return NextResponse.json({ error: BUSY }, { status: 429 });
  const locale = normalizeLocale(body.locale);
  const amount = printTotal(payment);

  const visit = body.visit && typeof body.visit === "object" ? (body.visit as Record<string, unknown>) : null;
  const visitId = visit ? cleanId(visit.visitId) : null;

  try {
    const order = await createPrintOrder({
      productId: product.id,
      productTitle: localizedTitle(product, locale) || product.title,
      locale,
      payment,
      amount,
      address,
      visit: visit && visitId ? { visit_id: visitId, ...cleanVisitSource(visit) } : null,
    });

    if (payment === "cod") return NextResponse.json({ orderNo: order.orderNo, payment, amount });

    if (!isRazorpayConfigured) {
      // Local development without Razorpay keys only: pretend it was paid.
      if (process.env.NODE_ENV === "production") return NextResponse.json({ error: BUSY }, { status: 503 });
      const fakeId = `demo_${order.id}`;
      await setPrintRazorpayOrder(order.id, fakeId);
      await markPrintOrderPaid({ razorpayOrderId: fakeId, razorpayPaymentId: "demo" });
      return NextResponse.json({ orderNo: order.orderNo, payment, amount, demo: true });
    }

    const rzp = await createRazorpayOrder(amount, order.id);
    await setPrintRazorpayOrder(order.id, rzp.id);
    return NextResponse.json({
      orderNo: order.orderNo,
      payment,
      amount,
      orderId: order.id,
      token: createOrderAccessToken(order.id),
      razorpay: {
        keyId: razorpayKeyId,
        orderId: rzp.id,
        amount: rzp.amount,
        currency: rzp.currency,
        prefill: { name: address.name, contact: `+91${address.phone}` },
      },
    });
  } catch (error) {
    console.error("[print] order failed", error instanceof DatabaseUnavailableError ? error.message : error);
    return NextResponse.json({ error: BUSY }, { status: 503 });
  }
}
