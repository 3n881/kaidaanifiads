// O — What our one server handles directly (requests Cloudflare never caches).
// Safe on production: no orders, no payments, no WhatsApp, no writes.
//
//   /api/health                 → the app only (no database)
//   /order/<random id>?t=<junk> → full page render on our server + one catalog
//                                 read from Supabase (the header search box);
//                                 the bad token stops before any order lookup
//
// Steps up gently so we can see where response times start to climb. Watch
// Lightsail → kaf-a → Metrics (CPU) and Supabase → Reports while it runs.
// For scale: a 1M-view Reel sends ~5 req/s to the server at peak.
//
//   k6 run -e BASE=https://kaydyachaanifayddyacha.com loadtest/origin.js
//   k6 run -e BASE=... -e MAX=100 loadtest/origin.js     # top step, req/s (default 60)
//   k6 run -e BASE=... -e MAX=3 -e SHORT=1 loadtest/origin.js   # smoke test
import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE;
const MAX = Number(__ENV.MAX || 60);
const SHORT = __ENV.SHORT === "1";
if (!BASE) throw new Error("Set -e BASE=<site url>");

const step = (rate, duration) => ({ target: Math.max(1, Math.round(rate)), duration });

export const options = {
  scenarios: {
    origin_steps: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: Math.max(10, MAX),
      maxVUs: Math.max(20, MAX * 4),
      stages: SHORT
        ? [step(MAX, "15s"), step(MAX, "30s"), step(0, "5s")]
        : [
            step(MAX / 6, "30s"), step(MAX / 6, "1m"), // ~ a busy Reel
            step(MAX / 3, "30s"), step(MAX / 3, "1m"),
            step(MAX / 1.5, "30s"), step(MAX / 1.5, "1m"),
            step(MAX, "30s"), step(MAX, "1m"),
            step(0, "30s"),
          ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:health}": ["p(95)<300"],
    "http_req_duration{kind:order}": ["p(95)<1500"],
  },
};

function uuid() {
  const h = () => Math.floor(Math.random() * 16).toString(16);
  const s = (n) => Array.from({ length: n }, h).join("");
  return `${s(8)}-${s(4)}-4${s(3)}-a${s(3)}-${s(12)}`;
}

export default function run() {
  if (Math.random() < 0.5) {
    const r = http.get(`${BASE}/api/health`, { tags: { kind: "health", name: "/api/health" } });
    check(r, { "health 200": (x) => x.status === 200 });
  } else {
    const r = http.get(`${BASE}/order/${uuid()}?t=loadtest`, { tags: { kind: "order", name: "/order/[id]" } });
    // An invalid link shows the friendly "incomplete link" page (200).
    check(r, { "order page answered": (x) => x.status === 200 });
  }
}
