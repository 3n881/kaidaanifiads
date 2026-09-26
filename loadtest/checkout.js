// C + D — Order creation and payment verification (Razorpay TEST mode only).
//
// C: POST /api/checkout at a steady rate → measures p95 and Razorpay/DB limits.
// D: for each order, forges a test-mode payment signature with the TEST key
//    secret and fires /api/checkout/confirm AND the webhook (×3) concurrently.
//    Expected: every order ends `paid` exactly once, no 5xx.
//
//   k6 run -e BASE=https://staging.example.com -e SLUG=<slug> \
//          -e KEY_SECRET=<razorpay TEST key secret> -e WEBHOOK_SECRET=<test webhook secret> \
//          loadtest/checkout.js
//
// NEVER point this at production or use live keys: it creates real orders.
import http from "k6/http";
import crypto from "k6/crypto";
import { check, sleep } from "k6";

const { BASE, SLUG, KEY_SECRET, WEBHOOK_SECRET } = __ENV;
if (!BASE || !SLUG) throw new Error("Set BASE and SLUG");
if (/kaydyachaanifaydyach\.com/.test(BASE)) throw new Error("Refusing to run against production");

export const options = {
  scenarios: {
    orders: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 20),
      timeUnit: "1s",
      duration: __ENV.DURATION || "2m",
      preAllocatedVUs: 50,
      maxVUs: 300,
    },
  },
  thresholds: {
    "http_req_duration{step:checkout}": ["p(95)<1500"],
    "http_req_duration{step:confirm}": ["p(95)<800"],
    "checks{check:paid once}": ["rate>0.99"],
    http_req_failed: ["rate<0.02"],
  },
};

const json = { headers: { "Content-Type": "application/json" } };

export default function run() {
  const res = http.post(`${BASE}/api/checkout`, JSON.stringify({ slug: SLUG }), {
    ...json,
    tags: { step: "checkout" },
  });
  if (!check(res, { "checkout 200": (r) => r.status === 200 })) return;
  const order = res.json();
  if (!KEY_SECRET || !order.razorpayOrderId) return; // C only

  const paymentId = `pay_LT${Date.now()}${__VU}${__ITER}`.slice(0, 18);
  const signature = crypto.hmac("sha256", KEY_SECRET, `${order.razorpayOrderId}|${paymentId}`, "hex");

  const reqs = [
    ["POST", `${BASE}/api/checkout/confirm`, JSON.stringify({
      orderId: order.orderId,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }), { ...json, tags: { step: "confirm" } }],
  ];

  if (WEBHOOK_SECRET) {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: {
        id: paymentId,
        order_id: order.razorpayOrderId,
        amount: order.amount,
        status: "captured",
        contact: "+919999999999",
        email: "loadtest@example.com",
      } } },
    });
    const sig = crypto.hmac("sha256", WEBHOOK_SECRET, body, "hex");
    for (let i = 0; i < 3; i++) {
      reqs.push(["POST", `${BASE}/api/razorpay/webhook`, body, {
        headers: { "Content-Type": "application/json", "X-Razorpay-Signature": sig },
        tags: { step: "webhook" },
      }]);
    }
  }

  const results = http.batch(reqs);
  check(results[0], { "confirm 200": (r) => r.status === 200 });
  results.slice(1).forEach((r) => check(r, { "webhook 200": (x) => x.status === 200 }));

  sleep(0.5);
  const page = http.get(`${BASE}${order.orderUrl}`, { tags: { step: "order-page" } });
  check(page, { "paid once": (r) => r.status === 200 && r.body.includes("/api/download/") });
}
