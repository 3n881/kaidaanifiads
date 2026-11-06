import { after, NextResponse, type NextRequest } from "next/server";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { runReminderBurst } from "@/lib/reminders";

export const runtime = "nodejs";

/**
 * The buyer closed the Razorpay window without paying (BuyButton ondismiss).
 * Stamps checkout_closed_at once, on an unpaid order, with its signed access
 * token (admin drop-off numbers, migration 011), and sends the 3 payment
 * reminders on WhatsApp right away: at 0 / 10 / 30 s (client 2026-11-06; src/lib/reminders.ts).
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
  else
    after(async () => {
      try {
        await runReminderBurst(orderId);
      } catch (reminderError) {
        console.error("[reminders] close-time burst failed", orderId, reminderError instanceof Error ? reminderError.message : reminderError);
      }
    });
  return NextResponse.json({ ok: !error }, { headers: { "Cache-Control": "private, no-store" } });
}
