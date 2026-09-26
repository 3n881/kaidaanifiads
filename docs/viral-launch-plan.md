# Viral Launch Readiness — Audit, Plan & Tracker

> Living document. Update the checkboxes as work lands.
> Legend: `[x]` done · `[ ]` not done · `[~]` partially done · **(owner)** = needs the business owner / dashboard access, not code.
> Audit date: 2026-09-26 · Next.js 16.3 (App Router) · React 19.2 · Supabase · Razorpay · Cloudflare (planned)

Traffic pattern: the client is a **creator who posts Reels 2–3 times a week, each with millions of views** — recurring, organic spikes (≈ 150 a year), not a one-off paid campaign. Every spike must feel smooth.

Business flow we are protecting:

```
Reel → book landing page → Buy Now → Razorpay → payment → immediate ebook download
(no login · no account · no cart · no pre-purchase details · WhatsApp/contact is optional AFTER purchase)
```

Core scaling rule: **anonymous browsing must be served by Cloudflare/Next cache, never by Next.js render or Supabase per visit.**

## ▶ Status at a glance (updated 2026-09-26)

| Phase | What | Status |
|---|---|---|
| 0 | Business setup (keys, PDFs, hosting, secrets) | **not started — owner** |
| 1 | Payment / order / download correctness | **code done** · migrations 001+002 **applied & verified** · paid end-to-end test pending (needs a PDF + Razorpay test keys) |
| 2 | Page weight & caching in code | **done** |
| 3 | Images | **done** (no existing covers → no backfill needed) · real-device LCP pending |
| 4 | Supabase hardening | checks written (`supabase/checks/verify.sql`) · **run pending — owner** |
| 5 | Cloudflare configuration + AWS hosting | Cloudflare rules + AWS options (5b) written · **setup pending — owner** |
| 6 | Observability & funnel | funnel view + log tags done · dashboards/alerts pending |
| 7 | Load & failure testing | k6 scripts written (`loadtest/`) · **runs pending (needs staging)** |
| 8 | Go-live & per-Reel runbook | pending |
| 9 | Supabase / Razorpay outage handling | **code done & tested** (simulated outage) · owner settings pending |

### Your next actions (in order)

1. ~~Run migrations 001 + 002~~ ✅ done (verified 2026-09-26: columns, functions, view exist; anon cannot call the functions or read the funnel).
2. Add env vars: `ORDER_ACCESS_SECRET`, `ADMIN_EMAILS`, Razorpay **test** keys + webhook secret (see `.env.local.example`).
3. Dashboard → upload a PDF for every ebook; tick member books on every combo.
4. Hosting = **two always-on AWS Lightsail servers + Cloudflare Load Balancing** (≈ ₹4,900 of ₹7,000/month incl. Supabase). Docker/deploy code is done → follow `docs/deploy-lightsail.md`.
5. One Razorpay **test-mode** purchase on a phone, opened from an Instagram link → tick 1.14.
6. Run `supabase/checks/verify.sql` → tick Phase 4.
7. Stand up staging + Cloudflare rules → run `loadtest/` → tick Phase 7.

---

## 0. Anchors — what already existed before this work (verified in code)

| Area | Status | Where |
|---|---|---|
| Book/combo pages statically generated + ISR (5 min) — Supabase NOT hit per visit | [x] | `src/app/ebooks/[slug]/page.tsx`, `src/app/combos/[slug]/page.tsx` |
| Home / catalog pages ISR 5 min | [x] | `src/app/page.tsx`, `src/app/ebooks/page.tsx`, `src/app/combos/page.tsx` |
| Policy / about / contact pages fully static | [x] | build output `○` |
| One catalog query per render (React `cache()`) | [x] | `src/lib/products.ts` |
| Admin edits call `revalidatePath` for public pages | [x] | `src/app/dashboard/actions.ts` |
| Anonymous checkout — no login/cart/details before payment | [x] | `BuyButton.tsx`, `api/checkout` |
| Server-authoritative price (read from DB by slug) | [x] | `api/checkout` |
| Razorpay order created server-side; amount fixed in order | [x] | `src/lib/razorpay.ts` |
| Payment signature verified server-side (HMAC, timing-safe) | [x] | `api/checkout/confirm` |
| Webhook signature verified on raw body (HMAC, timing-safe) | [x] | `api/razorpay/webhook` |
| Webhook as backup path to client confirm | [x] | same |
| Razorpay script loaded lazily on Buy (not render-blocking) | [x] | `BuyButton.tsx` |
| Private `pdfs` bucket; PDFs delivered via signed URLs | [x] | `schema.sql`, `delivery.ts` |
| Optional WhatsApp after payment (HMAC order token) | [x] | `api/orders/contact` |
| Service-role key only in `server-only` modules; `.env*` gitignored | [x] | `lib/supabase/server.ts`, `.gitignore` |
| RLS: anon reads active products only; no anon access to orders | [x] | `schema.sql` |
| Auth only on `/dashboard` (public pages untouched) | [x] | `src/proxy.ts` matcher |
| Admin allowlist fails closed | [x] | `src/lib/auth.ts` |
| Demo checkout disabled in production | [x] | `api/checkout` |
| Self-hosted fonts via `next/font` | [x] | `layout.tsx` |
| No third-party analytics/tracking scripts | [x] | — |
| Upload validation (5 MB images, 50 MB PDFs, MIME checks) | [x] | `dashboard/actions.ts` |

### Live configuration state (checked 2026-09-26; secret values not read)

