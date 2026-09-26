import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { SITE_URL } from "./supabase/config";
import { createOrderAccessToken } from "./razorpay";

export interface DeliverableItem {
  id: number;
  slug: string;
  title: string;
  pdfPath: string;
}

interface ItemRow {
  id: number;
  slug: string;
  title: string;
  pdf_path: string | null;
  is_combo?: boolean;
}

/** Normalises an Indian phone number to its last 10 digits ("" if invalid). */
export function normalizePhone(raw: unknown): string {
  const phone = String(raw ?? "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(phone) ? phone : "";
}

/** Customer-facing order page URL (refreshable, token-protected). */
export function orderPagePath(orderId: string): string {
  return `/order/${orderId}?t=${createOrderAccessToken(orderId)}`;
}

export function orderPageUrl(orderId: string): string {
  return `${SITE_URL.replace(/\/$/, "")}${orderPagePath(orderId)}`;
}

/**
 * The PDFs a purchase of `productId` unlocks. A single ebook delivers its own
 * PDF; a combo delivers each member book's PDF (plus its own, if one was
 * uploaded). Items without a PDF are skipped.
 */
export async function getDeliverableItems(
  productId: number,
): Promise<DeliverableItem[]> {
  const admin = getSupabaseAdmin();
  const { data: product } = await admin
    .from("products")
    .select("id, slug, title, pdf_path, is_combo")
    .eq("id", productId)
    .maybeSingle<ItemRow>();
  if (!product) return [];

  const rows: ItemRow[] = [product];
  if (product.is_combo) {
    const { data: members } = await admin
      .from("combo_items")
      .select("products:product_id(id, slug, title, pdf_path)")
      .eq("combo_id", productId);
    for (const m of (members ?? []) as unknown as { products: ItemRow | null }[]) {
      if (m.products) rows.push(m.products);
    }
  }

  return rows
    .filter((r): r is ItemRow & { pdf_path: string } => Boolean(r.pdf_path))
    .map((r) => ({ id: r.id, slug: r.slug, title: r.title, pdfPath: r.pdf_path }));
}

/**
 * Atomically moves an order to `paid`. Safe to call from both the client
 * confirm route and the webhook, any number of times: only the first call
 * changes state (`newlyPaid: true`). Returns null if no such order exists.
 */
export async function markOrderPaid(opts: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  orderId?: string;
}): Promise<{ orderId: string; newlyPaid: boolean } | null> {
  const admin = getSupabaseAdmin();

  let update = admin
    .from("orders")
    .update({
      status: "paid",
      razorpay_payment_id: opts.razorpayPaymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", opts.razorpayOrderId)
    .neq("status", "paid");
  if (opts.orderId) update = update.eq("id", opts.orderId);
  const { data: updated, error } = await update.select("id").maybeSingle();
  if (error) console.error("[orders] markOrderPaid update failed", error);
  if (updated) return { orderId: updated.id, newlyPaid: true };

  // Already paid (duplicate webhook / confirm after webhook) or unknown.
  let lookup = admin
    .from("orders")
    .select("id, status")
    .eq("razorpay_order_id", opts.razorpayOrderId);
  if (opts.orderId) lookup = lookup.eq("id", opts.orderId);
  const { data: existing } = await lookup.maybeSingle();
  if (existing?.status === "paid") {
    return { orderId: existing.id, newlyPaid: false };
  }
  return null;
}
