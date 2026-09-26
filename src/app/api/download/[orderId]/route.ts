import { NextResponse, type NextRequest } from "next/server";
import { DatabaseUnavailableError, getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getDeliverableItems, orderPagePath } from "@/lib/orders";
import { createSignedPdfUrl } from "@/lib/delivery";

export const runtime = "nodejs";

// Generous per-order cap: re-downloads on new phones are normal, mass sharing
// of one order link is not.
const DOWNLOAD_LIMIT = Number(process.env.DOWNLOAD_LIMIT || 30);

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
};

// Buyers land here from a tap, so errors are a tiny readable page with a way
// back to their order (messages are fixed strings, never user input).
function fail(message: string, status: number, backHref?: string) {
  const back = backHref
    ? `<p><a href="${backHref}">← तुमच्या ऑर्डरवर परत जा / Back to your order</a></p>`
    : "";
  const html = `<!doctype html><html lang="mr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Download</title><style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#0a2342;line-height:1.5}a{color:#0a2342;font-weight:700}</style></head><body><p>${message}</p>${back}</body></html>`;
  return new NextResponse(html, {
    status,
    headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" },
  });
}

const BUSY =
  "डाउनलोड सेवा सध्या व्यस्त आहे — 1 मिनिटाने पुन्हा प्रयत्न करा. तुमचे पेमेंट सुरक्षित आहे. / Downloads are busy — please try again in a minute. Your purchase is safe.";

/**
 * GET /api/download/{orderId}?t={token}&item={productId}
 * Verifies the order token and paid status, then redirects to a 5-minute
 * Supabase signed URL. PDF bytes never pass through Next.js.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await ctx.params;
  try {
    return await handle(req, orderId);
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) throw error;
    console.error("[download] database unavailable", error.message);
    return fail(BUSY, 503, orderPagePath(orderId));
  }
}

async function handle(req: NextRequest, orderId: string) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const itemParam = Number(req.nextUrl.searchParams.get("item") || 0);

  if (!verifyOrderAccessToken(orderId, token)) {
    return fail("ही डाउनलोड लिंक वैध नाही. / Invalid download link.", 403);
  }

  const back = orderPagePath(orderId);
  const admin = getSupabaseAdmin();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, status, product_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new DatabaseUnavailableError("download order", orderError);
  if (!order || order.status !== "paid") {
    return fail("पेमेंटची पुष्टी अजून झाली नाही. / Payment not confirmed yet.", 409, back);
  }

  const items = await getDeliverableItems(order.product_id);
  const item = itemParam ? items.find((i) => i.id === itemParam) : items[0];
  if (!item) return fail("या ऑर्डरसाठी फाइल सापडली नाही. / File not found for this order.", 404, back);

  const { data: allowed, error } = await admin.rpc("record_order_download", {
    p_order: orderId,
    p_limit: DOWNLOAD_LIMIT,
  });
  if (error) {
    // Counting is best-effort; never block a paying customer on it.
    console.error("[download] counter failed", error.message);
  } else if (!allowed) {
    return fail("या ऑर्डरची डाउनलोड मर्यादा संपली — WhatsApp सपोर्टशी संपर्क करा. / Download limit reached — please contact support on WhatsApp.", 429, back);
  }

  const url = await createSignedPdfUrl(item.pdfPath, `${item.slug}.pdf`);
  if (!url) {
    console.error("[download] could not sign", { orderId, item: item.id });
    return fail(BUSY, 503, back);
  }

  return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
}
