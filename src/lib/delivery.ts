import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { SITE_URL } from "./supabase/config";
import { sendWhatsAppDelivery, templateAttachesPdf } from "./interakt";
import { getDeliverableItems, normalizePhone, orderPageUrl } from "./orders";
import { localizedTitle, normalizeLocale } from "./i18n";

// Signed URLs are minted per click by /api/download and only need to survive
// the redirect, so they expire quickly — a forwarded link is useless.
const SIGNED_URL_TTL = 60 * 5; // 5 minutes
// WhatsApp fetches a Document header itself, sometimes after a delay, so the
// URL handed to Interakt lives longer. Never shown to the buyer.
const WHATSAPP_PDF_URL_TTL = 60 * 60; // 1 hour

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
  ttlSeconds = SIGNED_URL_TTL,
): Promise<string | null> {
  if (!pdfPath) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from("pdfs")
    .createSignedUrl(pdfPath, ttlSeconds, {
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
    .select("id, name, status, locale, product_id, whatsapp_number, buyer_contact, products(title, title_mr, title_hi, title_en)")
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
  const locale = normalizeLocale(order.locale);
  const customerName = order.name && order.name !== "Guest"
    ? order.name
    : locale === "mr" ? "ग्राहक" : locale === "hi" ? "ग्राहक" : "Customer";

  // Templates with a Document header carry the PDF itself (combos are one
  // merged PDF, so the first deliverable item is the whole order).
  let document: { url: string; fileName: string } | null = null;
  if (templateAttachesPdf(locale)) {
    const [item] = await getDeliverableItems(order.product_id, locale);
    const fileName = item ? `${item.slug}-${locale}.pdf` : "";
    const url = item
      ? await createSignedPdfUrl(item.pdfPath, fileName, WHATSAPP_PDF_URL_TTL)
      : null;
    if (!url) {
      console.error("[delivery] no PDF to attach on WhatsApp", { orderId });
      return false;
    }
    document = { url, fileName };
  }

  const sent = await sendWhatsAppDelivery({
    phone,
    name: customerName,
    productTitle: localizedTitle(product as Parameters<typeof localizedTitle>[0], locale),
    downloadLink: orderPageUrl(orderId),
    booksLink: `${SITE_URL.replace(/\/$/, "")}/ebooks`,
    document,
    locale,
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
