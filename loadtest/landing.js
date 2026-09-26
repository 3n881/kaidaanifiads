// A + B — Landing page (+ assets) under a Reel-style spike.
// Every request carries a random Instagram-style query string: with the
// Cloudflare cache key set to "_rsc only", these must still be edge HITs.
//
//   k6 run -e BASE=https://staging.example.com -e SLUG=rti-adhiniyam-2005-sampurna-guide loadtest/landing.js
//   k6 run -e BASE=... -e SLUG=... -e ASSETS=1 loadtest/landing.js     # B: include JS/CSS/images
import http from "k6/http";
import { check } from "k6";
import { Counter, Rate } from "k6/metrics";

const BASE = __ENV.BASE;
const SLUG = __ENV.SLUG;
const ASSETS = __ENV.ASSETS === "1";

if (!BASE || !SLUG) throw new Error("Set -e BASE=<staging url> -e SLUG=<book slug>");

const cacheHit = new Rate("cf_cache_hit");
const originHits = new Counter("cf_origin_requests");

export const options = {
  scenarios: {
    reel_spike: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        { target: 200, duration: "1m" },   // warm
        { target: 2000, duration: "30s" }, // Reel goes viral
        { target: 2000, duration: "3m" },  // sustained
        { target: 0, duration: "30s" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:html}": ["p(95)<400", "p(99)<1000"],
    cf_cache_hit: ["rate>0.98"], // the key metric: origin offload
  },
};

function track(res) {
  const status = res.headers["Cf-Cache-Status"];
  cacheHit.add(status === "HIT");
  if (status !== "HIT") originHits.add(1);
}

export default function run() {
  const q = `igsh=${Math.random().toString(36).slice(2)}&utm_source=ig`;
  const res = http.get(`${BASE}/ebooks/${SLUG}?${q}`, { tags: { kind: "html" } });
  check(res, { "html 200": (r) => r.status === 200 });
  track(res);

  if (ASSETS && res.status === 200) {
    const urls = [...res.body.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)]
      .map((m) => m[1])
      .slice(0, 15);
    const covers = [...res.body.matchAll(/src="(https:\/\/[^"]+\.webp)"/g)].map((m) => m[1]);
    const batch = [...urls.map((u) => `${BASE}${u}`), ...covers.slice(0, 1)].map((u) => [
      "GET",
      u,
      null,
      { tags: { kind: "asset" } },
    ]);
    for (const r of http.batch(batch)) {
      check(r, { "asset 200": (x) => x.status === 200 });
      if (r.url.startsWith(BASE)) track(r);
    }
  }
}
