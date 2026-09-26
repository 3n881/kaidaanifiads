import { NextResponse, type NextRequest } from "next/server";
import { sendOrderOnWhatsApp } from "@/lib/delivery";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { normalizePhone } from "@/lib/orders";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Adds optional WhatsApp details after a verified payment and sends the
 * order link there. Sends are capped per order (see WHATSAPP_SEND_LIMIT).
 */
export async function POST(req: NextRequest) {
  let body: {
    orderId?: string;
    accessToken?: string;
    name?: string;
    whatsapp?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "").trim();
  const token = String(body.accessToken ?? "").trim();
  const phone = normalizePhone(body.whatsapp);
  const name = String(body.name ?? "").trim().slice(0, 100);

  if (!verifyOrderAccessToken(orderId, token)) {
    return NextResponse.json({ error: "invalid order access" }, { status: 403 });
  }
  if (!phone) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit WhatsApp number." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .update({
      name: name.length >= 2 ? name : "Customer",
      whatsapp_number: phone,
    })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "paid order not found" }, { status: 404 });
  }

  const delivered = await sendOrderOnWhatsApp(order.id, { phone });
  return NextResponse.json({ ok: true, delivered });
}
