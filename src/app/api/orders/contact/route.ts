import { NextResponse, type NextRequest } from "next/server";
import { fulfillOrder } from "@/lib/delivery";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Adds optional WhatsApp delivery details after a verified payment. */
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

  const orderId = (body.orderId ?? "").trim();
  const token = (body.accessToken ?? "").trim();
  const phone = (body.whatsapp ?? "").replace(/\D/g, "").slice(-10);
  const name = (body.name ?? "").trim().slice(0, 100);

  if (!verifyOrderAccessToken(orderId, token)) {
    return NextResponse.json({ error: "invalid order access" }, { status: 403 });
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
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
      delivered: false,
    })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "paid order not found" }, { status: 404 });
  }

  const delivery = await fulfillOrder(order.id);
  return NextResponse.json({ ok: true, delivered: delivery.delivered });
}
