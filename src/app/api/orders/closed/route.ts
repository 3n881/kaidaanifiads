import { NextResponse, type NextRequest } from "next/server";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The buyer closed the Razorpay window without paying (BuyButton ondismiss).
 * Only for the admin drop-off numbers (migration 011): stamps
 * checkout_closed_at once, on an unpaid order, with its signed access token.
 * Best effort — never blocks the buyer.
 */
export async function POST(req: NextRequest) {
  let body: { orderId?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const orderId = String(body.orderId ?? "");
  if (!verifyOrderAccessToken(orderId, String(body.token ?? ""))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const { error } = await getSupabaseAdmin()
    .from("orders")
    .update({ checkout_closed_at: new Date().toISOString() })
    .eq("id", orderId)
    .neq("status", "paid")
    .is("checkout_closed_at", null);
  if (error) console.error("[orders] closed:", error.message);
  return NextResponse.json({ ok: !error }, { headers: { "Cache-Control": "private, no-store" } });
}
