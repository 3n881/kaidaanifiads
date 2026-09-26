import "server-only";
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
// Signs /order and /api/download links. Prefer a dedicated secret so rotating
// payment keys doesn't invalidate customers' saved order links.
const ORDER_ACCESS_SECRET =
  process.env.ORDER_ACCESS_SECRET ||
  KEY_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

export const isRazorpayConfigured = Boolean(KEY_ID && KEY_SECRET);
export const razorpayKeyId = KEY_ID;

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Creates a Razorpay order (amount in rupees → paise). `receipt` is our
 *  order UUID so Razorpay dashboard rows map back to `orders.id`. */
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
): Promise<RazorpayOrder> {
  const request = () =>
    fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: razorpayAuthHeader(),
      },
      body: JSON.stringify({
        amount: Math.round(amountRupees * 100),
        currency: "INR",
        receipt,
        notes: { order_id: receipt },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(RAZORPAY_TIMEOUT_MS),
    });

  // One quick retry on a timeout / 5xx / 429: a blip shouldn't cost a sale.
  // A duplicate unpaid Razorpay order is harmless (it simply expires).
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await request();
      if (res.ok || (res.status < 500 && res.status !== 429)) break;
    } catch (error) {
      if (attempt === 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (!res || !res.ok) {
    throw new Error(`Razorpay order failed: ${res?.status} ${await res?.text()}`);
  }
  return (await res.json()) as RazorpayOrder;
}

const RAZORPAY_TIMEOUT_MS = 8_000;

export function razorpayAuthHeader(): string {
  return "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
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

/** Server-signed proof of order ownership: gates the /order page, downloads
 *  and the optional post-payment contact form. */
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

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  status: string; // created | authorized | captured | refunded | failed
  contact?: string;
  email?: string;
}

async function razorpayGet<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    headers: { Authorization: razorpayAuthHeader() },
    cache: "no-store",
    signal: AbortSignal.timeout(RAZORPAY_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Razorpay GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** Payments attempted against one Razorpay order (for reconciliation). */
export async function fetchOrderPayments(razorpayOrderId: string): Promise<RazorpayPayment[]> {
  const data = await razorpayGet<{ items: RazorpayPayment[] }>(
    `/orders/${encodeURIComponent(razorpayOrderId)}/payments`,
  );
  return data.items ?? [];
}

/** All payments created in a time window, newest first (paginated). */
export async function listPayments(
  fromUnix: number,
  toUnix: number,
  maxPages = 20,
): Promise<RazorpayPayment[]> {
  const all: RazorpayPayment[] = [];
  for (let page = 0; page < maxPages; page++) {
    const data = await razorpayGet<{ items: RazorpayPayment[] }>(
      `/payments?from=${fromUnix}&to=${toUnix}&count=100&skip=${page * 100}`,
    );
    all.push(...(data.items ?? []));
    if ((data.items ?? []).length < 100) break;
  }
  return all;
}
