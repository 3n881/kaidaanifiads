import "server-only";
import crypto from "crypto";
import { getSupabaseAdmin } from "./supabase/server";
import { SITE_URL } from "./supabase/config";
import { META_PIXEL_IDS } from "./meta-pixel";

// ---------------------------------------------------------------------------
// Meta Conversions API: tells Meta about each paid order from our server, so a
// sale still counts when the buyer's browser blocks the pixel or closes before
// the browser Purchase fires. Same event_id as the browser Purchase (our order
// id, BuyButton) → Meta keeps one of the two. Phone/e-mail are SHA-256 hashed
// (Meta's rule); Meta's cookies, IP and browser come from checkout
// (migration 010) and are cleared after sending.
//
// Server settings (/opt/kaf/app.env):
//   META_CAPI_ACCESS_TOKEN   — from Events Manager → pixel → Settings (secret)
//   META_PIXEL_ID            — optional; default = first NEXT_PUBLIC_META_PIXEL_IDS
//   META_CAPI_TEST_EVENT_CODE — optional; events then show only in Test events
//   META_GRAPH_API_VERSION   — optional; default below
// No token = off (nothing is sent).
// ---------------------------------------------------------------------------

const TOKEN = (process.env.META_CAPI_ACCESS_TOKEN ?? "").trim();
const PIXEL_ID = (process.env.META_PIXEL_ID ?? "").trim() || META_PIXEL_IDS[0] || "";
const TEST_EVENT_CODE = (process.env.META_CAPI_TEST_EVENT_CODE ?? "").trim();
const GRAPH_VERSION = (process.env.META_GRAPH_API_VERSION ?? "").trim() || "v23.0";

export const isMetaCapiConfigured = Boolean(TOKEN && /^\d+$/.test(PIXEL_ID));

/** Meta's cookies + browser details to keep at checkout (only while the pixel is on). */
export const collectMetaSignals = isMetaCapiConfigured;

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

type PaidOrder = {
  id: string;
  status: string;
  amount: number;
  paid_at: string | null;
  product_id: number | null;
  buyer_contact: string | null;
  buyer_email: string | null;
  meta_fbp?: string | null;
  meta_fbc?: string | null;
  client_ip?: string | null;
  client_user_agent?: string | null;
  products?: { slug: string; is_combo: boolean; title: string } | null;
};

const BASE_COLUMNS =
  "id, status, amount, paid_at, product_id, buyer_contact, buyer_email, products(slug, is_combo, title)";
const SIGNAL_COLUMNS = "meta_fbp, meta_fbc, client_ip, client_user_agent";

/**
 * Sends one server-side Purchase for a paid order. Never throws and never sends
 * twice (meta_capi_sent_at claim; without migration 010 Meta's own event_id
 * de-duplication covers webhook retries).
 */
export async function sendMetaPurchase(orderId: string): Promise<void> {
  if (!isMetaCapiConfigured) return;
  const admin = getSupabaseAdmin();
  try {
    // Claim the send first, so two callers (webhook + 10-min check) can't both send.
    let claimed = true;
    let hasSignalColumns = true;
    const claim = await admin
      .from("orders")
      .update({ meta_capi_sent_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "paid")
      .is("meta_capi_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claim.error?.code === "42703") {
      hasSignalColumns = false; // migration 010 not applied yet
    } else if (claim.error) {
      console.error("[meta-capi] claim failed", orderId, claim.error.message);
      return;
    } else {
      claimed = Boolean(claim.data);
    }
    if (!claimed) return; // already sent, or not paid

    const { data, error } = await admin
      .from("orders")
      .select(hasSignalColumns ? `${BASE_COLUMNS}, ${SIGNAL_COLUMNS}` : BASE_COLUMNS)
      .eq("id", orderId)
      .maybeSingle<PaidOrder>();
    if (error || !data || data.status !== "paid") {
      console.error("[meta-capi] order lookup failed", orderId, error?.message);
      if (hasSignalColumns) await releaseClaim(orderId);
      return;
    }

    const ok = await postPurchase(data);
    if (!hasSignalColumns) return;
    if (ok) {
      // Only needed for this one event: don't keep the IP or browser details.
      await admin
        .from("orders")
        .update({ client_ip: null, client_user_agent: null })
        .eq("id", orderId);
    } else {
      await releaseClaim(orderId); // a later webhook retry / check can try again
    }
  } catch (error) {
    console.error("[meta-capi] failed", orderId, String(error));
  }
}

async function releaseClaim(orderId: string) {
  await getSupabaseAdmin().from("orders").update({ meta_capi_sent_at: null }).eq("id", orderId);
}

async function postPurchase(order: PaidOrder): Promise<boolean> {
  const product = order.products;
  const userData: Record<string, unknown> = { country: [sha256("in")] };
  if (order.buyer_contact) userData.ph = [sha256(`91${order.buyer_contact}`)];
  if (order.buyer_email) userData.em = [sha256(order.buyer_email.trim().toLowerCase())];
  if (order.meta_fbp) userData.fbp = order.meta_fbp;
  if (order.meta_fbc) userData.fbc = order.meta_fbc;
  if (order.client_ip) userData.client_ip_address = order.client_ip;
  if (order.client_user_agent) userData.client_user_agent = order.client_user_agent;

  const event = {
    event_name: "Purchase",
    event_time: Math.floor(new Date(order.paid_at ?? Date.now()).getTime() / 1000),
    event_id: order.id, // = the browser Purchase's eventID → counted once
    action_source: "website",
    // The book page (where Buy was pressed) — never the order page (its URL holds the access token).
    event_source_url: product
      ? `${SITE_URL}/${product.is_combo ? "combos" : "ebooks"}/${product.slug}`
      : SITE_URL,
    user_data: userData,
    custom_data: {
      currency: "INR",
      value: order.amount,
      content_ids: order.product_id ? [String(order.product_id)] : [],
      content_type: "product",
      ...(product ? { content_name: product.title } : {}),
      order_id: order.id,
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [event],
          ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      // Meta's error text never contains the token (it is only in the URL).
      console.error("[meta-capi] Meta refused", order.id, res.status, (await res.text()).slice(0, 300));
      return false;
    }
    console.error("[meta-capi] purchase sent", order.id, TEST_EVENT_CODE ? "(test)" : "");
    return true;
  } catch (error) {
    console.error("[meta-capi] request failed", order.id, String(error));
    return false;
  }
}
