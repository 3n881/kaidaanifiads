import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import { sendWhatsAppDelivery } from "./interakt";

const SIGNED_URL_TTL = 60 * 60 * 24 * 30; // 30 days

/** Creates a time-limited signed download URL for a private PDF. */
export async function createSignedPdfUrl(
  pdfPath: string | null,
): Promise<string | null> {
  if (!pdfPath) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from("pdfs")
    .createSignedUrl(pdfPath, SIGNED_URL_TTL);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Fulfils a paid order: generates the signed PDF link, sends it on WhatsApp
 * (Interakt), and marks the order delivered. Idempotent — skips if already
 * delivered, so the webhook and client-confirm can both call it safely.
 */
export async function fulfillOrder(
  orderId: string,
): Promise<{ downloadUrl: string | null; delivered: boolean }> {
  const admin = getSupabaseAdmin();

  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { downloadUrl: null, delivered: false };
  if (order.delivered && order.download_url) {
    return { downloadUrl: order.download_url, delivered: true };
  }

  const { data: product } = await admin
    .from("products")
    .select("title, pdf_path")
    .eq("id", order.product_id)
    .maybeSingle();

  const downloadUrl = await createSignedPdfUrl(product?.pdf_path ?? null);

  let delivered = false;
  const hasWhatsApp = /^[6-9]\d{9}$/.test(
    String(order.whatsapp_number ?? "").replace(/\D/g, "").slice(-10),
  );
  if (downloadUrl && hasWhatsApp) {
    delivered = await sendWhatsAppDelivery({
      phone: order.whatsapp_number,
      name: order.name && order.name !== "Guest" ? order.name : "Customer",
      productTitle: product?.title ?? "",
      downloadLink: downloadUrl,
    });
  }

  await admin
    .from("orders")
    .update({ download_url: downloadUrl, delivered })
    .eq("id", orderId);

  return { downloadUrl, delivered };
}