| Setting | State |
|---|---|
| Supabase URL / anon / service role | set |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | **EMPTY** |
| `INTERAKT_API_KEY` / `INTERAKT_TEMPLATE_NAME` | **EMPTY** |
| `ADMIN_EMAILS` | **EMPTY** (nobody can log in to `/dashboard`) |
| `ORDER_ACCESS_SECRET` | **not set** (new) |
| Product PDFs (`products.pdf_path`) | **0 of 13** — every checkout returns 409 "unavailable" |
| Combo members (`combo_items`) | **0 rows** — combos have no books assigned |
| Product covers (`cover_image`) | **0** — all books show gradient placeholders |
| Orders in DB | 0 |
| Migrations 001 / 002 applied | **yes** (verified) |
| Hosting target | **2 × AWS Lightsail (Mumbai, zones a + b) + Cloudflare Free + Load Balancing + Supabase Pro** (≈ ₹4,900/month of ₹7,000) |

---

## 1. Audit findings

### 1.1 Route matrix

| Route | Rendering | DB per request | Cacheable | Cloudflare | Edge TTL | Security notes |
|---|---|---|---|---|---|---|
| `/` | ISR 5m | no | yes | cache | 5m (origin) + purge | — |
| `/ebooks`, `/combos` | ISR 5m | no | yes | cache | 5m (origin) + purge | `?lang=` handled client-side |
| `/ebooks/[slug]`, `/combos/[slug]` | SSG+ISR 5m | no | **yes — primary landing** | cache | 5m (origin) + purge | Instagram adds `igsh`/`fbclid`/`utm_*` → strip from cache key |
| `/about`, `/contact`, `/terms`, policies | static | no | yes | cache | 1d | — |
| `/my-books` | static shell + server action | action only | no | bypass | — | fixed enumeration hole |
| `/order/[id]` *(new)* | dynamic | yes | **never** | bypass | — | token in URL, `no-referrer`, noindex |
| `/api/download/[id]` *(new)* | dynamic | yes | **never** | bypass | — | 5-min signed URL redirect, capped |
| `/api/checkout` | dynamic POST | yes | never | bypass + rate limit | — | bot target |
| `/api/checkout/confirm` | dynamic POST | yes | never | bypass | — | signature-verified |
| `/api/orders/contact` | dynamic POST | yes | never | bypass | — | capped sends |
| `/api/razorpay/webhook` | dynamic POST | yes | never | bypass, skip bot rules | — | HMAC verified |
| `/dashboard/*`, `/auth/callback`, `/api/auth/*` | dynamic | yes | never | bypass | — | admin only |
| `/_next/static/*` | immutable | no | yes | cache | 1y | — |
| `/_next/image` | optimizer (CPU) | no | yes | cache | 30d | origin CPU if uncached |

Verified on `next start`: book/home `s-maxage=300, stale-while-revalidate=…`; static pages `s-maxage=31536000`; `/api/*`, `/order/*`, `/my-books` → `private, no-store, max-age=0`.

### 1.2 Critical security issues

| # | Issue | Fix | Status |
|---|---|---|---|
| S1 | `/my-books` returned 30-day download links for **any** typed phone number | Links now only go **to** that WhatsApp number; browser gets a generic reply; device list from localStorage | [x] |
| S2 | Signed PDF URLs lived 30 days and were stored in `orders.download_url` | 5-minute URLs minted per click by `/api/download`; column cleared by migration 001 | [x] (after migration) |
| S3 | `/api/orders/contact` could resend WhatsApp without limit | `claim_whatsapp_send` cap (default 3/order), link = order page | [x] |
| S4 | No throttling on `/api/checkout` | Cloudflare rate-limit rule (Phase 5) | [ ] owner |
| S5 | `pdfPath` part of public product payload | explicit public column list | [x] |
| S6 | No dedicated order-token secret | `ORDER_ACCESS_SECRET` supported | [x] code · [ ] owner sets env |

### 1.3 Payment / download reliability issues

| # | Issue | Fix | Status |
|---|---|---|---|
| R1 | Pay → close browser → no way to get the book | order saved to localStorage before payment; webhook stores Razorpay contact/email; My Books → WhatsApp | [x] |
| R2 | No success page (refresh lost the download) | `/order/[id]?t=…` refreshable page | [x] |
| R3 | `window.open` after `await` blocked in Instagram browser | same-tab navigation; in-app browser hint | [x] |
| R4 | Confirm + webhook race; unconditional `paid` | `markOrderPaid` atomic `UPDATE … WHERE status <> 'paid'` | [x] |
| R5 | No UNIQUE on Razorpay ids | partial unique indexes (migration 001) | [x] (after migration) |
| R6 | Webhook didn't check amount | amount must equal `orders.amount × 100` | [x] |
| R7 | `payment.failed` ignored; no `paid_at`; no download tracking | handled; columns added | [x] |
| R8 | Confirm crashed on malformed JSON | guarded parse → 400 | [x] |
| R9 | Combos undeliverable (no PDF upload for combos) | combo delivers each member book's PDF; checkout validates | [x] code · [ ] owner assigns members |
| R10 | Razorpay `receipt` not linkable | receipt + `notes.order_id` = our UUID | [x] |

### 1.4 Viral-traffic / performance bottlenecks

