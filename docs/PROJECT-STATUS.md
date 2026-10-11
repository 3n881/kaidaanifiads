# PROJECT STATUS — master doc (read this first)

> **Last updated 2026-10-11 evening** (live commit `bd822ce` + this doc update). One place for any developer or AI agent to
> understand where the project is: what exists, how it was built, what is live, what is next, and
> which deeper doc to open for details. Facts were checked against the code, the git history, the
> live site (`/api/health`) and the production database (read-only) on this date.
>
> **Keep it current:** after any piece of work, update §3 (status), §11 (open items) and §13 (history)
> here, plus the relevant deeper doc.

Read order for a new agent: **this file → `AGENTS.md` (Next.js 16 warning) → the deeper doc for your
task (§14)**. Never paste secrets into chat or docs.

---

## 1. What this is (30 seconds)

An ebook store for the Instagram brand **कायद्याचं आणि फायद्याचं** (Kaydyacha Ani Faydyach; proprietor
Shrutika Gochade, UDYAM-MH-26-1024122, Pune). It sells **legal-guide PDFs in Marathi and Hindi** (land,
inheritance, RTI, marriage, atrocity law) for ₹99 each.

The creator posts **Reels 2–3× a week with millions of views**. Each Reel sends a burst of phone visitors
to one book page. Everything is designed around this flow:

```
Reel → book page (cached at Cloudflare) → Buy → Razorpay → pay
     → PDF downloads immediately + PDF arrives on WhatsApp (Interakt)
(no login, no account, no cart, no form before payment)
```

Two rules drive every decision:
1. **Anonymous browsing is served from cache** (Cloudflare edge + Next.js ISR), never by a fresh render
   or a database query per visit.
2. **Never take money we can't record, and never lose a payment that went through.**

We are **rebuilding the client's older site** (`kaydyachaanifaydyach.com`) on our own stack and domain.
The owner wants our UI to **look like the original**, but with our safer and simpler buying flow.

### People

| Who | Role |
|---|---|
| shivrajgawali (GitHub `3n881`) | Developer / owner of this repo. Runs deploys, tests purchases on their phone |
| Ajay Mane | Client contact. Sends PDFs on WhatsApp, gives business info, can upload covers/previews in the dashboard |

---

## 2. Sites, environments and accounts

| | Address | What it is |
|---|---|---|
| **Production (ours)** | **https://kaydyachaanifayddyacha.com** (+ `www`) | This repo. Live since **2026-10-10** on AWS Lightsail `kaf-a` (Mumbai) behind Cloudflare. **Still on Razorpay TEST keys and not announced.** Note the spelling: `fay`**`dd`**`yach`**`a`** |
| Replov (old test host) | https://kaidyachaanifaidyacha-28da.replov.com | Earlier test deployment, still on the **Tokyo** database. Treat it as dead: **don't edit books there**, because changes land in Tokyo, not production. Delete it after go-live |
| **Original site (NOT ours)** | https://www.kaydyachaanifaydyach.com | The client's previous site (Vercel, own DB, Cloudflare R2). **Reference only — never change it.** Its card numbers on `/ebooks` = our product `id`s. It shares the client's Razorpay and Interakt accounts with us |

| Service | Detail |
|---|---|
| GitHub | `3n881/kaidaanifiads`, branch `main`. **A push to `main` builds and deploys to production automatically** (GitHub Actions `Deploy`, `DEPLOY_ENABLED=true`) |
| Supabase (production) | Project **`ntqwvfksdqdyoyknkprh`**, Mumbai `ap-south-1`, Pro. DB + Auth (admin login) + Storage (PDFs, covers) |
| Supabase (old) | Project `yjsmebmytltwwihvivbd`, Tokyo. Used only by Replov. Pause, then delete, about a week after go-live |
| Server | Lightsail `kaf-a`, $12 plan (2 GB / 2 vCPU), Ubuntu 24.04, `ap-south-1a`, static IP `kaf-a-ip`, automatic snapshots. Files in `/opt/kaf/` |
| Cloudflare | Free plan. Zone `kaydyachaanifayddyacha.com`, SSL Full (strict) with an Origin certificate (valid to 2041), cache + WAF rules (§7) |
| Domain registrar | Hostinger (bought 2026-10-03); nameservers point to Cloudflare |
| Razorpay | Client's account (shared with the original site). **LIVE keys on our site since 2026-10-11** (own live webhook, its secret in `kaf-keys/razorpay-live-webhook-secret.txt`; test keys kept in `/opt/kaf/app.env.test-keys-backup`) |
| Interakt (WhatsApp API) | Client's account. Sender name "AS Consultancy Services". Templates `payment_sucess_pdf_v2` (sic) and `pending_followup_v2` |
| cron-job.org | `POST https://kaydyachaanifayddyacha.com/api/cron/reconcile` every 10 min, `Authorization: Bearer <CRON_SECRET>` |
| UptimeRobot | HTTPS monitor on `/api/health` every 5 min |
| Meta Pixel | Code ready, **off**. Waiting for pixel ID + domain-verification code + Conversions API token from the client (§11 item 8) |

### Where secrets live (never commit, never paste in chat)

| What | Where |
|---|---|
| Production runtime secrets (Supabase service key, Razorpay, Interakt, `ORDER_ACCESS_SECRET`, `CRON_SECRET`, `ADMIN_EMAILS`, Cloudflare purge token) | `/opt/kaf/app.env` on the server (chmod 600); local copy `C:\Users\shivr\kaf-keys\app.env` |
| SSH key `kaf-key.pem`, Origin cert `origin.pem`/`origin.key`, GHCR token | `C:\Users\shivr\kaf-keys\` on the admin laptop |
| Mumbai Supabase keys + DB URL, Cloudflare Zone ID, purge token, `CLOUDFLARE_RULES_TOKEN` | `.env.mumbai` in the project folder (git-ignored) |
| Local dev settings | `.env.local` (git-ignored). **Points at the PRODUCTION Mumbai database**: any local write or script run is live immediately. Old Tokyo values are in `.env.local.tokyo-backup` |
| Build-time public values | GitHub → Settings → Secrets and variables → Actions → **Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_MEDIA_PROXY=true`, `NEXT_PUBLIC_META_PIXEL_IDS` (empty), `DEPLOY_ENABLED=true`, `DEPLOY_HOSTS`, `DEPLOY_LIGHTSAIL_INSTANCE=kaf-a` |
| Deploy secrets | GitHub Secrets: `DEPLOY_SSH_KEY`, `AWS_DEPLOY_ACCESS_KEY_ID`, `AWS_DEPLOY_SECRET_ACCESS_KEY` (IAM user `github-deploy`, may only edit Lightsail port rules) |

---

## 3. Status at a glance (2026-10-11)

