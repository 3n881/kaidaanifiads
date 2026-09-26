import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { reconcileRecentOrders } from "@/lib/reconcile";
import { DatabaseUnavailableError } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

function authorized(req: NextRequest): boolean {
  if (CRON_SECRET.length < 32) return false; // disabled until a real secret is set
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * POST /api/cron/reconcile — marks orders paid that Razorpay captured but we
 * never recorded (buyer closed the tab while confirm/webhook failed).
 * Called every 10 minutes by .github/workflows/reconcile.yml.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await reconcileRecentOrders();
    if (result.recovered > 0) console.error("[reconcile] sweep", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof DatabaseUnavailableError ? error.message : String(error);
    console.error("[reconcile] sweep failed", message);
    return NextResponse.json({ ok: false, error: "sweep failed" }, { status: 503 });
  }
}
