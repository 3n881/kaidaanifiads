import { NextResponse, type NextRequest } from "next/server";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * "Buyer still here" ping (src/lib/order-presence.ts): sent every 10 s while
 * the Razorpay window is open and the page is on screen. Saves the time on the
 * unpaid order (migration 017); the reminders treat 30 s of silence + no open
 * payment in Razorpay as "left" (src/lib/reminders.ts). Signed order token
 * required. Best effort, always 204 — the buyer never waits on it.
 */
export async function POST(req: NextRequest) {
  let body: { orderId?: unknown; token?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const orderId = String(body.orderId ?? "");
  if (!orderId || !verifyOrderAccessToken(orderId, String(body.token ?? ""))) {
    return new NextResponse(null, { status: 204 });
  }
  const { error } = await getSupabaseAdmin()
    .from("orders")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", ["created", "failed"]);
  // 42703 = migration 017 not applied yet: reminders fall back to 3 min after Buy.
  if (error && error.code !== "42703") console.error("[orders] alive:", error.message);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}