| Area | State |
|---|---|
| Store code (catalog, book pages, checkout, order page, downloads, My Books) | ✅ Working end to end with **live** Razorpay payments (2026-10-11) |
| WhatsApp delivery (PDF after payment) + payment reminder | ✅ Working (tested 2026-10-01; seen again in 10-10 test orders) |
| Admin dashboard | ✅ Rebuilt 2026-10-11: **sales Overview**, **Orders** with filters + **order detail page**, **refund tracking**, readable save errors, PDF uploads > 10 MB fixed, works on phone / tablet / desktop (§8 Dashboard) |
| Didn't-pay flow (failed → help screen; cancelled → WhatsApp offers sign-up) | ✅ 2026-10-11, live in `99050fb` (tested locally with a fake checkout; not yet tried on the live site). Interested buyers page `/dashboard/leads`. Next-day follow-up **off** until an Interakt marketing template is approved (§11 item 4) |
| Multilingual UI (Marathi / Hindi / English) + first-visit language picker | ✅ 2026-10-10 |
| UI matched to the original site | ✅ 49 tracked items done. 3 wait for an owner decision (§11) |
| In-page sample reader (page images made from the PDF) | ✅ 2026-10-10. All 9 editions have 6 reader pages |
| Contact form + dashboard inbox | ✅ 2026-10-10 (0 messages so far) |
| Database moved Tokyo → Mumbai | ✅ 2026-10-04 |
| Server + Cloudflare + auto-deploy | ✅ 2026-10-10 (go-live Stages 0–3) |
| **Stage 4: functional tests on the live domain** | 🟡 **In progress.** The DB shows 3 paid test orders on 10-10 at 21:25–21:47 IST (#27, #30, #25) plus 1 abandoned. Results are not yet written up. Run the full checklist in `go-live-plan.md` Stage 4 |
| Page speed (first screen) | ✅ 2026-10-11 — PageSpeed mobile: home **93**, book page **85** (§7a) |
| Stage 5: speed + load tests | 🟡 PageSpeed done (§7a). **k6 Reel spike PASSED** 2026-10-11 from Grafana Cloud Mumbai: 66,825 requests, peak 300 req/s, **0 errors**, p95 17 ms, **100 % from Cloudflare**, server CPU flat. **k6 Server direct** 2026-10-11 (dev PC, `loadtest/origin.js`, 10→60 req/s uncached): 11,028 req, **0 errors**; comfortable up to ≈ 30–40 req/s (order page p95 < 0.8 s), slower above (p95 2–4 s at 50–60) vs ~5 req/s needed in a Reel. Still to do: WebPageTest, real-phone check |
| Stage 6: go-live (Razorpay **live** keys + announce) | 🟡 **Live payments working 2026-10-11**: real ₹99 purchase 14:50 IST (#30) → paid, downloaded, PDF on WhatsApp, webhook saved the phone. Refund that test payment in Razorpay. Not announced yet (Search Console, Instagram bio pending) |
| 5 books missing (#22, 28, 29, 31, 32) | ⬜ Waiting for PDFs from Ajay |
| Meta Pixel + Conversions API | ⬜ Waiting for the 3 items from the client's Meta account (§11 item 8) |

Production database snapshot (2026-10-11 evening, read-only): **10 products** (9 books at ₹99 + the owner's **#31 "test book" at ₹1, still visible — hide or delete it**). Since live payments (11 Oct ≈ 14:30 IST): 6 paid orders (₹496, incl. the owner's ₹99 and ₹1 test purchases — to be refunded), 2 not paid, 1 failed.

---

## 4. Architecture

```
Visitor (phone, often Instagram in-app browser)
  └─► Cloudflare (Free): cache, SSL, WAF, 1 rate-limit rule, Smart Tiered Cache
        └─► Lightsail kaf-a (Mumbai) ─ Caddy (Origin cert, :443)
               ├─► app1  (Next.js standalone, Docker, node:22-slim, 700 MB limit)
               └─► app2  (same image; Caddy round-robins, retries the other on failure)
                     ├─► Supabase Mumbai: Postgres (PostgREST), Auth, Storage (pdfs private, covers public)
                     ├─► Razorpay (orders API, checkout.js popup, webhooks)
                     └─► Interakt (WhatsApp template messages with the PDF attached)
cron-job.org ─► POST /api/cron/reconcile every 10 min (payment sweep + reminders)
```

- **Stack:** Next.js **16.3.6** (App Router, `proxy.ts` instead of middleware, React Compiler lint),
  React 19.2, Tailwind 4, TypeScript, `@supabase/ssr`, `sharp` (WebP variants), `pdf-lib` (6-page
  preview PDFs), `pdfjs-dist` 6.3.289 (sample reader; worker vendored in `public/vendor/`).
  **This Next.js differs from older docs.** Read `node_modules/next/dist/docs/` before framework-level changes.
- **Caching:** home, list and book pages use ISR with a 5-minute revalidate (`s-maxage=300,
  stale-while-revalidate`). Policy pages are static. `/api/*`, `/order/*` and `/my-books` are
  `private, no-store`. Admin saves call `revalidatePath` and purge Cloudflare (`src/lib/cdn.ts`).
  Every deploy purges all of Cloudflare's cache (`deploy/deploy.sh`).
- **Images:** covers and preview pages are stored as 200/400/800 px WebP. With
  `NEXT_PUBLIC_MEDIA_PROXY=true`, they are served as `/media/<path>` from our domain so Cloudflare caches
  them in India (images 1 year, preview PDFs 1 hour). PDFs for buyers come straight from Supabase via
  **5-minute signed URLs** (1 hour for the WhatsApp attachment).
- **Capacity reasoning:** a 1M-view Reel is about 5 req/s at the origin once Cloudflare serves the pages.
  One 2 GB server handles roughly 100× that. Two containers make deploys and crashes gap-free. A second
  server is only for whole-machine failover (`go-live-plan.md` → "Later: second server").

---

## 5. Buyer flow (as built)

Full detail: `docs/HANDOFF.md` §3.

1. Visitor opens `/ebooks/<slug>` or `/combos/<slug>` (cached).
2. **आत्ताच डाऊनलोड करा** → `POST /api/checkout` (price read from the DB, never from the browser) →
   the order is saved on the device (localStorage) → the Razorpay popup opens. **No form on our site.**
3. Paid → `POST /api/checkout/confirm` verifies the signature, then an atomic `created → paid` update
   → same-tab redirect to `/order/<id>?t=<HMAC token>`.
4. The order page **auto-downloads once**. Download buttons mint a new 5-min signed URL per click
   (cap 30). It also tells the buyer where the file went (Android / iPhone / computer steps).
5. The Razorpay webhook (`payment.captured`) saves the buyer's phone and sends the **PDF on WhatsApp**
   (`payment_sucess_pdf_v2`, Document header). It never sends twice. If WhatsApp wasn't sent after
   about 8 s, the order page offers a "PDF on WhatsApp" popup.
6. **माझी पुस्तके** (`/my-books`) lists orders saved on that phone and can resend the PDF to WhatsApp.
7. A failed or abandoned payment with a phone number gets **one** `pending_followup_v2` reminder after
   **10 min** (both delays set to 10 on the server 2026-10-11; the cron runs every 10 min, so it arrives
   10–20 min after the buyer leaves), at most one per phone + book per day, none if they paid since.
8. If the browser dies after paying, the webhook, the order page and the 10-minute cron all ask Razorpay
   directly, so no paid order is lost.
9. **After paying:** the order page also shows **"तुम्हाला हे देखील आवडेल"** (other books, buyer's language first).
   Pressing **Back** returns to the normal book page: phones restore the book page from the back/forward
   cache with the "Opening payment…" spinner still up, so `BuyButton` closes the checkout window on
   `pageshow` with `persisted` (fixed 2026-10-11; before, the buyer looked stuck on the payment spinner).
10. **Refunds:** done by the owner in the Razorpay dashboard. The order stays `paid` and downloads keep
   working; `refunded_amount` / `refund_status` record it (webhook `refund.*` or "Check with Razorpay").
11. **Didn't pay (2026-10-11):** Razorpay reports a failed attempt separately (`payment.failed`) from closing the
   window. **Failed** → help screen: money auto-refunded in 5–7 days if deducted, try another UPI app/card/net
   banking, Try again, "Need help? WhatsApp us". **Cancelled** → "payment not completed", Try again first, then a
   green **"Want this book later? Get offers and new books on WhatsApp"** box (number + UNTICKED consent box;
   at most once a day per device, never again once saved — localStorage `kaf-lead`) → `POST /api/leads`
   (honeypot, 5/hour per IP hash, consent required) → table `leads`. Failed payments are reminded after
   **10 min** (`PAYMENT_FAILED_REMINDER_DELAY_MINUTES`); abandoned ones also 10 since the owner's change.
12. **Languages:** each product has `mr`/`hi`/`en` editions. If the visitor's language has no edition,
   the page sells the edition that exists (`editionLocaleFor`). The order's `locale` = the edition sold
   = the PDF delivered.

Deliberate difference from the original site: it asks for name + WhatsApp **before** paying. We don't.
All FAQ, how-to-buy, policy and order texts describe **our** flow.

---

## 6. Catalog and content

9 live products, all ₹99 (MRP ₹198). Combos are **one merged PDF** on the combo row (`combo_items`
stays empty on purpose).

| ID | Slug | Type | Lang | PDF | Reader pages |
|---|---|---|---|---|---|
| 30 | `rti-adhiniyam-2005-sampurna-guide` | ebook | hi | ✅ | 6 |
| 27 | `hindu-uttaradhikar-kanoon-guide` | ebook | hi | ✅ | 6 |
| 26 | `jamin-mojani-sampurna-margadarshak` | ebook | mr | ✅ (49.5 MB) | 6 |
| 25 | `patsanstha-fasavnuk-combo` | combo | mr | ✅ (33 MB) | 6 |
| 19 | `atrocity-kayada-combo` | ebook (slug says combo — keep it) | mr | ✅ | 6 |
| 16 | `rti-brahmastra-3in1` | combo | mr | ✅ | 6 |
| 12 | `ghar-ghenyaadhi-he-vachach` | combo | mr | ✅ | 6 |
| 8 | `vivah-te-ghatasphot-margdarshika` | combo | mr | ✅ | 6 |
| 4 | `malmatta-vatap-kayadeshir-hakka` | combo | mr | ✅ | 6 |

**Missing (exist on the original, waiting for PDFs from Ajay):** #32 ग्रामपंचायत योद्धा (₹99),
#31 वडिलोपार्जित जमीन… (**₹49** there), #29 हक्कसोडपत्र… , #28 ऊसाचा हिशोब… , #22 लग्न, फसवणूक + हुंडा
प्रतिबंध (combo). Their old URLs temporarily redirect to `/ebooks` / `/combos` (`next.config.js`).

**Adding or replacing a PDF:** put it in `content/ebooks/<id>-<slug>-<mr|hi|en>.pdf` (local only,
git-ignored). Match it to a product by page count and the original site's number. Then run
`npm run db:upload-pdfs -- --dry-run`, then `npm run db:upload-pdfs` (`--force` replaces,
`--previews-only` rebuilds preview PDFs). Then run `npm run db:reader-pages` for reader images.
Alternatively, upload in the dashboard (50 MB limit). The dashboard builds the reader images in the
browser on upload.

Storage: `pdfs` (private) `<slug>-<locale>-<ts>.pdf` · `covers` (public) `<slug>-<locale>-v<ts>-{200,400,800}.webp`,
`previews/<slug>-<locale>.pdf` (first 6 pages), reader-page WebPs (200/400/800/1600).

---

## 7. Deploy and operations

**How a deploy happens:** push to `main` → GitHub Actions **Deploy** builds one Docker image (tag = first
12 characters of the SHA, pushed to GHCR) → opens Lightsail port 22 for the runner's IP only → copies
`deploy/deploy.sh`, `docker-compose.yml` and `Caddyfile` to `/opt/kaf/` → `deploy.sh` restarts app1, waits
until it is healthy, then does the same for app2 (it rolls back the replaced container on failure) →
reloads Caddy → **purges the whole Cloudflare cache** → closes port 22 again. Zero downtime.
`/api/health` returns `{"ok":true,"deployment":"<sha>"}`. Use it to confirm which commit is live.

> ⚠️ **Pushing to `main` = deploying to production.** Commit/push only when the user asks.

- Manual deploy / rollback on the server:
  `IMAGE=ghcr.io/3n881/kaidaanifiads:<sha> bash /opt/kaf/deploy.sh` (previous image is in `/opt/kaf/.current-image`).
- Logs: `cd /opt/kaf && docker compose logs -f app1 app2`. Log tags: `[checkout] [confirm] [webhook]
  [download] [reconcile] [reminders] [interakt] [cdn] [orders]`.
- **SSH from the laptop** is allowed only from the admin IP in Lightsail → Networking. If the home IP
  changes, update that rule (or re-run `deploy/lightsail-firewall.sh` in CloudShell).
- **Cloudflare rules** (set via API 2026-10-10; full table in `viral-launch-plan.md` §Phase 5):
  `bypass-dynamic`, `static-immutable`, `next-image`, `media`, `public-assets`, `public-html` (respect
  origin TTL; Free plan can't use a custom cache key, so `?igsh=` links miss once each), WAF
  `allow-razorpay-webhook` + `block-bad-methods`, rate limit `checkout-rate-limit` (30 POST / 10 s per IP
  → block 10 s). Rocket Loader, Email obfuscation and Bot Fight Mode are **off**; Smart Tiered Cache is on.
  **Transform Rule `strip-tracking-query`** (URL rewrite, 2026-10-11): on `/`, `/ebooks*`, `/combos*`, a query
  string without `_rsc=` is removed before the cache lookup, so `?igsh=` / `?fbclid=` links are cache HITs
  (before: every Instagram link was a MISS, 370–700 ms vs 160–190 ms). The browser URL keeps its query
  (`?lang=Hindi` is read client-side).
- **Funnel:** `select * from funnel_daily;` in Supabase SQL.
- **Per-Reel routine:** no deploys in the hour before a Reel; watch the cache HIT ratio and
  `funnel_daily`; afterwards follow up on paid-but-not-downloaded orders (`deploy-lightsail.md` §9).
- `NEXT_PUBLIC_*` values are **baked in at build time** from GitHub Variables. Changing one needs a new
  deploy; the server's `app.env` can't override them.

### Database schema (all applied to Mumbai)

`supabase/schema.sql` (products, combo_items, orders, store_settings, RLS: anon reads active products only,
no anon access to orders) + `onboarding.sql` + migrations:

| # | What |
|---|---|
| 001 | Viral readiness: order columns, unique Razorpay ids, `record_order_download()`, `claim_whatsapp_send()` (service role only) |
| 002 | `funnel_daily` view |
| 003 | Multilingual delivery (per-locale PDFs) |
| 004 | Localized product content (per-locale titles, descriptions, covers, previews) |
| 005 | Payment reminders (`orders.reminder_sent_at`) |
| 006 | `contact_messages` (RLS on, no policies → server only; IP stored as SHA-256) |
| 007 | `reader_pages_mr/hi/en` text[] (sample-reader page images) |
| 008 | Refund tracking: `refunded_amount` (₹), `refund_status` (partial/full), `refunded_at`, `razorpay_refund_id` — applied to Mumbai 2026-10-11 |
| 009 | `leads` — interested buyers (phone unique, book, locale, source cancelled/failed, consent time + exact consent text, ip_hash, followup_sent_at, opted_out_at); RLS on, server only — applied to Mumbai 2026-10-11 |

`supabase/checks/verify.sql` = pre-launch checks (written, never formally run).

## 7a. Page speed — targets, results, what we did (2026-10-11)

**Industry standard = Google's Core Web Vitals**, judged on the 75th percentile of *real* visitors:
LCP (main content visible) ≤ 2.5 s, INP (tap response) ≤ 200 ms, CLS (layout jumps) ≤ 0.1. PageSpeed's
mobile lab test fakes a slow mid-range phone (Moto G Power, 4× slower CPU, "slow 4G" 1.6 Mbps / 150 ms),
so lab numbers are much slower than real Jio/Airtel 4G. Our targets: **lab score ≥ 90, lab LCP < 2.5–3 s,
real phones first screen ≈ 1 s.** Real-user numbers ("Discover what your real users are experiencing" in
PageSpeed, and Cloudflare Web Analytics) appear only after launch traffic — watch those.

**Results (PageSpeed mobile):**

| Page | Before (10-11 morning) | After (`5c3f788` + Cloudflare rule) |
|---|---|---|
| Home `/` | 85 · FCP 1.8 s · LCP 3.8 s · SI 4.5 s | **93** · FCP 1.7 s · LCP 3.1 s · SI 3.1 s · TBT 20 ms · CLS 0 |
| Book page (Reel landing) | 75 · FCP 1.7 s · **LCP 6.0 s** | **85** · LCP 3.2 s |

**What was wrong and what we did** (measured with Lighthouse + throttled Chrome experiments on the live
pages before changing code):

| Problem | Fix |
|---|---|
| Chrome holds the first paint until **preloaded fonts** arrive (Geist 29 KB + Noto Devanagari 119 KB). Fonts also had no `unicode-range`, so the browser tried Geist and its Arial stand-in for every Marathi letter (very slow text layout) | Geist `preload: false` + Latin-only `unicode-range` (`src/app/layout.tsx`); Devanagari web font **removed** — Marathi/Hindi use the device font (Android = Noto Sans Devanagari, like the original site). Throttled-phone test: first paint 5.9 s → ~1.5 s |
| **Instagram links** (`?igsh=…`, also `fbclid`, `utm_*`) were a Cloudflare cache MISS every time (Free plan can't customise the cache key): 370–700 ms and every visitor reached the server | Cloudflare **Transform Rule `strip-tracking-query`** (URL rewrite, made by the owner in the dashboard; the API token can't edit transform rules). Expression: `(http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/ebooks") or starts_with(http.request.uri.path, "/combos")) and http.request.uri.query ne "" and not http.request.uri.query contains "_rsc="` → Path preserve, Query rewrite to empty. Verified: random `?igsh=` → HIT; `?_rsc=` navigation still works; `/ebooks?lang=Hindi` still filters (read client-side). **Never strip `_rsc`** — that would mix HTML and RSC payloads in the cache |
| `/ebooks` and `/combos` had **no books in the HTML** ("लोड होत आहे…" until JS ran) because `Catalog` used `useSearchParams` | `?lang=` read in a `useEffect` (`src/components/Catalog.tsx`); all cards now in the server HTML |
| Phones got 800 px covers for ~490 px slots; 48 px thumbnails used the 400 px file | 600 px variant everywhere (`COVER_WIDTHS`, reader pages), `npm run db:cover-600` backfilled 91 old images; `coverThumbSrc()` = 200 px for thumbnails. Book cover 96 KB → 62 KB |

Checked and **not** the cause: blur effects and the language pop-up (removing them didn't change paint
times). The pop-up stays (owner decision 10-11: visitors choose their language first).

**Owner decisions 10-11:** language pop-up unchanged · Cloudflare **Web Analytics stays on** (10 KB, loads
after the page, gives real-visitor speed data; turning it off would not affect cache/rules/SSL/WAF).

**Book page, 11 Oct 13:50:** sample reader loaded on demand (`next/dynamic`), FAQ + related row `content-visibility:auto` (`.cv-auto`) → book page **91–92**, 0.5 MB, JS 0.4 s. `experimental.inlineCss` was tried and **removed** (no first-paint gain, HTML doubled). Comparison with the original site: doc "Site Speed: Ours vs Original" (ours 83–94 mobile vs 44–64).

**Remaining ideas (optional, small):** legacy JS polyfills 24 KB (framework, risky);
images "larger than needed" by ~20 KB each (smaller would blur on most phones — leave). The remaining
~1.1 s "element render delay" in the lab is the emulated slow CPU laying out text.

**How to measure again:** pagespeed.web.dev (mobile) on `/` and a book page. For experiments, Lighthouse
13.5 + Puppeteer with devtools throttling (4× CPU, 150 ms / 1.6 Mbps) — note that on the Windows dev PC
text layout is slowed by Windows loading system font files, so local numbers look worse than Android.
**Rules:** don't re-add font preloads or a Devanagari web font, keep the cover `fetchpriority=high` +
eager on the first carousel/book cover, and keep list pages free of `useSearchParams`.

---

## 8. Code map (checked 2026-10-10)

### Public pages (`src/app`)
| Route | Rendering | Notes |
|---|---|---|
| `/` | ISR 300 s | Hero → bestsellers row (auto-advancing `Carousel`/`ProductRow`) → combos row → HowToBuy → Benefits → Testimonials |
| `/ebooks/(list)`, `/combos/(list)` | ISR 300 s | `Catalog`: language tabs (3+ languages, else chips), **Book ID** search (overrides other filters), category chips, text search, sort. `loading.tsx` lives in the `(list)` group on purpose |
| `/ebooks/[slug]`, `/combos/[slug]` | SSG + ISR 300 s | `ProductDetail` + `ProductGallery` (cover + reader pages 2–6) + `SampleReader` pop-up + `StickyBuyBar`. Unknown slug → real 404 |
| `/order/[orderId]` | dynamic, noindex, no-referrer | Token check → "ही लिंक अपूर्ण आहे" if bad; DB down → "system busy" auto-refresh; `created` → inline Razorpay reconcile; paid → auto-download once (sessionStorage `kaf-dl-<id>`), `DownloadWhere`, `InAppBrowserHint`, WhatsApp popup fallback. UI language from cookie `kaf_locale` |
| `/my-books` | client list from localStorage `kaf-orders` | Server action `sendMyBooks` sends up to 10 paid orders to a typed WhatsApp number; same reply either way (no enumeration). Combos upsell row |
| `/contact` | static + server action | `ContactForm` → `contact/actions.ts`: honeypot `website`, needs email or 10-digit phone, 5/hour per SHA-256(IP) → `contact_messages` |
| `/about`, policy pages (`PolicyPage`), `/site-index`, `not-found` | static | Policy body text stays English; titles localized |
| `sitemap.ts`, `robots.ts` (disallows `/dashboard`), `manifest.ts` | — | Use `NEXT_PUBLIC_SITE_URL` |

### API / handlers
| Route | What |
|---|---|
| `api/checkout` | DB price, edition fallback, 409 if nothing deliverable, inserts order ("Guest"), creates Razorpay order (8 s timeout + 1 retry), returns HMAC token + order URL; 503 "busy" on DB/Razorpay errors |
| `api/checkout/confirm` | Verify signature → `markOrderPaid` (atomic) → order URL; 503 + URL on DB outage |
| `api/razorpay/webhook` | HMAC on raw body; `payment.failed` → failed + save phone; `payment.captured`/`order.paid` → amount check, save phone/email, mark paid; `onOrderPaid` (auto-WhatsApp) only on `payment.captured`; 503 on DB errors so Razorpay redelivers; unknown orders (original site's) → 200 |
| `api/cron/reconcile` | POST, Bearer `CRON_SECRET` (timing-safe) → `reconcileRecentOrders` (created/failed, last 48 h) + `sendPaymentReminders` |
| `api/download/[orderId]` | Token + paid → `record_order_download` (cap 30) → 302 to a 5-min signed URL named `<slug>-<locale>.pdf`; bilingual error page |
| `api/orders/contact` | Order-page popup: save a WhatsApp number + send the PDF (cap 3 via `claim_whatsapp_send`) |
| `api/auth/login` | Admin password login (checks `ADMIN_EMAILS`) |
| `api/auth/magic-link`, `auth/callback` | **Unused** by the UI (login page is password-only) |
| `api/health` | `{"ok":true,"deployment":"<sha>"}`, no DB |
| `media/[...path]` | Proxies the public `covers` bucket (whitelisted names): images 1 year immutable, `previews/*` 1 h at the edge |

### Dashboard (`/dashboard`, all dynamic; `src/proxy.ts` guards it, fails closed if `ADMIN_EMAILS` empty)
**Overview = sales dashboard** (2026-10-11, `src/lib/sales.ts` + `components/admin/SalesOverviewView.tsx`): revenue / paid / conversion / failed for today (IST), 7 days, all time — counted from `SALES_START` (live keys, 11 Oct 14:30 IST; test orders excluded; refunds not tracked yet); needs-attention lists (paid > 15 min not downloaded, paid without WhatsApp, unhandled contact messages) with wa.me links; top books 7 days; latest 10 paid orders; one small Setup card (business details still missing). The old setup checklist lives on Launch. Period cards and attention titles link into Orders. **Orders page** (2026-10-11): Today/7 days/All tabs, clickable cards that filter (Paid ₹, Not paid, Failed, Paid-not-downloaded), search (phone — last 10 digits, `pay_…`, order id), book name + language + IST time + wa.me link + downloads + WhatsApp count + Resend; cards on phones, table on desktop; test orders hidden unless `?test=1`; latest 200 matches. **Uploads >10 MB** need `experimental.proxyClientMaxBodySize` (set to 95mb) because `/dashboard` goes through `proxy.ts`. No cover uploaded → the PDF's first page (reader page 1) becomes the cover. **Refunds** (2026-10-11): webhook handles `refund.created` / `refund.processed` (add those events to the live Razorpay webhook); order stays `paid`, revenue = amount − refunded_amount everywhere; Refunded card/filter on Orders; downloads are not revoked by a refund. **Order detail page** `/dashboard/orders/[id]`: summary, timeline, buyer (wa.me), Razorpay ids (payment links to the Razorpay dashboard), actions: Check with Razorpay (`src/lib/refunds.ts` — marks captured-but-unpaid orders paid and pulls refund state; use it for refunds made before the webhook events were added), Resend WhatsApp, Copy buyer's order link · **Products** (per-edition editor `ProductForm`: text, cover, up to 5
**Interested buyers** `/dashboard/leads` (2026-10-11, `getLeadsView` in `src/lib/sales.ts`): cards (interested, bought later + %, follow-ups sent, opted out), one card per sign-up (wa.me link, book, date, language, Cancelled/Payment failed chip, Bought later, Follow-up sent, Opted out) and **Remove** (`optOutLead` → `opted_out_at`). Admin menu has 7 items (phones: 4 + 3). Server actions on admin pages recover from deploys (`src/lib/stale-action.ts`, `app/dashboard/error.tsx`).
preview images, PDF View/Replace/Remove; choosing a PDF renders 6 reader pages **in the browser** with PDF.js
and uploads them on save) · `products/new` · `products/[id]/pdf` (admin 5-min signed URL) · **Orders** (last 200,
Resend WhatsApp bypassing the cap) · **Messages** (contact inbox, mark done) · Setup / Content / Integrations /
Launch (onboarding checklists in `store_settings`; secret-looking keys rejected).
Note: `store_settings.content` (hero text, testimonials, socials) is **not read by the public site**. Hero and
testimonials are hard-coded in components.

### Libraries (`src/lib`)
`products.ts` (catalog reads, React `cache()`) · `catalog.ts` (`editionLocaleFor`, `localizeProduct`, sort/categories) ·
`orders.ts` (`markOrderPaid`, deliverable items, order URLs/tokens) · `delivery.ts` (signed URLs, WhatsApp send +
caps) · `interakt.ts` (per-locale template config from env) · `reminders.ts` · `reconcile.ts` · `razorpay.ts` ·
`cdn.ts` (`purgeFiles`, `purgePublicPages`) · `covers.ts` (`mediaUrl`, WebP variants) · `previews.ts` +
`preview-pdf.ts` (6-page preview PDF with pdf-lib) · `reader-pages.ts` (server: WebP 200/400/800/1600 at
`covers/reader/…`) · `render-pdf-pages.ts` (browser PDF.js render) · `i18n.ts` (`mr|hi|en`, default `mr`, UI/ORDER
copy) · `product-copy.ts` (book-page labels follow the **edition** language) · `order-copy.ts` · `purchases.ts`
(device order memory) · `meta-pixel.ts` · `onboarding.ts` (`productIsReady`) · `auth.ts` / `admin.ts` ·
`supabase/{client,server,ssr-server,config}.ts` (8 s timeouts, no client retries). `src/data/catalog.ts` = seed data +
`SITE` constants (contact details, support phone).

### i18n mechanics
`LanguageProvider` reads localStorage `kaf-locale` after mount (server HTML is always Marathi, then switches);
`setLocale` also writes cookie `kaf_locale` (read only by the order page). `useT()` / `<Tr mr hi en />` for text.
`LanguagePicker` = first-visit modal (not on `/dashboard`, `/order`). Still single-language: sort labels, testimonials,
page `<title>`/meta, category chips + "Combo Pack" badge + ListBanner (English), the whole dashboard (English).
`CommandPalette` (Ctrl/Cmd+K) only finds books available in the current language.

### Sample reader pipeline
Sources in order: reader page images (`reader_pages_<l>`, migration 007) → preview PDF via PDF.js → gallery images.
PDF.js worker/fonts/wasm are vendored in `public/vendor/pdfjs-6.3.289/` (copied by `node scripts/copy-pdfjs.mjs`;
the version is hard-coded in `SampleReader.tsx` and `render-pdf-pages.ts`, so update all three together).
Backfill: `npm run db:reader-pages` (`--force`, `--dry-run`, `--only=<slug>`).

### Scripts
| Command | What |
|---|---|
| `npm run dev:webpack` | Local dev (use this on the Windows PC) |
| `npm run db:seed` | Upserts the seed catalog from `src/data/catalog.ts` (rarely needed now) |
| `npm run db:upload-pdfs` | `content/ebooks/*.pdf` → `pdfs` bucket + preview PDF. Does **not** build reader pages or update `available_locales` |
| `npm run db:reader-pages` | Builds reader page images for editions that lack them |
| `npm run db:cover-600` | Adds the 600 px variant to images uploaded before it existed (only adds files) |
| `scripts/create_client_intake.mjs` | Old client-intake spreadsheet generator (git-ignored, machine-specific) |

### Known small code issues (low priority)
- Dead code: `Rating.tsx`, `DetailSkeleton`, `getFeaturedEbooks`/`getFeaturedCombos`, magic-link route + `/auth/callback`,
  create-next-app SVGs in `public/`.
- Stale comment `products.ts:116` mentions `revalidateTag("products")`; nothing calls it (we use `revalidatePath`).
- `delivery.ts`: with a Document-header template only the **first** deliverable PDF is attached. That's fine
  while combos are one merged PDF; revisit if combos ever use member books.
- `/my-books` exports `revalidate 300` while `next.config.js` sets `no-store` on it. It holds no personal data,
  so this is harmless.

---

## 9. Environment variables

Full list with meanings: `.env.local.example` (local) and `deploy/app.env.example` (server). Summary in
`docs/HANDOFF.md` §8. Most important:

- `ORDER_ACCESS_SECRET` signs order and download links. **Never change it after real sales**, because
  that breaks every buyer's saved link. It was generated new for the server on 2026-10-10.
- `RAZORPAY_KEY_ID/SECRET` = **live** keys since 2026-10-11 (set by the owner via Lightsail browser SSH; rollback: `cp app.env.test-keys-backup app.env` + `IMAGE=$(cat .current-image) bash deploy.sh`). `RAZORPAY_WEBHOOK_SECRET` must equal the secret in
  Razorpay's webhook (a webhook 400 in Razorpay's log means a mismatch).
- `AUTO_WHATSAPP_ON_PAYMENT=true`. `INTERAKT_TEMPLATE_*_MR/_HI` = `payment_sucess_pdf_v2`, language `mr`
  (Hindi buyers get Marathi text + the Hindi PDF until a Hindi template is approved).
- `INTERAKT_REMINDER_TEMPLATE_NAME=pending_followup_v2`. Reminder delays on the server (2026-10-11):
  `PAYMENT_REMINDER_DELAY_MINUTES=10` (abandoned) and `PAYMENT_FAILED_REMINDER_DELAY_MINUTES=10` (failed);
  code defaults are 30 / 10. Local copy `C:\Users\shivr\kaf-keys\app.env` updated to match (backup next to it).
- **Cron** (cron-job.org → `POST /api/cron/reconcile` every 10 min, Bearer `CRON_SECRET`) does, in order:
  reconcile unpaid orders with Razorpay → payment reminders → next-day lead follow-ups (off until
  `INTERAKT_LEAD_TEMPLATE_NAME`). Changing a delay needs no cron change. Healthy response:
  `{"ok":true,…,"reminders":{"due":…,"sent":…},"leads":{"due":0,"sent":0}}` — check cron-job.org → History = 200.
- `INTERAKT_LEAD_TEMPLATE_NAME` / `_LANGUAGE` / `_LANGUAGE_HI` / `_LANGUAGE_EN`: interested-buyer follow-up
  (marketing template, body `{{1}}` book, `{{2}}` link). Empty = off.
- `ADMIN_EMAILS` (fails closed), `CRON_SECRET` (≥ 32 chars), `CHECKOUT_DEMO_MODE=false`.
- `CLOUDFLARE_ZONE_ID` / `CLOUDFLARE_API_TOKEN` (purge on admin save + after every deploy).

---

## 10. Rules for agents working here

**User preferences**
- Explain in **plain, short English**. The user types fast with typos, so read for intent.
- **Commit/push only when asked** (they usually say "… and push"). A push deploys to production.
- The UI should **match the original site**. Keep our own data, buying flow and anything safer.
  Decisions are tracked in `docs/ui-match-original.md`.
- WhatsApp/Interakt is a real feature: keep it working, but don't propose new WhatsApp features unasked.
- After their phone tests they usually ask "check the database". Use a **read-only** Node script with
  `.env.local`, and mask phone numbers in the output.
- Smooth experience under Reel traffic is the main goal.

**Safety**
- Never change the original site. Never touch the original site's Razorpay webhook or keys. Never
  regenerate the Razorpay live key "immediately" (it would break the original site).
- Never trigger a real checkout or order without the user's OK. It creates real Razorpay and DB rows in
  production. To see what Buy sends, stub `window.fetch` in the browser.
- Don't delete test orders yourself (the user may).
- Agents can't log in to `/dashboard` (no passwords). To test a dashboard component, render it on a
  temporary local page and delete it afterwards.
- `.env.local` = production DB. Dry-run scripts first.

**Local development (Windows)**
- Windows Application Control blocks Turbopack's native binary. Use **`npm run dev:webpack`** (preview
  config `kaida-dev-webpack`, first compile about 45 s) and `npx next build --webpack`; `kaida-prod` runs
  `next start -p 3100`. Linux/Docker builds are unaffected.
- Keep `npx tsc --noEmit` and `npx eslint` clean. The React Compiler lint rejects manual `useCallback` it
  can't preserve and `Date.now()` in a component body (move it into a helper).
- After moving route files, delete `.next/types` and `.next/dev/types` (stale "Cannot find module" errors).
- **Don't add `loading.tsx` under `ebooks/` or `combos/`.** List-page skeletons live in the `(list)` route
  groups. A skeleton on book pages makes unknown slugs return 200 instead of 404.
- Bash heredocs containing Devanagari broke several times. Write scripts to a file, or use the Edit tool.
- Fonts: only **Geist** (English, Latin letters only via `unicode-range`) is a web font, self-hosted in
  `src/app/fonts/`, **not preloaded**. Marathi/Hindi use the device's Devanagari font (as on the original
  site). Don't re-add font preloads or a Devanagari web font without measuring: Chrome holds the first
  paint for preloaded fonts (book page first paint 5.9 s → ~1.5 s when removed, 2026-10-11). Don't go back
  to `next/font/google` (flaky build-time download, go-live problem 18).
- Images: covers / preview / reader pages have 200/400/600/800 px WebP (+1600 for reader pages). New
  uploads make all sizes; `npm run db:cover-600` backfilled 600 px for older images.

---

## 11. Open items (prioritised)

### Next up (before announcing)
1. **Stage 4 functional tests** on `kaydyachaanifayddyacha.com` (test keys): success purchase, failed
   payment → reminder, order page refresh, My Books, **Instagram in-app on Android + iPhone**, dashboard
   edit → page updates within 5 min, unknown URL → 404, close tab after paying. Some test purchases
   already happened 10-10 evening. Check them against the table and write the results into `go-live-plan.md`.
2. **Supabase Auth → URL Configuration** for the Mumbai project (Site URL + redirect URLs): never
   confirmed (`go-live-plan.md` 1B, `setup-steps-lightsail.md` Step 2). Dashboard login on the new
   domain is the test.
3. **Stage 5**: PageSpeed ✅ (home 93, book 85 — §7a). Still to do: a real phone on Jio/Airtel 4G opening a
   book link from Instagram, WebPageTest (Mumbai, Moto G, 4G), k6 `loadtest/` (landing spike, checkout,
   webhook replay, download), container drill, deploy-under-load.
4. **Stage 6 go-live**: ✅ Razorpay live keys + new live webhook + real ₹99 purchase (2026-10-11).
   **Owner to do now:** hide/delete **#31 "test book" (₹1, visible)**; refund the ₹99 + ₹1 test payments in
   Razorpay, then press **Check with Razorpay** on those orders; in Razorpay → Live → Webhooks → **our**
   webhook, also tick **`refund.created`** and **`refund.processed`**; run the k6 **Server direct** test;
   get an Interakt **marketing** template approved for interested buyers (body `{{1}}` book title,
   `{{2}}` book link) and set `INTERAKT_LEAD_TEMPLATE_NAME` (+ `_LANGUAGE`) in `/opt/kaf/app.env` → the
   next-day follow-up switches on (cron, after reminders; skips buyers who paid or got a reminder that day).
   Still: confirm with the owner whether the live key was *regenerated* (if
   yes, the original site's Vercel needs the new secret within 24 h); an iPhone purchase from Instagram;
   warm the cache; Google Search Console (add domain, submit `/sitemap.xml`); update the Instagram bio and
   Reel links. **SSH note:** the laptop can't SSH to the server (home IP changed); server edits go through
   Lightsail → kaf-a → Connect using SSH (browser SSH allowed in the SSH firewall rule), or update the
   port-22 rule with the new IP.

### Ideas (not started)
- Order CSV export (accounts/GST) · nightly WhatsApp sales summary to the owner · move dashboard totals into
  SQL once orders reach thousands/week (each dashboard view now reads all orders since go-live) · optional:
  block downloads for fully refunded orders (today a refund does not revoke access).

### Waiting on the owner / client
5. UI decisions: **#9** WhatsApp button label, **#23** disclaimer box + "Featured" sort on `/ebooks`
   (suggestion: keep the disclaimer, drop the sort), **#36** confirm the testimonials / 4.8 stars are real.
6. **#46 Security problem on the ORIGINAL site:** its public R2 bucket and `fileUrl` let anyone download
   the full PDFs. The client must make that bucket private. Ours is safe (checked).
7. **Support e-mail:** the site shows `support@kaydyachaanifaydyach.com`, but that domain has **no mail
   server**. Set up mail on the new domain (Hostinger or Cloudflare Email Routing) and switch the address.
8. **Meta Pixel + Conversions API**: need from the client's Meta Business account:
   1. **Pixel (dataset) ID** the ads optimise for: Events Manager → Data sources → the pixel → ID (15–16
      digits). The original loads 5 pixels (~400 KB); use 1, max 2.
   2. **Domain verification**: Business Settings → Brand safety → Domains → add `kaydyachaanifayddyacha.com`
      → DNS TXT record → its `facebook-domain-verification=…` value goes in Cloudflare DNS (TXT, `@`) → Verify.
   3. **Conversions API access token** (secret): Events Manager → the pixel → Settings → Conversions API →
      Generate access token → save in `kaf-keys/meta-capi-token.txt` (never in chat).
   Optional: the owner's Facebook account as partner/admin on the pixel (to use Test events).
   Then: GitHub variable `NEXT_PUBLIC_META_PIXEL_IDS` → deploy; **build** the server-side Purchase via the
   Conversions API from the Razorpay webhook (not in code yet), deduplicated with the browser Purchase by
   `event_id` = order id (the browser already sends `eventID` = order id); token in `app.env`; test in
   Events Manager → Test events (PageView → ViewContent → InitiateCheckout → Purchase ₹99); add Meta
   tracking to the privacy policy.
9. **5 missing books** (PDFs from Ajay) → create them → point their redirects at the real pages.
10. Hindi versions of both Interakt templates (optional) → `INTERAKT_TEMPLATE_LANGUAGE_HI=hi` etc.
11. Past buyers of the original site: their old download links stay on the old domain (it isn't moving).
    Later the client may forward the old domain to ours.

### After launch
12. About a week without problems → pause, then delete the Tokyo Supabase project and the Replov
    deployment (+ its Razorpay test webhook).
13. Lightsail alarms (CPU > 70 %, status check), weekly Supabase egress check (250 GB on Pro). Consider
    compressing the big PDFs (#26 49.5 MB, #25 33 MB, #30 29 MB).
14. Second server + Cloudflare Load Balancing only if needed (CPU > 60 % in a Reel peak, an outage, or
    sales make the risk expensive).

### Tech debt
- No CSP header yet (must allow Razorpay + connect.facebook.net). No refund status handling.
- Old `/api/preview/<old id>` links from the original aren't redirected.
- `README.md` is still create-next-app boilerplate.
- Caddy still answers `new.kaydyachaanifayddyacha.com` (unused staging name); harmless.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is passed by `deploy.yml` but the Dockerfile doesn't read it. This
  is harmless because one image runs everywhere.

---

## 12. Things in other docs that are now OUT OF DATE

Trust this file over these where they disagree:

| Doc | Stale part | Truth now |
|---|---|---|
| `HANDOFF.md` §1–2, §7–8 | Says ours = Replov, Supabase = Tokyo `yjsm…`, deploy = "redeploy on Replov", cron URL on Replov, Lightsail "planned, not live" | Production = `kaydyachaanifayddyacha.com` on Lightsail, Supabase Mumbai `ntqwvfks…`, push-to-deploy, cron on the new domain |
| `HANDOFF.md` §2 | Fonts / "Turbopack" | Geist (Latin, not preloaded) + the device's Devanagari font |
| `HANDOFF.md` §4 | "4 test orders" | 9 test orders (§3 here) |
| `deploy-lightsail.md`, `viral-launch-plan.md` §5b | **Two** servers + Load Balancing (≈ ₹4,900/mo) | **One** server (≈ ₹3,300/mo incl. Supabase Pro); second server later only if needed |
| `viral-launch-plan.md` status table / "next actions" | Phase states from 09-26 | Migrations 001–007 applied; Phases 1–3, 9 done; 5 done (Cloudflare live); 4, 7, 8 pending |
| `go-live-plan.md` "Current status" | "GitHub variables not confirmed" | They're set (deploys work and the sitemap shows the real domain) |
| `go-live-plan.md` Stage 7 | CloudWatch / EC2 wording | We're on Lightsail: use Lightsail → Metrics alarms |
| `deploy/app.env.example` comment | "Staging: new.…" | No staging host. The main domain is used for testing (decision 10-10) |
| `setup-steps-ec2.md` | Whole file | Not used (fallback while Lightsail was blocked) |

---

## 13. History — what we did, how, and when

| Date | Commits | What happened |
|---|---|---|
| 08-09 | `c9f2e3b` | create-next-app starting point |
| 09-25 | `959b868` … `66f3f9b` | Production checkout (Razorpay, server-side price), admin dashboard with guided client onboarding (setup, content, integrations, launch), password login, validated uploads, Supabase covers |
| 09-26 | `4521f1b` `45c97b8` `d1c294a` `29cb18f` `a33c5d5` `88b6902` | **Viral-readiness audit + phases 1–4, 6, 7** (`viral-launch-plan.md`): atomic paid transition, `/order` page, `/api/download` with 5-min URLs, capped WhatsApp, My Books security fix, slim pages, WebP images, security headers, `proxy.ts`, funnel view, k6 scripts |
| 09-26 | `021dce0` `1c352ca` `29d1c4c` `08d0766` `defe60a` `140fdc1` | AWS plan within ₹7,000/mo, Docker + Caddy + zero-downtime deploy script + GitHub deploy workflow, **outage handling** (Supabase/Razorpay down → busy messages, webhook 503 → redelivery, reconcile cron) |
| 09-27 | `fcb8bf8` `8ae0eaa` `918f2ae` | Multilingual editions (mr/hi/en) for products + delivery; Docker fix for Replov |
| 09-28 | `547f9ed` `6c070c9` `75bbdc7` `6efc9f3` | Real PDFs uploaded (upload script), dummy products removed, old-URL redirects, combos on `/ebooks`, dashboard View/Remove/Cancel for PDFs and images |
| 09-29 | `3e1d42e` `5340c80` `4703714` `e4cb78b` `e51b856` | Product page + header + home made to look like the original; Next.js 16.3.6 + sharp 0.35.5 (security); `dev:webpack`; how-to-buy text = our flow |
| 10-01 | `1e54bdc` `f09052e` `40b9472` `9c23a35` `89ae940` | **Interakt WhatsApp** PDF delivery + payment reminders (migration 005), Meta Pixel code (off), real 404s, order-page popup fixes. Full test-mode purchase test on the user's phone ✅ |
| 10-04 | `5bc6d82` `e4c4d82` | Go-live prep: new domain, `/media` image proxy, preview-PDF purge. **Supabase copied Tokyo → Mumbai** by Claude (schema, 102 storage files, rows) and verified. Cloudflare zone set up |
| 10-05 → 10-09 | `d58a785` `e38c703` `a2a47d4` | Lightsail 2 GB plan blocked on the new AWS account → planned EC2 fallback; deploy opens SSH only for the runner (problem 11) |
| 10-10 | `a6fc798` … `c653c97` | AWS lifted the limit → **Lightsail `kaf-a` created**, firewall, server setup, first deploys (fixed: health check `wget` missing, missing `NEXT_PUBLIC_*` variables, flaky Google Fonts → self-hosted), Cloudflare rules via API, webhook, cron, UptimeRobot. **Site live** (test keys). Deploy now syncs server files + purges Cloudflare |
| 10-10 | `03af860` `85d4131` `63c3183` | Hero animation fix, favicon/app icons from the logo, **UI match with the original** (items 1–36, tracker `ui-match-original.md`), Caddy static-file fallback between containers during deploys |
| 10-10 | `53982ee` | **Language picker + full mr/hi/en UI**, contact form + `/dashboard/messages` (migration 006), "where is my PDF" help on the order page |
| 10-10 | `f238d38` `d0552dc` `7d087da` | **In-page sample reader** (no new tab), reader pages = WebP images made from the PDF (migration 007, `db:reader-pages`, built in the dashboard on upload); phone carousel autoplay; reader as a pop-up on phones, hand cursor, frosted loading on tapped cards |
| 10-11 | `5c3f788` + Cloudflare rule | **Speed pass from PageSpeed** (home 85, book page 75 / LCP 6.0 s): no font preloads, Geist limited to Latin, Devanagari web font dropped (device font), `/ebooks` + `/combos` lists in the HTML (no `useSearchParams`), 600 px image variant + 200 px thumbnails. Cloudflare Transform Rule so Instagram `?igsh=` links hit the cache (see §7) |
| 10-11 | `3795afe` `1eaa7ab` | Book page 91–92 (sample reader on demand, `.cv-auto` below the fold); `inlineCss` tried and removed. Speed comparison with the original (doc "Site Speed: Ours vs Original": ours 83–94 mobile vs 44–64; the original is only ahead on server answer from Airtel, which Cloudflare Free routes via Marseille; a paid Cloudflare plan is not expected to fix that). **Razorpay LIVE** keys + live webhook; first real ₹99 purchase OK |
| 10-11 | docs | PageSpeed after the changes: home 85 → **93**, book page 75 → **85**. Owner decisions: language pop-up stays as it is; Cloudflare Web Analytics stays **on** (real-user speed data). Speed section §7a added |
| 10-11 | `e989e59` `4c27f38` `0ae3439` `d40949e` `49d823f` | **Admin rework.** Overview = sales dashboard; Orders page (period tabs, clickable filter cards, search, book names, IST, wa.me, Resend); **order detail page** with Check with Razorpay / copy buyer link; **refund tracking** (migration 008, webhook `refund.*`, net revenue); **PDF uploads > 10 MB were failing** (Next 16 `proxy.ts` copies only 10 MB → "Unexpected end of form" → 500 / React #441) → `experimental.proxyClientMaxBodySize: "95mb"`, reproduced + verified locally; refused saves show "Not saved: …" and keep the form; Marathi-only titles got URL `-` → now `book-<id>`; no cover → PDF's first page; dashboard checked at 375/768/1280 px (2-row menu on phones, overflow fixes) |
| 10-11 | `bd822ce` | Buyer: Back after paying no longer shows the stuck payment spinner (bfcache `pageshow` closes checkout); "you may also like" carousel on the order page |
| 10-11 | loadtest | k6 Reel spike from Grafana Cloud Mumbai: 66,825 req, 300 req/s peak, 0 errors, p95 17 ms, 100 % edge, server CPU flat. Scripts: `loadtest/landing.js`, `origin.js`, `cloud-*.js` (free plan: 100 VUs, URLs grouped by `name` tag) |
| 10-11 | `99050fb` | **Didn't-pay flow**: failed-payment help screen; cancel → WhatsApp offers sign-up with consent (migration 009 `leads`, `/api/leads`, `src/lib/leads.ts`, `LeadCapture.tsx`, copy in `src/lib/lead-copy.ts`); **Interested buyers** admin page `/dashboard/leads` (cards, bought-later, follow-up, Remove = opt-out) + Overview card + menu item (phone menu 4+3); failed-payment reminder 10 min; next-day follow-up (off until the marketing template is set); privacy policy paragraph. Also: stale-deploy recovery (`src/lib/stale-action.ts`, error screens), docs-only pushes skip deploy, coloured order timeline. All checked at 375/768/1280 px with a fake Razorpay/checkout (no real orders) |
| 10-11 | server config | Owner set both reminder delays to **10 min** in `/opt/kaf/app.env` and restarted (live `99050fb` healthy, cron endpoint answering); local app.env copy synced |
| 10-11 | loadtest | k6 Server direct: 11,028 req, 0 errors, comfortable ≈ 30–40 req/s uncached (6–8× a Reel's origin load). Found: every `/order` visit reads the whole catalog from Supabase for the header search box — caching it (5 min) is the next easy capacity win |
| 10-11 | (this commit) | **Catalog cached across requests** (`src/lib/products.ts`: `unstable_cache` 5 min, tag `products`, + React `cache()` per request). `/order` and other per-request pages no longer query Supabase on every visit (local prod build: first request 0.16 s, then 0.013–0.024 s). Admin save/delete/show-hide call `updateTag("products")` (read-your-writes); script changes appear within 5 min. Chose `unstable_cache` over `"use cache"` because that needs the app-wide Cache Components switch |

Problems we hit while going live and how we fixed them: `go-live-plan.md` → "Problems we hit"
(19 entries: domain spelling, Tokyo latency, IPv6-only DB host, Lightsail plan block, health check, build
variables, fonts, Cloudflare Free-plan limits …).

---

## 14. Doc index

| Doc | Use it for | Freshness |
|---|---|---|
| **`docs/PROJECT-STATUS.md`** | This overview | Current |
| `docs/go-live-plan.md` | Go-live stages 0–7 with checklists, problems log, hosting decision, test tables for Stages 4–6 | Current (minor stale bits, §12) |
| `docs/ui-match-original.md` | Every UI decision vs the original site (items 1–49 + status) | Current |
| `docs/HANDOFF.md` | Deep detail: buyer flow, catalog, dashboard, env vars, Interakt templates, Razorpay rules, local dev tips | Detail still right; hosting/DB parts stale (§12) |
| `docs/setup-steps-lightsail.md` | Server setup steps 1–7 with "if it fails" fixes | Current (done) |
| `docs/viral-launch-plan.md` | Original audit, cache/WAF rule tables (Phase 5), outage handling (Phase 9), per-Reel runbook | Rules current; status table stale |
| `docs/deploy-lightsail.md` | Server runbook: manual deploy/rollback, monitoring, per-Reel routine, how code supports multiple servers | Two-server parts superseded |
| `docs/setup-steps-ec2.md` | EC2 alternative | Not used |
| `loadtest/README.md` | k6 tests (production-safe Reel spike ✅ passed 11 Oct, Server direct pending) + 12 failure drills | Current |
| `supabase/checks/verify.sql` | Pre-launch DB checks | Not run |
| `AGENTS.md` / `CLAUDE.md` | Next.js 16 warning (auto-written by `next dev`) | — |
