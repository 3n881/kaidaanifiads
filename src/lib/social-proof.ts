import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "./supabase/server";

// Book page: "13,450+ book purchases so far" — every captured payment in the
// client's Razorpay account (original site + ours) when the owner read it,
// plus our paid orders since then, so nothing is counted twice. Rounded DOWN
// to the 50, never more than is true. Read at most every 10 min (book pages
// are ISR, 5 min), never per visit.

/** Razorpay → Transactions → Payments, status Captured, all time (owner, 2 Nov 2026). */
const RAZORPAY_CAPTURED = { count: 13450, at: "2026-11-02T07:00:00Z" };

async function readTotalPurchases(): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .gte("paid_at", RAZORPAY_CAPTURED.at);
  if (error) throw new Error(error.message);
  return RAZORPAY_CAPTURED.count + (count ?? 0);
}

const cachedTotalPurchases = unstable_cache(readTotalPurchases, ["total-purchases-v1"], { revalidate: 600 });

/** All-time purchases, rounded down to the 50. Falls back to the Razorpay count (never hides). */
export async function getTotalPurchases(): Promise<number> {
  let total = RAZORPAY_CAPTURED.count;
  try {
    total = await cachedTotalPurchases();
  } catch {
    // Build machines have no database key; the page refreshes within 5 min.
  }
  return Math.floor(total / 50) * 50;
}
