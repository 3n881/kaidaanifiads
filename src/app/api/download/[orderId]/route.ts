import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyOrderAccessToken } from "@/lib/razorpay";
import { getDeliverableItems } from "@/lib/orders";
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

function fail(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
  });
}

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
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const itemParam = Number(req.nextUrl.searchParams.get("item") || 0);

  if (!verifyOrderAccessToken(orderId, token)) {
    return fail("Invalid or expired download link.", 403);
  }

  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, product_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid") {
    return fail("Payment not confirmed yet. Please refresh your order page.", 409);
  }

  const items = await getDeliverableItems(order.product_id);
  const item = itemParam ? items.find((i) => i.id === itemParam) : items[0];
  if (!item) return fail("File not found for this order.", 404);

  const { data: allowed, error } = await admin.rpc("record_order_download", {
    p_order: orderId,
    p_limit: DOWNLOAD_LIMIT,
  });
  if (error) {
    // Counting is best-effort; never block a paying customer on it.
    console.error("[download] counter failed", error.message);
  } else if (!allowed) {
    return fail("Download limit reached for this order. Please contact support on WhatsApp.", 429);
  }

  const url = await createSignedPdfUrl(item.pdfPath, `${item.slug}.pdf`);
  if (!url) {
    console.error("[download] could not sign", { orderId, item: item.id });
    return fail("Download is temporarily unavailable. Please try again.", 503);
  }

  return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
}