| # | Issue | Fix | Status |
|---|---|---|---|
| T1 | Instagram query params → 0 % Cloudflare HIT | cache key: query string include **only `_rsc`** | [ ] owner (Phase 5) |
| T2 | Admin edits don't purge Cloudflare | `src/lib/cdn.ts` purge on save | [x] code · [ ] owner token |
| T3 | Full catalog in every page. Measured book page: 161 KB raw → **154 KB raw / 21.6 KB gzip** after fix (initial ~60 KB compressed estimate was too high; rest is Tailwind classes + RSC payload) | slim search index | [x] |
| T4 | Covers sent as originals (up to 5 MB) | 200/400/800 WebP variants, srcset, lazy, 1-year cache | [x] |
| T5 | `hero.png` 475 KB | `hero.webp` 32 KB (17 KB delivered on mobile) | [x] |
| T6 | `Reveal` hid content until JS ran | visible server HTML; only below-fold sections animate | [x] |
| T7 | `middleware.ts` deprecated | `proxy.ts` | [x] |
| T8 | No security headers, `X-Powered-By` | added / removed | [x] |
| T9 | No Razorpay preconnect | preconnect + prewarm on touch/hover | [x] |
| T10 | Navbar logo requested at `w=1920` and preloaded | display-size dims (`w=640`, 4.8 KB), no preload | [x] |
| T11 | 7 font files | trim weights | [ ] P2 |
| T12 | Real LCP/INP/CLS/TTFB, live cache headers | needs deployed URL | [ ] Phase 7 |

---

## 2. Request flows

**Before**

```
Visitor → (no CDN) → Next.js ISR cache → HTML → cover originals from Supabase
Buy → /api/checkout → Razorpay popup → /api/checkout/confirm → 30-day signed URL in modal (lost on refresh)
Webhook → mark paid → fulfil (race with confirm)
My Books → any phone number → 30-day links
```

**Now (code) + target (with Cloudflare)**

```
Reel → Cloudflare (cache key = path + `_rsc` only)
        ├─ HIT (~99%) → HTML / JS / images from edge   ← no Next.js, no Supabase
        └─ MISS → Next.js ISR cache → (≤ every 5 min) Supabase
Buy → POST /api/checkout (bypass) → DB price → Razorpay order (receipt = our UUID) → saved on device
    → Razorpay popup → POST /api/checkout/confirm (verify sig, atomic created→paid)
    → same-tab /order/{id}?t={token}   ← refreshable; auto-download once; "Download again"
    → GET /api/download/{id}?t={token}&item={bookId} → verify paid → 5-min signed URL → 302 Supabase
Webhook (backup) → verify sig + amount → atomic → store Razorpay contact/email → optional auto-WhatsApp
My Books → "this phone" (localStorage) + "send to my WhatsApp" (only the number's owner receives)
```

### Buyer flow as implemented (no sign-in anywhere)

1. Reel link → `/ebooks/<slug>?igsh=…` (cached page; first screen shows cover, title, price, **Buy**, "no login needed").
2. Tap **Buy** (main button or sticky bar) → modal → `POST /api/checkout` (server price) → order remembered on this phone → Razorpay popup opens (script pre-warmed on touch).
3. Pay (UPI/card) → `POST /api/checkout/confirm` verifies signature → **same tab** goes to `/order/<id>?t=<token>`.
4. Order page **auto-downloads** the PDF once (5-minute signed link) and always shows **"Download" buttons** as the fallback (one per book for combos) + Instagram "Open in browser" hint + optional WhatsApp.
5. Refresh / come back later → same page works; `/my-books` on the same phone lists it; other phone → "send to my WhatsApp".
6. If the browser dies right after paying → webhook marks it paid; step 5 recovers it.

---

## 3. Phase plan

### Phase 0 — Prerequisites & business setup **(owner)**

