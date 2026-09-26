import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { sendWhatsAppDelivery } from "./interakt";
import { normalizePhone, orderPageUrl } from "./orders";

// Signed URLs are minted per click by /api/download and only need to survive
// the redirect, so they expire quickly — a forwarded link is useless.
const SIGNED_URL_TTL = 60 * 5; // 5 minutes

// Max WhatsApp messages per order (customer-triggered). Bounds Interakt cost
// and stops the contact form / My Books being used to spam numbers.
const WHATSAPP_SEND_LIMIT = Number(process.env.WHATSAPP_SEND_LIMIT || 3);

// Send the order link to the phone the buyer entered in Razorpay checkout,
// without waiting for the optional form. Off unless explicitly enabled.
const AUTO_WHATSAPP_ON_PAYMENT = process.env.AUTO_WHATSAPP_ON_PAYMENT === "true";

/** Creates a short-lived signed download URL for a private PDF. */
export async function createSignedPdfUrl(
  pdfPath: string | null,
  downloadName?: string,
): Promise<string | null> {
  if (!pdfPath) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from("pdfs")
    .createSignedUrl(pdfPath, SIGNED_URL_TTL, {
      download: downloadName ?? true,
    });
  if (error) {
    console.error("[delivery] signed URL failed", error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Sends the customer their order page link on WhatsApp (Interakt). The link
 * opens /order/{id}, which mints fresh short-lived download URLs — the raw
 * file URL is never sent. Capped per order unless `force` (admin resend).
 */
export async function sendOrderOnWhatsApp(
  orderId: string,
  opts: { force?: boolean; phone?: string } = {},
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, name, status, whatsapp_number, buyer_contact, products(title)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid") return false;

  const phone = normalizePhone(
    opts.phone || order.whatsapp_number || order.buyer_contact,
  );
  if (!phone) return false;

  if (!opts.force) {
    const { data: allowed, error } = await admin.rpc("claim_whatsapp_send", {
      p_order: orderId,
      p_limit: WHATSAPP_SEND_LIMIT,
    });
    if (error || !allowed) return false;
  }

  const product = Array.isArray(order.products) ? order.products[0] : order.products;
  const sent = await sendWhatsAppDelivery({
    phone,
    name: order.name && order.name !== "Guest" ? order.name : "Customer",
    productTitle: (product as { title?: string } | null)?.title ?? "",
    downloadLink: orderPageUrl(orderId),
  });
  if (sent) {
    await admin.from("orders").update({ delivered: true }).eq("id", orderId);
  }
  return sent;
}

/** Runs once when an order first becomes paid. */
export async function onOrderPaid(orderId: string): Promise<void> {
  if (!AUTO_WHATSAPP_ON_PAYMENT) return;
  try {
    await sendOrderOnWhatsApp(orderId);
  } catch (error) {
    console.error("[delivery] auto WhatsApp failed", error);
  }
}
