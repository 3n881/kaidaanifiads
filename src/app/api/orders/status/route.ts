import { NextResponse, type NextRequest } from "next/server";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Same cut-off as the order page: an unpaid order older than this was abandoned.
const ABANDONED_AFTER_MS = 30 * 60 * 1000;
const MAX_ORDERS = 30; // = MAX_ENTRIES in src/lib/purchases.ts

export type SavedOrderStatus = "paid" | "pending" | "unpaid";

/**
 * Payment status of the orders this phone remembers (My Books). The device
 * saves an order before payment starts, so the list also holds cancelled and
 * failed attempts — My Books shows only the paid ones (and a fresh pending
 * one). Each order needs its signed access token, so ids alone reveal nothing.
 */
export async function POST(req: NextRequest) {
  let body: { orders?: Array<{ orderId?: unknown; token?: unknown }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const ids = (Array.isArray(body.orders) ? body.orders : [])
    .slice(0, MAX_ORDERS)
    .map((o) => ({ orderId: String(o?.orderId ?? ""), token: String(o?.token ?? "") }))
    .filter((o) => verifyOrderAccessToken(o.orderId, o.token))
    .map((o) => o.orderId);
  if (ids.length === 0) return NextResponse.json({ statuses: {} });

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id, status, created_at")
    .in("id", ids);
  if (error) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const statuses: Record<string, SavedOrderStatus> = {};
  for (const order of data ?? []) {
    statuses[order.id] =
      order.status === "paid"
        ? "paid"
        : order.status === "created" && Date.now() - new Date(order.created_at).getTime() < ABANDONED_AFTER_MS
          ? "pending"
          : "unpaid";
  }
  return NextResponse.json({ statuses });
}
