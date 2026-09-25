import "server-only";
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
const ORDER_ACCESS_SECRET =
  KEY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isRazorpayConfigured = Boolean(KEY_ID && KEY_SECRET);
export const razorpayKeyId = KEY_ID;

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Creates a Razorpay order (amount in rupees → paise). */
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
): Promise<RazorpayOrder> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as RazorpayOrder;
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Verifies a webhook payload against RAZORPAY_WEBHOOK_SECRET. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeEqual(expected, signature);
}

/** Verifies the client checkout callback signature (order_id|payment_id). */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

/** Server-signed proof for the optional post-payment contact form. */
export function createOrderAccessToken(orderId: string): string {
  if (!ORDER_ACCESS_SECRET) return "";
  return crypto
    .createHmac("sha256", ORDER_ACCESS_SECRET)
    .update(`order-contact:${orderId}`)
    .digest("hex");
}

export function verifyOrderAccessToken(
  orderId: string,
  token: string,
): boolean {
  if (!orderId || !token || !ORDER_ACCESS_SECRET) return false;
  return safeEqual(createOrderAccessToken(orderId), token);
}
