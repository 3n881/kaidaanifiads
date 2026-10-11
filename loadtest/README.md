# Load & failure tests (Phase 7)

## Production-safe tests (2026-10-11, site is LIVE with real payments)

Only `landing.js` and `origin.js` may run against `kaydyachaanifayddyacha.com`: GET requests only,
no orders, payments or WhatsApp. `checkout.js` / `download.js` stay staging-only (live Razorpay keys).

| Test | Command (k6 via Docker on the dev PC, or Grafana Cloud k6 with load zone **Mumbai**) | Pass |
|---|---|---|
| Smoke (done 10-11 ✅) | `landing.js -e PEAK=5 -e SHORT=1`, `origin.js -e MAX=3 -e SHORT=1` | 0 errors |
| **Reel spike** | `landing.js -e BASE=https://kaydyachaanifayddyacha.com -e PEAK=300` (then 500) | errors < 1 %, `cf_edge_served` > 98 %, html p95 < 400 ms — ✅ **passed 11 Oct** (Grafana Cloud Mumbai, `cloud-landing.js`): 66,825 req, 300 req/s, 0 errors, p95 17 ms, edge 100 %, server CPU flat |
| **Server direct** | `origin.js -e BASE=https://kaydyachaanifayddyacha.com -e MAX=60` (steps 10→20→40→60 req/s) | errors < 1 %, health p95 < 300 ms, order page p95 < 1.5 s; note where times start to climb — ✅ **ran 11 Oct 20:39–20:46 IST** from the dev PC via Docker (Airtel → Cloudflare Marseille, ~0.25 s network in every number): 11,028 req, **0 errors**; order page median/p95: 10 req/s 0.41/0.56 s · 20 → 0.36/0.75 · 30 → 0.44/0.77 · 40 → 0.51/1.34 · 50–60 → 0.53–0.92/2.2–4.2 s, one ~5 s stall near the top. Comfortable ≈ 30–40 req/s uncached vs ~5 req/s needed for a big Reel (6–8× headroom) |

Docker form (Git Bash): `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/scripts" grafana/k6:0.54.0 run -e BASE=… /scripts/landing.js`

Rules: quiet hour, no Reel that day, no deploys during a run. Watch Lightsail → kaf-a → **Metrics** (CPU),
Cloudflare → Analytics (cache ratio, requests), Supabase → Reports (DB CPU). Run the big tests from **Mumbai**
(Grafana Cloud k6 or a temporary AWS Mumbai machine), not from a home connection — Airtel is routed via
Cloudflare Marseille and the home link becomes the bottleneck. Above ~500 req/s from one source Cloudflare's
DDoS protection may start challenging the generator. Record results in `docs/PROJECT-STATUS.md`.
Note: every `/order/…` request reads the catalog from Supabase once (root layout search box).

Run against **staging** only (a separate deployment behind the same Cloudflare
rules, Razorpay **test** keys, a staging Supabase project or branch).
Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

| Test | Script | Pass criteria |
|---|---|---|
| A. Landing page spike | `k6 run -e BASE=… -e SLUG=… landing.js` | `cf_cache_hit` > 98 %, `http_req_failed` < 1 %, origin requests ≈ 1 per TTL per edge |
| B. Page + assets | `k6 run -e BASE=… -e SLUG=… -e ASSETS=1 landing.js` | same, assets HIT, cover ≤ 60 KB on mobile widths |
| C. Order creation | `k6 run -e BASE=… -e SLUG=… checkout.js` | checkout p95 < 1.5 s, no Razorpay 429, no 5xx |
| D. Payment verification + webhook replay | `k6 run -e BASE=… -e SLUG=… -e KEY_SECRET=… -e WEBHOOK_SECRET=… checkout.js` | "paid once" > 99 %, one row per order, `whatsapp_sends` ≤ 1 |
| E. Download authorization | `k6 run -e BASE=… -e ORDER=… -e TOKEN=… download.js` | valid → 302 signed URL, bad → 403, cap → 429 |

While each test runs, record:

- Cloudflare → Analytics: requests, **cache HIT ratio**, origin requests, bandwidth
- Host: Next.js CPU / memory, 5xx, p50/p95/p99
- Supabase → Reports: DB CPU, connections, API requests, Storage egress
- `select * from funnel_daily;` before/after (D)

**Key number: origin offload = Cloudflare requests ÷ origin requests.**

## Failure drills (manual, staging)

| Drill | How | Expected |
|---|---|---|
| Supabase slow | Pause the staging project / block its host from the origin | Cached pages keep serving (Cloudflare + ISR stale); checkout shows a retryable error |
| Origin overloaded / down | Stop the app | Cloudflare serves cached pages (serve-stale on); `/api/*` fail fast |
| Razorpay slow | Test with network throttling on the Buy flow | Modal shows error, no order is marked paid |
| Webhook delayed | Disable the webhook in Razorpay test dashboard, buy | Confirm alone delivers; re-enable → webhook is a no-op |
| Webhook duplicated | Razorpay dashboard → resend the event 5× | Status changes once; no duplicate WhatsApp |
| Pay, then browser closes | Kill the tab right after paying (before confirm) | Webhook marks paid; `/my-books` on the same phone lists it; WhatsApp to Razorpay contact works |
| Download fails | Airplane mode mid-download | "Download again" on `/order/…` works (new 5-min URL) |
| Success page refreshed | Refresh `/order/…` 10× | No side effects; auto-download fires once per tab |
| Buy pressed twice | Double-tap Buy | One modal, one Razorpay order |
| 100k requests to one page | `landing.js` | Origin ≈ flat |
| Bots on Buy | `checkout.js` with RATE=200 from one IP | Cloudflare challenges above the rule threshold; normal users unaffected |
| Instagram in-app browser | Real Android + iOS, open the Reel link, buy (test mode) | Payment opens, order page loads, PDF saves or "Open in browser" hint shows |
