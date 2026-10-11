// A + B — Reel-style spike on the public pages (safe on production: GET only,
// no orders). Every request carries a random Instagram-style query string; the
// Cloudflare rule `strip-tracking-query` must still serve them from the edge.
//
// Traffic mix: 70 % book pages (Reel links), 15 % home, 10 % /ebooks, 5 % /combos.
//
//   k6 run -e BASE=https://kaydyachaanifayddyacha.com loadtest/landing.js
//   k6 run -e BASE=... -e PEAK=500 loadtest/landing.js        # requests/second at the peak (default 300)
//   k6 run -e BASE=... -e ASSETS=1 loadtest/landing.js        # B: also JS/CSS + the main cover
//   k6 run -e BASE=... -e PEAK=5 -e SHORT=1 loadtest/landing.js  # 1-minute smoke test
//
// Realistic target: a 1M-view Reel ≈ 20–30 visitors/s → a few hundred req/s at
// Cloudflare. Don't go far above ~500/s from one place: Cloudflare's own DDoS
// protection may start challenging the load generator, which tests Cloudflare,
// not us. Run in a quiet hour, no deploys during the test.
import http from "k6/http";
import { check } from "k6";
import { Counter, Rate } from "k6/metrics";

const BASE = __ENV.BASE;
const PEAK = Number(__ENV.PEAK || 300);
const ASSETS = __ENV.ASSETS === "1";
const SHORT = __ENV.SHORT === "1";
const SLUGS = (__ENV.SLUGS ||
  "ebooks/rti-adhiniyam-2005-sampurna-guide,ebooks/hindu-uttaradhikar-kanoon-guide,ebooks/jamin-mojani-sampurna-margadarshak,ebooks/atrocity-kayada-combo,combos/rti-brahmastra-3in1,combos/malmatta-vatap-kayadeshir-hakka")
  .split(",");

if (!BASE) throw new Error("Set -e BASE=<site url>");

// Served by Cloudflare without waiting for our server.
const EDGE = new Set(["HIT", "STALE", "UPDATING", "REVALIDATED"]);
const edgeServed = new Rate("cf_edge_served");
const originHits = new Counter("cf_origin_requests");

export const options = {
  scenarios: {
    reel_spike: {
      executor: "ramping-arrival-rate",
      startRate: Math.max(1, Math.round(PEAK / 20)),
      timeUnit: "1s",
      preAllocatedVUs: Math.max(10, PEAK),
      maxVUs: Math.max(20, PEAK * 3),
      stages: SHORT
        ? [
            { target: PEAK, duration: "20s" },
            { target: PEAK, duration: "30s" },
            { target: 0, duration: "10s" },
          ]
        : [
            { target: Math.round(PEAK / 4), duration: "1m" }, // normal day
            { target: PEAK, duration: "30s" }, // Reel goes viral
            { target: PEAK, duration: "3m" }, // sustained peak
            { target: 0, duration: "30s" },
          ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:html}": ["p(95)<400", "p(99)<1000"],
    cf_edge_served: ["rate>0.98"], // the key number: origin offload
  },
};

function pickPath() {
  const r = Math.random();
  if (r < 0.7) return `/${SLUGS[Math.floor(Math.random() * SLUGS.length)]}`;
  if (r < 0.85) return "/";
  if (r < 0.95) return "/ebooks";
  return "/combos";
}

function track(res) {
  const status = res.headers["Cf-Cache-Status"];
  const edge = EDGE.has(status);
  edgeServed.add(edge);
  if (!edge) originHits.add(1);
}

export default function run() {
  const q = `igsh=${Math.random().toString(36).slice(2)}&utm_source=ig`;
  const path = pickPath();
  // `name` groups every random ?igsh= URL under its page (one metric series per
  // page, not per URL; Grafana Cloud's free plan aborts on too many series).
  const res = http.get(`${BASE}${path}?${q}`, { tags: { kind: "html", name: path } });
  check(res, { "html 200": (r) => r.status === 200 });
  track(res);

  if (ASSETS && res.status === 200) {
    const statics = [...res.body.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)]
      .map((m) => m[1])
      .slice(0, 15);
    // The first /media cover in the HTML is the page's main image.
    const cover = (res.body.match(/(?:src|href)="(\/media\/[^"]+-(?:400|600|800)\.webp)"/) || [])[1];
    const urls = [...statics, ...(cover ? [cover] : [])];
    const batch = urls.map((u) => ["GET", `${BASE}${u}`, null, { tags: { kind: "asset", name: u.startsWith("/media/") ? "cover" : "static" } }]);
    for (const r of http.batch(batch)) {
      check(r, { "asset 200": (x) => x.status === 200 });
      track(r);
    }
  }
}