- [ ] Confirm hosting (Vercel vs VPS/container). **Vercel:** Cloudflare DNS-only (grey cloud) is the supported setup; proxying Vercel through Cloudflare conflicts with Vercel's CDN/firewall — rely on Vercel's edge cache (it honours the same `s-maxage` headers) and skip Phase 5 cache rules. **VPS/container:** full Phase 5.
- [ ] Set `ADMIN_EMAILS`.
- [ ] Razorpay: KYC; **test** keys for staging, **live** keys for production.
- [ ] Razorpay: **auto-capture** on (Settings → Payment capture).
- [ ] Razorpay webhook → `https://<domain>/api/razorpay/webhook`, events `payment.captured`, `order.paid`, `payment.failed`; secret → `RAZORPAY_WEBHOOK_SECRET`.
- [ ] `ORDER_ACCESS_SECRET` = `openssl rand -hex 32` (set once; changing it breaks customers' saved links).
- [ ] Interakt: approved template, body `{{1}}` name, `{{2}}` product, `{{3}}` link (the link is now the order page, not the file).
- [ ] Upload a PDF for **every** single ebook.
- [ ] For every combo, tick its member books.
- [ ] `NEXT_PUBLIC_SITE_URL` = real https domain (used in WhatsApp links and purge).
- [ ] Supabase: confirm plan limits (egress, API rate), enable backups/PITR.
- [ ] Decide `AUTO_WHATSAPP_ON_PAYMENT` (send order link to the phone entered in Razorpay automatically).

### Phase 1 — Payment, order & download correctness — P0

- [x] 1.1 `supabase/migrations/001_viral_readiness.sql` — new columns, unique Razorpay ids, indexes, `record_order_download()` / `claim_whatsapp_send()` (service-role only). *Applied and verified.*
- [x] 1.2 `src/lib/orders.ts` — atomic `markOrderPaid` shared by confirm + webhook (`newlyPaid`).
- [x] 1.3 Confirm route — guarded JSON, atomic transition, returns order page URL (no file URL).
- [x] 1.4 Webhook — amount check, stores Razorpay contact/email, `payment.failed` (created→failed only), idempotent.
- [x] 1.5 Checkout — UUID first → Razorpay `receipt` + `notes.order_id`; validates deliverable PDFs (combos via members).
- [x] 1.6 `/api/download/[orderId]` — token + paid + item-belongs-to-order → 5-min signed URL with filename → 302; `no-store`, `no-referrer`; count + cap (`DOWNLOAD_LIMIT`=30).
- [x] 1.7 `/order/[orderId]` — refreshable, noindex, auto-download once (single book), per-book "Download", pending auto-refresh, optional WhatsApp.
- [x] 1.8 `BuyButton` — saves order on device at checkout; same-tab redirect after confirm (falls back to order page even if confirm fails → webhook completes it).
- [x] 1.9 `delivery.ts` — no stored URLs; WhatsApp sends order-page link; capped (`WHATSAPP_SEND_LIMIT`=3); admin resend bypasses cap.
- [x] 1.10 `/api/orders/contact` — capped send, no reset loop.
- [x] 1.11 `/my-books` — device list + send-to-own-WhatsApp; no links returned for typed numbers; no enumeration.
- [x] 1.12 `pdf_path` removed from public product payload (verified: no `pdfPath` in HTML).
- [x] 1.13 Admin orders — Razorpay contact fallback + download count columns; combo form explains member-PDF delivery.
- [~] 1.14 Verify — `next build` ✅, `eslint .` ✅, localhost smoke tests ✅ (bad token → 403/404, no-PDF checkout → 409, bad JSON → 400, unsigned webhook → 400, My Books on mobile). **Pending:** paid end-to-end (needs migration 001 + a PDF), Phase 7 D replay, Instagram in-app browser on real phones.
- [x] 1.15 In-app browser hint ("⋮ → Open in browser") on the order page.
- [x] 1.16 Unpaid order > 30 min shows "payment not completed + retry" instead of spinning.
- [x] 1.17 Mobile landing (spec §3 "above the fold"): compact cover so **cover, title, price, Buy, "no login needed · instant PDF"** fit the first 375×812 screen; sticky mobile Buy bar when the main button scrolls away; WhatsApp/back-to-top buttons lift above it; badge no longer covers the cover label. Verified in browser: Buy → modal opens without sign-in → `/api/checkout` (currently 409 only because no PDF is uploaded).

**Regression watch:** migration 001 must precede deploy. Old 30-day links stop working after migration (none exist — 0 orders).

### Phase 2 — Page weight & caching in code — P0/P1

- [x] 2.1 `src/lib/cdn.ts` purge (`CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`, *Cache Purge* only) from `revalidatePublic`: `/` + prefixes `/ebooks`, `/combos` (detail pages + `?_rsc=` variants). No-op when unset. [ ] **(owner)** create token + env.
- [x] 2.2 Slim search index in layout instead of full catalog.
- [x] 2.3 `middleware.ts` → `proxy.ts`.
- [x] 2.4 Security headers (HSTS 180d, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy), `poweredByHeader: false`, `no-store` for `/api/*`, `/order/*`, `/my-books`. CSP deliberately not added yet (Razorpay domains — add after checkout testing).
- [x] 2.5 `Reveal` — visible server HTML; below-fold sections animate.
- [x] 2.6 Razorpay `preconnect` on product pages; `checkout.js` prewarm on pointer enter/down.
- [x] 2.7 Fixed 4 pre-existing lint errors; `eslint .` clean.
- [x] 2.8 Headers verified on `next start` (see 1.1).

### Phase 3 — Images — P1

- [x] 3.1 Cover upload → `sharp` → `slug-v<ts>-{200,400,800}.webp`, `cacheControl` 1 year.
- [x] 3.2 `CoverImage` — `srcset`/`sizes`, width/height, `loading=lazy` on cards, `fetchpriority=high` + `<link rel=preload imagesrcset>` for the detail cover only.
- [x] 3.3 Backfill — not needed (0 covers exist).
- [x] 3.4 `hero.webp` (475 KB → 32 KB; 17 KB delivered), logo sized to display, `images.minimumCacheTTL` 31 days.
- [ ] 3.5 Measure original vs delivered cover bytes + LCP on a 360 px phone — **needs a real cover + deployed URL**.

### Phase 4 — Supabase hardening — P1

- [ ] 4.1 **(owner)** Run `supabase/checks/verify.sql` (EXPLAIN plans, RLS, policies, buckets, grants, unique indexes, catalog readiness).
- [ ] 4.2 Confirm RLS/policies/buckets per the expected results in that file.
- [x] 4.3 Helper functions granted to `service_role` only (migration 001).
- [ ] 4.4 Supabase dashboard: API rate limits and egress quota for the plan.
- [ ] 4.5 Rotate the service-role key if it was ever shared outside server env.
- Note: all DB access is PostgREST over HTTPS (supabase-js) — no Postgres connection pool to exhaust from Next.js; public pages don't query per visit.

### Phase 5 — Cloudflare configuration **(owner)** — P0 (VPS/container hosting)

Base settings:
- [ ] DNS: apex + `www` proxied (orange cloud).
- [ ] SSL/TLS **Full (strict)** with a valid origin cert (Cloudflare Origin CA is fine).
- [ ] Always Use HTTPS on; Automatic HTTPS Rewrites on; Min TLS 1.2; TLS 1.3 on.
- [ ] HSTS in Cloudflare only after a week of verified HTTPS (app already sends 180-day HSTS).
- [ ] HTTP/2 + HTTP/3 on; **0-RTT off**.
- [ ] Compression: Brotli/Zstd (automatic).
- [ ] **Smart Tiered Cache** on.
- [ ] Rocket Loader **off** (breaks React). Email obfuscation off (hydration mismatch).
- [ ] Bot Fight Mode **off** (can't be skipped per path; blocks webhook/in-app browsers). Use WAF rules below.
- [ ] Origin locked to Cloudflare IPs or Authenticated Origin Pulls.
- [ ] API token for purge (Zone → Cache Purge) → `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`.

Cache Rules (in this order):

| # | Name | Expression | Action | Edge TTL | Browser TTL | Reason / risk |
|---|---|---|---|---|---|---|
| 1 | `bypass-dynamic` | `starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/dashboard") or starts_with(http.request.uri.path, "/auth/") or starts_with(http.request.uri.path, "/order") or starts_with(http.request.uri.path, "/my-books") or starts_with(http.request.uri.path, "/download") or starts_with(http.request.uri.path, "/checkout") or starts_with(http.request.uri.path, "/payment") or starts_with(http.request.uri.path, "/webhook") or starts_with(http.request.uri.path, "/account") or starts_with(http.request.uri.path, "/library") or starts_with(http.request.uri.path, "/admin") or not http.request.method in {"GET" "HEAD"}` | Bypass cache | — | — | Payment/admin/personal never cached. No risk. |
| 2 | `static-immutable` | `starts_with(http.request.uri.path, "/_next/static/")` | Eligible | 1 year | respect origin (`immutable`) | Content-hashed. No risk. |
| 3 | `next-image` | `http.request.uri.path eq "/_next/image"` | Eligible; full query string in key | 30 days | 7 days | Protects origin CPU. Risk: same-URL replacement stays stale → keep versioned names. |
| 4 | `public-assets` | `http.request.uri.path in {"/favicon.ico" "/robots.txt" "/sitemap.xml"} or starts_with(http.request.uri.path, "/brand/")` | Eligible | 1 day | 1 day | Logo change needs purge. |
| 5 | `public-html` | `http.request.method in {"GET" "HEAD"} and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/ebooks") or starts_with(http.request.uri.path, "/combos") or http.request.uri.path in {"/about" "/contact" "/terms" "/privacy-policy" "/refund-policy" "/shipping-policy" "/cancellation-policy" "/data-deletion"})` | Eligible; **Cache key → Query string → include only `_rsc`**; serve stale while revalidating | **respect origin** (`s-maxage=300`) | respect origin | Absorbs viral traffic. `_rsc` must stay in the key (RSC vs HTML). Do **not** override to 1 h: each app container/server has its own ISR cache, so after an edit a purge can refetch a copy up to 5 min old — with origin TTL it self-heals in ≤ 5 min; with a 1 h override it could stick for an hour. With Tiered Cache, origin sees ~1 request per page per 5 min. |

**Never** add a global "Cache Everything" rule.

WAF / rate-limit rules:

| Name | Expression | Action | Reason |
|---|---|---|---|
| `allow-razorpay-webhook` | `http.request.uri.path eq "/api/razorpay/webhook"` | Skip managed rules, rate limiting, bot rules | HMAC protects it; blocking = lost fulfilment |
| `checkout-rate-limit` | `http.request.uri.path eq "/api/checkout" and http.request.method eq "POST"` | > 30 req / 10 s per IP → Managed Challenge 60 s | Stops bots; high threshold because Jio/Airtel CGNAT shares IPs |
| `download-rate-limit` | `starts_with(http.request.uri.path, "/api/download/")` | > 30 req / 10 s per IP → block 60 s | Limits scraping of order links |
| `mybooks-rate-limit` | `http.request.uri.path eq "/my-books" and http.request.method eq "POST"` | > 5 req / 60 s per IP → Managed Challenge | Limits WhatsApp-send abuse |
| `block-bad-methods` | `not http.request.method in {"GET" "HEAD" "POST" "OPTIONS"}` | Block | No public PUT/PATCH/DELETE |

(Free plan allows 1 rate-limit rule — prioritise `checkout-rate-limit`.)

Verification after DNS is proxied:

```bash
curl -sI "https://<domain>/ebooks/<slug>?igsh=test1" | grep -i "cf-cache-status\|cache-control"
curl -sI "https://<domain>/ebooks/<slug>?igsh=test2" | grep -i "cf-cache-status"   # expect HIT
curl -sI -X POST "https://<domain>/api/checkout" | grep -i "cf-cache-status"      # expect DYNAMIC/BYPASS
curl -sI "https://<domain>/_next/static/<chunk>.js" | grep -i "cf-cache-status\|cache-control"
```

### Phase 5b — Hosting on AWS (decided: AWS)

Cloudflare stays in front as the CDN (Phase 5 rules apply unchanged); AWS only runs the Next.js origin. Pick the AWS region closest to the Supabase project region (ideally both `ap-south-1` Mumbai) — every checkout/confirm/webhook call goes app → Supabase.

| Option | What | Pros | Cons | Fit |
|---|---|---|---|---|
| **A. ECS Fargate + ALB** (recommended) | Docker image (`output: "standalone"`), 2+ tasks behind an Application Load Balancer, auto-scale on CPU | No servers to patch; 2 tasks = no single point of failure for payments; scales in minutes; Cloudflare → ALB is a standard setup | ~US$40–70/month (ALB + 2 small tasks); ISR cache is per task (after an admin edit, other tasks refresh within the 5-min revalidate) | Best balance for a payment site |
| **B. Lightsail VMs + Docker (chosen, ×2)** | Same image on two VMs behind Cloudflare Load Balancing | Fits budget (~US$29/month for both + LB); simple | You patch the OS (unattended upgrades on); single VM would be a SPOF — hence two | **Chosen** |
| C. AWS Amplify Hosting | Managed Next.js hosting on AWS CloudFront | Git-push deploys, no Docker | Has its own CDN — putting the Cloudflare proxy in front double-caches (same issue as Vercel); **check Amplify supported Next.js versions before choosing (we are on 16.3)** | Only if Cloudflare is DNS-only |
| D. OpenNext / SST on Lambda + CloudFront | Serverless Next.js | Scales to zero and to spikes | Most moving parts (S3 + DynamoDB + SQS for ISR); Next 16 support depends on the OpenNext release | Not needed — Cloudflare already absorbs spikes |

#### Decision: two always-on Lightsail servers (≈ ₹4,900 / month of ₹7,000)

Fargate (Option A) plus Supabase Pro exceeds the budget. **Chosen: Option B ×2** — two Lightsail servers in different Mumbai zones behind **Cloudflare Load Balancing**, running permanently. Full steps, costs and failover drill: `docs/deploy-lightsail.md`.

| Item | Plan | ≈ US$/mo | ≈ ₹/mo |
|---|---|---|---|
| Lightsail server A (`ap-south-1a`) | 2 GB RAM / 2 vCPU, static IP, ~3 TB transfer | 12 | 1,000 |
| Lightsail server B (`ap-south-1b`) | same | 12 | 1,000 |
| Snapshots (both) | daily automatic | 4 | 340 |
| Cloudflare | Free plan + Load Balancing add-on (2 origins, health checks) | 5 | 425 |
| Supabase | Pro (never pauses, 250 GB egress, daily backups) | 25 | 2,100 |
| **Total** | | **~58** | **~4,900** |
| Headroom | Supabase egress overage, bigger plans | | ~2,100 |

Why two servers when one has enough capacity:
- One 1M-view Reel is estimated to send ~5 requests/second to the servers at peak (checkout, confirm, order page, download). Cloudflare serves everything else. One 2 GB server handles ~100× that.
- The second server is for **availability**. Spikes happen 2–3× a week, so a server fault, reboot or AWS zone problem will eventually land on a spike. With two servers Cloudflare moves traffic to the healthy one within ~1 minute. The ~₹1,600/month it adds is less than one lost spike.
- Each server also runs two app containers → deploys and single-process crashes never cause a gap.

Remaining single points (managed, cannot be doubled on this budget): **Supabase** and **Razorpay**. Cached pages survive both; checkout needs both.

- Do **not** use Supabase Free for production: it pauses on inactivity and has 5 GB egress.

Watch these costs:
- **Supabase egress** — PDFs download from Supabase via signed URLs (not through Cloudflare). 250 GB included; e.g. 5,000 sales/week × 5 MB × 1–2 downloads ≈ 200 GB/month; overage ≈ US$0.09/GB. Keep PDFs < 5 MB.
- Covers are also served by Supabase (~30 KB each after Phase 3); 1 M views ≈ 30 GB. If needed later, proxy `/covers/*` through Cloudflare to cache them.

Setup checklist (two Lightsail servers):
- [x] `next.config.ts` → `output: "standalone"` + `deploymentId`; multi-stage `Dockerfile` (node 22-alpine, non-root, healthcheck); `.dockerignore` excludes every `.env*`.
- [x] `deploy/docker-compose.yml`: Caddy + **two app containers** (`restart: always`, 700 MB limit, log rotation, healthchecks).
- [x] `deploy/Caddyfile`: Cloudflare Origin cert, zstd/gzip, 60 MB uploads, load-balance app1/app2 with health checks + retry.
- [x] `deploy/deploy.sh`: zero-downtime rolling restart; on failure rolls back only the replaced container. **Tested locally:** 0 failed requests during deploy and during a broken-image rollback.
- [x] `deploy/setup-server.sh` (Docker, swap, unattended upgrades), `deploy/lightsail-firewall.sh` (80/443 Cloudflare-only, SSH your IP), `deploy/app.env.example`.
- [x] `.github/workflows/deploy.yml`: build once → GHCR (tag = SHA) → SSH rolling deploy to each host in `LIGHTSAIL_HOSTS`. Off until `DEPLOY_ENABLED=true`.
- [x] `/api/health` (no DB) for Caddy/Docker/Cloudflare LB.
- [x] Runbook: `docs/deploy-lightsail.md` (two servers, Cloudflare LB, failover drill, per-Reel routine).
- [ ] **(owner)** Two Lightsail instances `kaf-a` (`ap-south-1a`) and `kaf-b` (`ap-south-1b`), Ubuntu 24.04, 2 GB, static IPs, automatic snapshots.
- [ ] **(owner)** Same Cloudflare Origin CA certificate → `/opt/kaf/certs/` on both.
- [ ] **(owner)** Run `deploy/lightsail-firewall.sh` for both instances.
- [ ] **(owner)** `/opt/kaf/app.env` (chmod 600) — **identical on both servers**.
- [ ] **(owner)** GitHub secrets/variables per `docs/deploy-lightsail.md` §1 (public Supabase values are build args; `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is a build secret).
- [ ] **(owner)** `LIGHTSAIL_HOSTS="<ip-A> <ip-B>"`; set `DEPLOY_ENABLED=true` → first deploy.
- [ ] **(owner)** Cloudflare Load Balancing: monitor `GET /api/health` → 200, pool with both IPs, load balancer on the apex (+ www), e-mail alerts.
- [ ] **(owner)** Failover drill: stop server A → site and a test checkout keep working via B → start A.
- [ ] **(owner)** Lightsail alarms on both (CPU, status check), uptime monitor on `/api/health`.
- [ ] Supabase: upgrade to Pro; set spend cap on; region noted.

### Phase 6 — Observability & funnel — P1

- [ ] 6.1 Cloudflare saved views: requests, cache HIT ratio, origin requests, bandwidth, 4xx/5xx by path.
- [ ] 6.2 Optional Cloudflare Web Analytics beacon (~5 KB, cookieless) for visitors + Core Web Vitals.
- [x] 6.3 `supabase/migrations/002_funnel_view.sql` → `funnel_daily` (checkouts, paid, failed, abandoned, downloaded, paid-not-downloaded, revenue per day/product). Applied.
- [x] 6.4 Log tags: `[checkout]`, `[confirm]`, `[webhook]`, `[download]`, `[delivery]`, `[my-books]`, `[cdn]`, `[orders]`.
- [ ] 6.5 Alerts: `/api/*` 5xx > 1 % (5 min), `[webhook] invalid signature` / `amount mismatch`, paid-not-downloaded after 15 min (query in 002), Supabase CPU > 70 %.
- [x] 6.6 Funnel: VISITORS (Cloudflare) → CHECKOUT (`orders` created) → PAYMENT SUCCESS (`paid`) → DOWNLOAD SUCCESS (`download_count > 0`); failures from `failed` + Razorpay dashboard.

### Phase 7 — Load & failure testing (staging, Razorpay test mode) — P0 before the first Reel link goes live

Scripts written in `loadtest/` (see `loadtest/README.md`); runs pending staging:

- [ ] A. `landing.js` — 2,000 RPS spike, random `?igsh=` → HIT > 98 %.
- [ ] B. `landing.js ASSETS=1` — HTML + static + cover.
- [ ] C. `checkout.js` — order creation p95 < 1.5 s.
- [ ] D. `checkout.js KEY_SECRET WEBHOOK_SECRET` — confirm + 3× webhook concurrently → paid once.
- [ ] E. `download.js` — valid 302 / bad 403 / cap 429.
- [ ] Failure drills (12) in `loadtest/README.md`.

Record per run: RPS, p50/p95/p99, error rate, Next CPU/memory, Supabase CPU/API, Storage egress, Cloudflare HIT ratio, origin requests. **Key metric: origin offload.**

### Phase 8 — Go-live and per-Reel runbook

Go-live (once):
- [ ] Phases 0–7 checked; live Razorpay keys; one real ₹1 purchase on Android Instagram in-app browser + iOS.
- [ ] Failover drill passed (stop one server during a test purchase).
- [ ] Warm cache: request every book URL once, confirm `cf-cache-status: HIT`.
- [ ] Put the book link in the creator's bio / story sticker.

Every Reel (2–3× a week):
- [ ] No deploys in the hour before the creator posts (deploys are zero-downtime, but keep peaks boring).
- [ ] During the first hours: Cloudflare cache HIT ratio > 95 %, both pool origins healthy, `/api/*` 5xx ≈ 0, `funnel_daily` checkouts → paid → downloaded moving together.
- [ ] After the peak: `paid and download_count = 0` older than 15 min → follow up on WhatsApp; review Razorpay failures.
- [ ] Weekly: Supabase egress vs the 250 GB allowance; Lightsail CPU peaks.
- [ ] Last resort only: Cloudflare "Under Attack" mode (it challenges real buyers).

### Phase 9 — Supabase & Razorpay outage handling

Two app servers remove the server as a single point of failure. **Supabase and Razorpay are managed services we cannot duplicate on this budget**, so the goal is: *never take money we can't record, never lose a payment that went through, and always tell the buyer what's happening.*

**What happens during an outage (tested 2026-09-26 by black-holing Supabase in the production Docker image):**

| Situation | Buyer sees | System does | Result |
|---|---|---|---|
| Supabase down/slow — browsing | Book pages load normally | Served from Cloudflare + prerendered/ISR cache; failed ISR refreshes keep the last good page | ✅ no impact |
| Supabase down — tap Buy | "Payments are busy, try again in a minute" + **Try again** button (after ≤ 8 s) | Checkout refuses before creating a Razorpay order | ✅ no money taken for an unrecordable order |
| Supabase goes down **after** payment | Order page: "System busy — your payment is safe, this page updates itself" (auto-refresh ~10 min; saved in My Books) | Confirm answers 503 + order link; webhook answers **503 so Razorpay redelivers** | ✅ paid order recorded once the DB is back |
| DB back, but confirm + webhook both missed | Order page shows download as soon as it's opened | Order page asks Razorpay directly for captured payments; **cron sweep every 10 min** does the same for buyers who closed the tab | ✅ no lost payment even without webhooks |
| Supabase Storage down (DB up) | Download page: "busy, try again — your purchase is safe" + back link | Download answers 503; nothing counted against the cap | ✅ retry works when Storage returns |
| Razorpay API down — tap Buy | "Payments are busy, try again" + **Try again** | Checkout retries Razorpay once (8 s timeout each), then 503 | ✅ |
| Razorpay popup (checkout.js) fails to load | "Payment window could not be loaded" + **Try again** | — | ✅ |
| Razorpay webhooks delayed/down | Nothing — download is immediate | Confirm verifies the signature locally (no Razorpay API call) | ✅ |

Code (all done, `[x]`):
- [x] 9.1 Supabase client timeouts (8 s; admin uploads 120 s) and **automatic client retries off** (they turned one timeout into ~40 s). Measured: every failing path answers in ~8 s.
- [x] 9.2 `DatabaseUnavailableError` — database errors are never reported as "not found".
- [x] 9.3 Webhook: 503 on database errors → Razorpay redelivers (previously answered 200 and the payment was silently dropped).
- [x] 9.4 Confirm: 503 + order URL; order page: "system busy, payment safe" state instead of 404.
- [x] 9.5 Checkout: bilingual busy message, `retryable`, Razorpay 8 s timeout + one retry; Buy modal **Try again** button.
- [x] 9.6 Download: readable bilingual error pages with a link back to the order.
- [x] 9.7 Reconciliation: order page checks Razorpay for pending orders (`src/lib/reconcile.ts`); `POST /api/cron/reconcile` (Bearer `CRON_SECRET`) sweeps the last 48 h; `.github/workflows/reconcile.yml` runs it every 10 min.

Operational (owner):
- [ ] 9.8 `CRON_SECRET` (`openssl rand -hex 32`) in `/opt/kaf/app.env` on both servers **and** as a GitHub secret.
- [ ] 9.9 Razorpay: **auto-capture ON** (reconciliation only trusts `captured`); tell your Razorpay account manager the expected volume and spikes so risk checks don't hold payments; confirm per-day/per-transaction limits on the account; subscribe to status.razorpay.com.
- [ ] 9.10 Supabase: Pro plan (no pausing), subscribe to status.supabase.com, spend cap on, keep daily backups.
- [ ] 9.11 Cloudflare: **Always Online** on (serves cached pages if both servers are unreachable).
- [ ] 9.12 Drill once on staging: block Supabase → tap Buy (busy message) → restore → check a pending test order turns paid via the order page / cron.

Not done on purpose (budget / complexity; revisit if outages actually hurt):
- A second payment gateway (Cashfree/PhonePe PG) as automatic fallback — second KYC + integration.
- Taking payments while Supabase is down and recording them later — risks charging for books we can't deliver during the same outage (Storage is on Supabase too).

### Later (P2)

- [ ] Trim font weights (7 → 3–4 files).
- [ ] CSP header after Razorpay checkout is verified.
- [ ] Refund status (`refunded`) + Razorpay refund webhook.
- [ ] k6 smoke run in CI against staging.

---

## 4. Change log

| Date | Phase | Change | Commit |
|---|---|---|---|
| 2026-09-26 | — | Audit + plan written | docs commit |
| 2026-09-26 | 1 | Atomic paid transition, `/order` page, `/api/download`, combo delivery, capped WhatsApp, My Books redesign, `pdf_path` out of public data, migration 001 | `4521f1b` |
| 2026-09-26 | 2 | Cloudflare purge helper, slim search index, `proxy.ts`, headers, Reveal, Razorpay preconnect, lint clean | `45c97b8` |
| 2026-09-26 | 3 | WebP cover variants, srcset/preload CoverImage, hero.webp, logo sizing | `d1c294a` |
| 2026-09-26 | 4/6/7 | `supabase/checks/verify.sql`, migration 002, k6 scripts + drills | `29cb18f` |
| 2026-09-26 | 1.17 | Mobile above-the-fold landing + sticky Buy bar | `a33c5d5` |
| 2026-09-26 | — | Migrations 001/002 applied by owner and verified | — |
| 2026-09-26 | 5b | Budget plan: Lightsail + Cloudflare Free + Supabase Pro | `021dce0` |
| 2026-09-26 | 5b | Docker/Caddy/rolling deploy/CI for Lightsail (1–2 servers), `/api/health`, runbook | `1c352ca`, `29d1c4c` |
| 2026-09-26 | 5b/8 | Decision: two always-on servers (recurring creator Reels, not a campaign); per-Reel runbook | `08d0766` |
| 2026-09-26 | 9 | Supabase/Razorpay outage handling: timeouts, no client retries, 503 for webhook redelivery, busy states, Try again, Razorpay reconciliation + cron | this push |

## 5. Files added / changed

| File | Purpose |
|---|---|
| `supabase/migrations/001_viral_readiness.sql` | order columns, unique Razorpay ids, counters |
| `supabase/migrations/002_funnel_view.sql` | `funnel_daily` |
| `supabase/checks/verify.sql` | pre-launch DB checks |
| `src/lib/orders.ts` | `markOrderPaid`, deliverable items (combos), order URLs |
| `src/lib/delivery.ts` | 5-min signed URLs, capped WhatsApp |
| `src/lib/cdn.ts` | Cloudflare purge |
| `src/lib/covers.ts` | cover variant helpers |
| `src/lib/purchases.ts` | device order memory |
| `src/app/order/[orderId]/page.tsx` | success / re-download page |
| `src/app/api/download/[orderId]/route.ts` | download authorization |
| `src/components/order/*` | auto-download, pending refresh, WhatsApp opt-in, in-app hint |
| `src/components/StickyBuyBar.tsx` | mobile sticky price + Buy |
| `src/app/api/checkout/*`, `api/razorpay/webhook`, `api/orders/contact` | idempotent, amount-checked, capped |
| `src/app/my-books/*` | device list + send-to-own-WhatsApp |
| `src/proxy.ts` | renamed from `middleware.ts` |
| `next.config.ts` | headers, image TTL |
| `loadtest/*` | k6 A–E + drills |
| `.env.local.example` | new env vars |

### New environment variables

| Var | Required | Default |
|---|---|---|
| `ORDER_ACCESS_SECRET` | strongly recommended | falls back to Razorpay key secret |
| `DOWNLOAD_LIMIT` | no | 30 per order |
| `WHATSAPP_SEND_LIMIT` | no | 3 per order |
| `AUTO_WHATSAPP_ON_PAYMENT` | no | false |
| `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | for instant purge | purge skipped |
| `CRON_SECRET` | for the reconciliation sweep | sweep disabled (401) |
