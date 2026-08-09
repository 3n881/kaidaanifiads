import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/config";
import {
  isRazorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
} from "@/lib/razorpay";
import { fulfillOrder } from "@/lib/delivery";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { slug?: string; name?: string; whatsapp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const phone = (body.whatsapp ?? "").replace(/\D/g, "").slice(-10);
  if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "invalid details" }, { status: 400 });
  }

  if (!hasServiceRole) {
    // No DB configured — pure demo (no persistence).
    return NextResponse.json({ demo: true, message: "not-configured" });
  }

  const admin = getSupabaseAdmin();
  const { data: product } = await admin
    .from("products")
    .select("id, title, price, slug, is_combo, pdf_path")
    .eq("slug", body.slug ?? "")
    .eq("active", true)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  // ------- TEST MODE: Razorpay not configured → simulate a paid order -------
  if (!isRazorpayConfigured) {
    const { data: order } = await admin
      .from("orders")
      .insert({
        name,
        whatsapp_number: phone,
        product_id: product.id,
        amount: product.price,
        status: "paid",
      })
      .select("id")
      .single();
    const result = order ? await fulfillOrder(order.id) : null;
    return NextResponse.json({
      testMode: true,
      orderId: order?.id ?? null,
      downloadUrl: result?.downloadUrl ?? null,
    });
  }

  // ---------------------- LIVE: create a Razorpay order --------------------
  const rzp = await createRazorpayOrder(product.price, `rcpt_${Date.now()}`);
  const { data: order } = await admin
    .from("orders")
    .insert({
      name,
      whatsapp_number: phone,
      product_id: product.id,
      amount: product.price,
      razorpay_order_id: rzp.id,
      status: "created",
    })
    .select("id")
    .single();

  return NextResponse.json({
    razorpayOrderId: rzp.id,
    keyId: razorpayKeyId,
    amount: rzp.amount,
    currency: rzp.currency,
    orderId: order?.id ?? null,
    productTitle: product.title,
  });
}
