import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { DatabaseUnavailableError, getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import {
  createOrderAccessToken,
  isRazorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
} from "@/lib/razorpay";
import { getDeliverableItems, orderPagePath } from "@/lib/orders";

export const runtime = "nodejs";

// Shown in the Buy modal when Supabase or Razorpay is down/slow. We never take
// money while we can't record or deliver the order.
const BUSY_MESSAGE =
  "पेमेंट सेवा सध्या व्यस्त आहे. कृपया 1-2 मिनिटांनी पुन्हा प्रयत्न करा. / Payments are busy right now — please try again in a minute.";

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) throw error;
    console.error("[checkout] database unavailable", error.message);
    return NextResponse.json({ error: BUSY_MESSAGE, retryable: true }, { status: 503 });
  }
}

async function handle(req: NextRequest) {
  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim().slice(0, 120);
  if (!slug) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable." },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();
  // Price is always read from the database — never from the browser.
  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, title, price, slug")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (productError) throw new DatabaseUnavailableError("checkout product", productError);

  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  // Don't take money for something we can't deliver (single PDF, or the
  // member books' PDFs for a combo).
  const items = await getDeliverableItems(product.id);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "This ebook is temporarily unavailable for download." },
      { status: 409 },
    );
  }

  const orderId = randomUUID();
  const guestOrder = {
    id: orderId,
    name: "Guest",
    whatsapp_number: "",
    product_id: product.id,
    amount: product.price,
  };

  // ------- TEST MODE: Razorpay not configured → simulate a paid order -------
  if (!isRazorpayConfigured) {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.CHECKOUT_DEMO_MODE !== "true"
    ) {
      return NextResponse.json(
        { error: "Payment gateway is temporarily unavailable." },
        { status: 503 },
      );
    }
    const { error } = await admin.from("orders").insert({
      ...guestOrder,
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (error) {
      console.error("[checkout] demo order insert failed", error);
      return NextResponse.json({ error: "order creation failed" }, { status: 500 });
    }
    return NextResponse.json({
      testMode: true,
      orderId,
      accessToken: createOrderAccessToken(orderId),
      orderUrl: orderPagePath(orderId),
      productTitle: product.title,
    });
  }

  // ---------------------- LIVE: create a Razorpay order --------------------
  let rzp;
  try {
    rzp = await createRazorpayOrder(product.price, orderId);
  } catch (error) {
    console.error("[checkout] Razorpay order failed", error);
    return NextResponse.json({ error: BUSY_MESSAGE, retryable: true }, { status: 503 });
  }

  const { error } = await admin.from("orders").insert({
    ...guestOrder,
    razorpay_order_id: rzp.id,
    status: "created",
  });
  if (error) {
    console.error("[checkout] order insert failed", error);
    return NextResponse.json({ error: BUSY_MESSAGE, retryable: true }, { status: 503 });
  }

  return NextResponse.json({
    razorpayOrderId: rzp.id,
    keyId: razorpayKeyId,
    amount: rzp.amount,
    currency: rzp.currency,
    orderId,
    accessToken: createOrderAccessToken(orderId),
    orderUrl: orderPagePath(orderId),
    productTitle: product.title,
  });
}
