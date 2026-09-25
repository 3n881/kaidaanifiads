import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import {
  createOrderAccessToken,
  isRazorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
} from "@/lib/razorpay";
import { fulfillOrder } from "@/lib/delivery";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
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
  const { data: product } = await admin
    .from("products")
    .select("id, title, price, slug, is_combo, pdf_path")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  if (!product.pdf_path) {
    return NextResponse.json(
      { error: "This ebook is temporarily unavailable for download." },
      { status: 409 },
    );
  }

  const guestOrder = {
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
    const { data: order, error } = await admin
      .from("orders")
      .insert({
        ...guestOrder,
        status: "paid",
      })
      .select("id")
      .single();
    if (error || !order) {
      return NextResponse.json({ error: "order creation failed" }, { status: 500 });
    }
    const result = await fulfillOrder(order.id);
    return NextResponse.json({
      testMode: true,
      orderId: order.id,
      accessToken: createOrderAccessToken(order.id),
      downloadUrl: result.downloadUrl,
    });
  }

  // ---------------------- LIVE: create a Razorpay order --------------------
  let rzp;
  try {
    rzp = await createRazorpayOrder(product.price, `rcpt_${Date.now()}`);
  } catch (error) {
    console.error("Unable to create Razorpay order", error);
    return NextResponse.json(
      { error: "Payment gateway authentication failed. Please contact support." },
      { status: 503 },
    );
  }
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      ...guestOrder,
      razorpay_order_id: rzp.id,
      status: "created",
    })
    .select("id")
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "order creation failed" }, { status: 500 });
  }

  return NextResponse.json({
    razorpayOrderId: rzp.id,
    keyId: razorpayKeyId,
    amount: rzp.amount,
    currency: rzp.currency,
    orderId: order.id,
    accessToken: createOrderAccessToken(order.id),
    productTitle: product.title,
  });
}
