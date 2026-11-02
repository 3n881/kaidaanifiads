import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "./supabase/server";
import { SALES_START } from "./sales";

// Book page: "N people bought this in the last 7 days" — real paid orders,
// one per WhatsApp number per book (a buyer who paid twice counts once).
// Only the counts leave the server. Read at most every 10 min (book pages are
// ISR, 5 min), never per visit.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function readBuyersThisWeek(): Promise<Record<number, number>> {
  const since = new Date(Math.max(Date.now() - WEEK_MS, Date.parse(SALES_START))).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id, product_id, buyer_contact, whatsapp_number")
    .eq("status", "paid")
    .gte("created_at", since)
    .limit(20000);
  if (error) throw new Error(error.message);
  const buyers = new Map<number, Set<string>>();
  for (const o of data ?? []) {
    if (o.product_id === null) continue;
    const phone = String(o.buyer_contact || o.whatsapp_number || "").replace(/\D/g, "").slice(-10);
    const set = buyers.get(o.product_id) ?? new Set<string>();
    set.add(phone.length === 10 ? phone : o.id);
    buyers.set(o.product_id, set);
  }
  return Object.fromEntries([...buyers].map(([id, set]) => [id, set.size]));
}

const cachedBuyersThisWeek = unstable_cache(readBuyersThisWeek, ["buyers-this-week-v1"], { revalidate: 600 });

/** Product id → people who bought it in the last 7 days. Empty on any error (the line just hides). */
export async function getBuyersThisWeek(): Promise<Record<number, number>> {
  try {
    return await cachedBuyersThisWeek();
  } catch {
    return {};
  }
}
