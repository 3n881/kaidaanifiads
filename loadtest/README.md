# Load & failure tests (Phase 7)

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
