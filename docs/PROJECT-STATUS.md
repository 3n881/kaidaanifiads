# PROJECT STATUS — master doc (read this first)

> **Last updated 2026-10-10** (live commit `7d087da`). One place for any developer or AI agent to
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
| Razorpay | Client's account (shared with the original site). **Test mode** on our site; live keys not set up yet |
| Interakt (WhatsApp API) | Client's account. Sender name "AS Consultancy Services". Templates `payment_sucess_pdf_v2` (sic) and `pending_followup_v2` |
| cron-job.org | `POST https://kaydyachaanifayddyacha.com/api/cron/reconcile` every 10 min, `Authorization: Bearer <CRON_SECRET>` |
| UptimeRobot | HTTPS monitor on `/api/health` every 5 min |
| Meta Pixel | Code ready, **off**. Waiting for the client to confirm pixel IDs |

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

## 3. Status at a glance (2026-10-10)

| Area | State |
|---|---|
| Store code (catalog, book pages, checkout, order page, downloads, My Books) | ✅ Built and working end to end in Razorpay test mode |
| WhatsApp delivery (PDF after payment) + payment reminder | ✅ Working (tested 2026-10-01; seen again in 10-10 test orders) |
| Admin dashboard (products per language, PDFs, covers, previews, orders, messages, setup) | ✅ |
| Multilingual UI (Marathi / Hindi / English) + first-visit language picker | ✅ 2026-10-10 |
| UI matched to the original site | ✅ 49 tracked items done. 3 wait for an owner decision (§11) |
| In-page sample reader (page images made from the PDF) | ✅ 2026-10-10. All 9 editions have 6 reader pages |
| Contact form + dashboard inbox | ✅ 2026-10-10 (0 messages so far) |
| Database moved Tokyo → Mumbai | ✅ 2026-10-04 |
| Server + Cloudflare + auto-deploy | ✅ 2026-10-10 (go-live Stages 0–3) |
| **Stage 4: functional tests on the live domain** | 🟡 **In progress.** The DB shows 3 paid test orders on 10-10 at 21:25–21:47 IST (#27, #30, #25) plus 1 abandoned. Results are not yet written up. Run the full checklist in `go-live-plan.md` Stage 4 |
| Stage 5: speed + load tests | ⬜ Not started (k6 scripts in `loadtest/` are written, never run) |
| Stage 6: go-live (Razorpay **live** keys + announce) | ⬜ Blocked on Razorpay live key decision + Stage 4/5 |
| 5 books missing (#22, 28, 29, 31, 32) | ⬜ Waiting for PDFs from Ajay |
| Meta Pixel | ⬜ Waiting for pixel IDs from the client |

Production database snapshot (2026-10-10, read-only): **9 active products** (all ₹99), **9 orders**
(7 paid, 1 failed, 1 created — all Razorpay **test** payments), **0 contact messages**.

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
   30 min (cron), at most one per phone + book per day.
8. If the browser dies after paying, the webhook, the order page and the 10-minute cron all ask Razorpay
   directly, so no paid order is lost.
9. **Languages:** each product has `mr`/`hi`/`en` editions. If the visitor's language has no edition,
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

`supabase/checks/verify.sql` = pre-launch checks (written, never formally run).

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
Overview (stats + onboarding progress) · **Products** (per-edition editor `ProductForm`: text, cover, up to 5
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
- `RAZORPAY_KEY_ID/SECRET` = **test** keys now. `RAZORPAY_WEBHOOK_SECRET` must equal the secret in
  Razorpay's webhook (a webhook 400 in Razorpay's log means a mismatch).
- `AUTO_WHATSAPP_ON_PAYMENT=true`. `INTERAKT_TEMPLATE_*_MR/_HI` = `payment_sucess_pdf_v2`, language `mr`
  (Hindi buyers get Marathi text + the Hindi PDF until a Hindi template is approved).
- `INTERAKT_REMINDER_TEMPLATE_NAME=pending_followup_v2`, `PAYMENT_REMINDER_DELAY_MINUTES=30`.
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
- Fonts are self-hosted in `src/app/fonts/` (`next/font/local`): Geist + Noto Sans Devanagari. Don't go
  back to `next/font/google`, because the build-time download is flaky (go-live problem 18).

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
3. **Stage 5**: PageSpeed (mobile ≥ 90; LCP was 3.8 s on 10-10 before fixes), WebPageTest, k6 `loadtest/`
   (landing spike, checkout, webhook replay, download), container drill, deploy-under-load.
4. **Stage 6 go-live**: Razorpay **live** keys (reuse the client's existing live key, or regenerate with
   "deactivate old key within 24 h" and update the original site's Vercel too), a **new** live webhook
   (don't edit the original's), add the domain in Razorpay website settings, then `app.env` → restart →
   warm the cache → real ₹99 purchase on Android + iPhone → refund → Google Search Console → update the
   Instagram bio.

### Waiting on the owner / client
5. UI decisions: **#9** WhatsApp button label, **#23** disclaimer box + "Featured" sort on `/ebooks`
   (suggestion: keep the disclaimer, drop the sort), **#36** confirm the testimonials / 4.8 stars are real.
6. **#46 Security problem on the ORIGINAL site:** its public R2 bucket and `fileUrl` let anyone download
   the full PDFs. The client must make that bucket private. Ours is safe (checked).
7. **Support e-mail:** the site shows `support@kaydyachaanifaydyach.com`, but that domain has **no mail
   server**. Set up mail on the new domain (Hostinger or Cloudflare Email Routing) and switch the address.
8. **Meta Pixel IDs** (the original has 5) → GitHub variable `NEXT_PUBLIC_META_PIXEL_IDS` → deploy →
   check in Events Manager.
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
| `HANDOFF.md` §2 | Fonts / "Turbopack" | Geist + Noto Sans Devanagari, self-hosted |
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
| `loadtest/README.md` | k6 tests A–E + 12 failure drills | Current, not run |
| `supabase/checks/verify.sql` | Pre-launch DB checks | Not run |
| `AGENTS.md` / `CLAUDE.md` | Next.js 16 warning (auto-written by `next dev`) | — |
