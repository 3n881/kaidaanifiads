# Project handoff — Kaydyacha Ani Faydyach ebook store

> Written 2026-09-30, updated 2026-10-01 for the next developer / AI agent. Read
> this first, then `AGENTS.md`, then the two deeper docs it points to. Everything
> below was checked against the code, the database or the live sites on those dates.

---

## 1. What this is

A Next.js store that sells **legal ebooks (PDF) in Marathi and Hindi** — land,
inheritance, RTI, marriage, atrocity law — for the brand **कायद्याचं आणि फायद्याचं**
(Kaydyacha Ani Faydyach; proprietor Shrutika Gochade, UDYAM-MH-26-1024122, Pune).

The creator posts Instagram **Reels 2–3× a week with millions of views**. Each
Reel sends a burst of phone visitors to one book page. The whole design protects
this flow:

```
Reel → book page → Buy → Razorpay → pay → PDF downloads immediately
                                        + PDF arrives on WhatsApp
(no login, no account, no cart, no form before payment)
```

**Core scaling rule:** anonymous browsing must be served from cache (CDN / Next
ISR), never by a fresh render or a Supabase query per visit.

### People

| Who | Role |
|---|---|
| shivrajgawali (GitHub `3n881`) | Developer / owner of this repo; deploys the site |
| Ajay Mane | Client contact. Sends PDFs on WhatsApp, uploads covers/previews from the dashboard, gives business info |

### The two websites — do not mix them up

| | URL | What it is |
|---|---|---|
| **Ours** | https://kaidyachaanifaidyacha-28da.replov.com | This repo, deployed on **Replov** (testing host — production will be Lightsail, §7). The user redeploys it manually from the latest `main` commit. |
| **Original** | https://www.kaydyachaanifaydyach.com | The client's **previous** site (hosted on Vercel, its own database + Cloudflare R2 images). **Reference only — never change it.** We copy its look, content and product numbering. The domain will later be moved to our site. **It shares the client's Razorpay and Interakt accounts with us** (§8). |

The big number on each card on the original `/ebooks` page **is our product `id`**.

---

## 2. Stack & where things live

- **Next.js 16.3.6** (App Router, Turbopack, `proxy.ts` instead of middleware — this
  Next version differs from older docs; read `node_modules/next/dist/docs/` before
  changing framework-level code, per `AGENTS.md`), React 19.2, Tailwind 4, TypeScript.
- **Supabase** project `yjsmebmytltwwihvivbd` — Postgres, Auth (admin login), Storage.
  Local `.env.local` points at the **same project the live site uses**, so any
  database or storage write you make locally **is live immediately**.
- **Razorpay** for payments (test mode working; live pending — §8).
- **Interakt** (WhatsApp Business API) — **on**: PDF delivery after payment +
  "payment not completed" reminder (§3).
- **Meta Pixel** — code ready, **off** until the client gives pixel IDs.
- `sharp` (image variants), `pdf-lib` (preview PDFs).
- Output: `standalone` Docker image (`Dockerfile`, node 22-slim).

```
src/app/                 routes (pages, API routes, dashboard, order page)
  ebooks/(list), combos/(list)   list pages + their loading.tsx (route group, see §10)
  api/checkout           create order (server-side price) → Razorpay order
  api/checkout/confirm   verify Razorpay signature → mark paid (atomic)
  api/razorpay/webhook   backup path to mark paid (HMAC + amount check); saves the
                         buyer's phone (paid AND failed); triggers auto-WhatsApp
  api/download/[orderId] token + paid check → 5-min signed Supabase URL (302)
  api/orders/contact     order page popup: save a WhatsApp number + send the PDF
  api/cron/reconcile     every 10 min: sweep unpaid orders against Razorpay, then
                         send payment reminders (Bearer CRON_SECRET)
  order/[orderId]        refreshable order page, auto-downloads once
  my-books               orders saved on this device (localStorage) + WhatsApp resend
  dashboard/*            admin (products, orders, setup, content, integrations, launch)
  dashboard/products/[id]/pdf   admin-only "View PDF" (5-min signed URL)
src/components/          UI (ProductDetail, ProductGallery, BuyButton, StickyBuyBar,
                         MetaPixel, order/OrderClient …)
src/lib/                 products.ts (catalog read + cache), catalog.ts (locale helpers),
                         orders.ts, delivery.ts (signed URLs + WhatsApp send),
                         interakt.ts (templates), reminders.ts, reconcile.ts,
                         razorpay.ts, meta-pixel.ts, onboarding.ts,
                         previews.ts / preview-pdf.ts, covers.ts, cdn.ts, i18n.ts
src/data/catalog.ts      seed data (used only when Supabase isn't configured) + SITE constants
scripts/                 seed.ts, upload-pdfs.ts
supabase/                schema.sql, migrations 001–005 (ALL APPLIED), checks/verify.sql
deploy/                  Lightsail/Caddy/docker-compose setup (planned production, not in use)
docs/                    viral-launch-plan.md, deploy-lightsail.md, this file
loadtest/                k6 scripts + failure drills
content/                 LOCAL ONLY, git- and docker-ignored: ebook PDFs + original images
```

---

## 3. Buyer flow (as built — tested end to end in Razorpay test mode on 2026-10-01)

1. Visitor opens `/ebooks/<slug>` or `/combos/<slug>` (cached page).
2. Taps **आत्ताच डाऊनलोड करा** (main button, second button under the description,
   or the always-on mobile sticky bar) → modal → `POST /api/checkout`
   (price read from DB, never the browser) → order saved on the device → Razorpay
   window opens directly. **There is no form on our site**; Razorpay asks for the
   mobile number.
3. After payment → `POST /api/checkout/confirm` verifies the signature → same-tab
   redirect to `/order/<id>?t=<token>`.
4. Order page **auto-starts the download once** and always shows Download buttons.
   `/api/download` mints a **5-minute** signed URL each click (cap 30 per order).
5. **WhatsApp:** Razorpay's webhook (`payment.captured`) saves the number typed in
   Razorpay (`buyer_contact`) and sends template `payment_sucess_pdf_v2` with the
   **PDF attached** (1-hour signed URL that WhatsApp fetches). Usually arrives
   within seconds. Webhook retries never message twice (`skipIfDelivered`).
6. **Order page popup (fallback):** if WhatsApp wasn't sent, the page waits ~8 s
   (refreshing twice) for the webhook, then opens a "PDF on WhatsApp" popup asking
   for a number. Already sent → no popup, just "पुस्तक PDF WhatsApp वरही पाठवले आहे"
   + "send to another number". The popup has **no `<form>`** on purpose (a native
   submit reloaded the page without `?t=` → "page not found").
7. The order stays in **माझी पुस्तके** (`/my-books`) on that phone for re-downloads;
   it can also re-send the PDF to the buyer's WhatsApp.
8. **Payment failed / abandoned:** the webhook (`payment.failed`) saves the phone.
   30 min later, if still unpaid, the 10-min cron sends **one** `pending_followup_v2`
   reminder with a link to the book page (`src/lib/reminders.ts`). At most one per
   phone + book per day; skipped if the buyer paid since. No phone = no reminder
   (buyer closed Razorpay before typing it).
9. If the browser dies after paying: webhook marks it paid; the order page and the
   10-minute cron ask Razorpay directly (`created` **and** `failed` orders), so no
   paid order is lost.
10. A link with a missing/broken `?t=` shows **"ही लिंक अपूर्ण आहे"** with a button
    to माझी पुस्तके (not a 404).

**Language editions:** each product has `mr` / `hi` / `en` editions (title,
descriptions, pages, cover, previews, PDF). The site UI language defaults to
Marathi. If a book has no edition in the visitor's language, the page shows and
**sells the edition it has** (`editionLocaleFor` in `src/lib/catalog.ts`); checkout
also falls back server-side, and the order's `locale` is the edition sold. Hindi-only
books (#27, #30) are buyable from Marathi mode and get the Hindi PDF.

---

## 4. Catalog — current state (9 live products, all ₹99, MRP ₹198)

| ID | Slug | Type | Lang | Pages | Previews | PDF |
|---|---|---|---|---|---|---|
| 30 | `rti-adhiniyam-2005-sampurna-guide` | ebook | hi | 245 | cover + 4 | ✅ hi |
| 27 | `hindu-uttaradhikar-kanoon-guide` | ebook | hi | 161 | cover + 5 | ✅ hi |
| 26 | `jamin-mojani-sampurna-margadarshak` | ebook | mr | 178 | cover | ✅ mr |
| 19 | `atrocity-kayada-combo` | ebook* | mr | 48 | cover + 5 | ✅ mr |
| 25 | `patsanstha-fasavnuk-combo` | combo (2) | mr | 111 | cover | ✅ mr |
| 16 | `rti-brahmastra-3in1` | combo (3) | mr | 177 | cover + 3 | ✅ mr |
| 12 | `ghar-ghenyaadhi-he-vachach` | combo (3) | mr | 205 | cover | ✅ mr |
| 8 | `vivah-te-ghatasphot-margdarshika` | combo (3) | mr | 189 | cover | ✅ mr |
| 4 | `malmatta-vatap-kayadeshir-hakka` | combo (3) | mr | 149 | cover + 5 | ✅ mr |

\* #19 is titled "2 Book Set" but is a **single ebook** on the original site (not in
its combos list); its slug still says `combo` — harmless, keep it (URLs/redirects use it).

- **Every combo is ONE merged PDF** on the combo row. `combo_items` is empty on
  purpose — the books inside combos are not sold separately (no price/cover/PDF of
  their own). Don't tick member books in the dashboard unless that changes.
- Covers + previews were imported from the original site; originals are kept in
  `content/images/<id>-<slug>/`.
- PDFs total **187 MB** (avg ~20 MB; #26 is 49.5 MB, #25 33 MB, #30 29 MB).
- **Missing from our site (exist on the original)** — come back when Ajay sends
  their PDFs; their old URLs temporarily redirect to `/ebooks` / `/combos`:

  | ID | Title on the original | Price there |
  |---|---|---|
  | 32 | EBOOK ग्रामपंचायत योद्धा | ₹99 |
  | 31 | वडिलोपार्जित जमीन एकाच भावाने विकली तर काय कराल | **₹49** |
  | 29 | हक्कसोडपत्र : हिस्सा परत मिळविणे, फसवणूक आणि कायदेशीर उपाय | ₹99 |
  | 28 | ऊसाचा हिशोब आणि कायदेशीर लढा | ₹99 |
  | 22 | लग्न, फसवणूक + हुंडा प्रतिबंध (Combo Pack) | ₹99 |
- `available_locales` = editions on sale (listing complete + PDF). Recomputed when an
  edition is saved in the dashboard.
- **4 test orders** (Razorpay test mode, 2026-10-01: #30, #25, #26 paid, #8 failed)
  are in the `orders` table and show in Dashboard → Orders / funnel stats. Harmless;
  the user may delete them in Supabase — don't delete them yourself.

### Storage layout (Supabase)

| Bucket | Path | Notes |
|---|---|---|
| `pdfs` (private) | `<slug>-<locale>-<timestamp>.pdf` | Served only via signed URLs (5 min for downloads, 1 h for WhatsApp attachments) |
| `covers` (public) | `<slug>-<locale>-v<ts>-{200,400,800}.webp` | Cover + preview-page variants, 1-year cache |
| `covers` (public) | `previews/<slug>-<locale>.pdf` | Free first-6-pages preview PDF (fixed path, 1-hour cache) |

### Adding / replacing PDFs

1. Put files in `content/ebooks/` named `<id>-<slug>-<mr|hi|en>.pdf`
   (e.g. `27-hindu-uttaradhikar-kanoon-guide-hi.pdf`). Match a new PDF to its product
   by page count + the original site's number.
2. `npm run db:upload-pdfs -- --dry-run`, then `npm run db:upload-pdfs`
   (`--force` replaces existing PDFs, `--previews-only` rebuilds preview PDFs).
   The script checks the ID and slug match before uploading, and publishes the
   preview PDF.
3. Or upload from the dashboard (limit 50 MB per file; the script has no such limit).

---

## 5. Admin dashboard (`/dashboard`)

- Login: Supabase Auth email + password; the email must be in **`ADMIN_EMAILS`**
  (fails closed — empty = nobody gets in). `proxy.ts` guards `/dashboard/*`.
- Product editor, per language edition:
  - text fields (only the **Marathi title** is required; anything else can be cleared and saved);
  - cover: Replace / Remove / Undo / cancel a new pick;
  - up to **5 preview pages**, each removable, new ones added alongside;
  - PDF: **View PDF** / Replace / Remove (with a warning — removing breaks downloads
    for past buyers of that edition) / cancel a new pick;
  - combos: "Books in this set" number + a collapsed "Also send separate books" list.
  - Uploading a PDF rebuilds its preview PDF; removing deletes it.
- Orders: resend WhatsApp on an order (admin; bypasses the per-order cap).
- A product is **Ready** when every language it is sold in is complete
  (`productIsReady` in `src/lib/onboarding.ts`). All 9 are Ready.
- Setup progress was 38% on 2026-09-28: business details pre-filled from the original site
  (approver name + disclaimer approval left for the client); website content,
  integrations ticks and launch approvals still empty.

---

## 6. Matching the original site (decisions)

The user wants our site to **look and behave like the original**. Done:

- Product page: preview viewer (पान X / N, PREVIEW badge, arrows/swipe, मागील/पुढील,
  labelled thumbnails, full-screen "मोठ्या आकारात वाचा"), "पहिली 6 पाने मोफत वाचा
  (Preview)" + "PDF Preview" link (first 6 pages of the real PDF, like the original's
  `/api/preview/<id>`), ID badge, "आत्ताच डाऊनलोड करा", second Buy + payment badges +
  share, 7-question FAQ, "तुम्हाला हे देखील आवडेल" (all other titles).
- Mobile: full-width viewer + always-on yellow sticky buy bar.
- Header: Marathi labels with English below ("(Home)", "(E-Books)"…), "खरेदी करा (Buy Now)";
  hero has one "प्रकाशन पहा (View Books)" button; home has no FAQ block.
- `/ebooks` lists every title (combos badged); home rows show all languages.
- Old URLs redirect (`next.config.js` → `redirects()`): `/ebooks/<old cuid>` → our slug
  (permanent for the 9, temporary for the 5 pending), `/ebooks/hindi`, `/ebooks/english`,
  `/site-index`.
- WhatsApp uses the **same approved templates and sender** as the original site.

**Deliberate differences (keep them):** the original collects name + WhatsApp
before paying. Our site has no pre-payment form: the PDF downloads instantly, goes
to WhatsApp at the number typed in Razorpay, and stays in माझी पुस्तके. The FAQ,
"How to buy" steps, My Books / order page text and the terms, shipping and
privacy policies all describe **our** flow (commits `e51b856`, `f09052e`).

---

## 7. Speed & high-traffic plan ("traffic-aware" site)

Full detail: `docs/viral-launch-plan.md` (audit, phases, cache rules) and
`docs/deploy-lightsail.md` (servers, costs, failover). Summary:

### Principles

1. Book pages are **prerendered + ISR (5 min)** — a visit never queries Supabase.
2. A **CDN in front (Cloudflare)** serves ~99% of Reel traffic from the edge.
3. Personal/payment routes are **never cached** (`private, no-store`).
4. **Never take money we can't record; never lose a payment that went through.**

### Already done in code ✅

| Area | What |
|---|---|
| Caching | ISR 5 min on home/list/book pages (`s-maxage=300, stale-while-revalidate`); static policy pages; React `cache()` = one catalog query per render; `no-store` on `/api/*`, `/order/*`, `/my-books` |
| CDN purge | `src/lib/cdn.ts` purges Cloudflare on admin save (needs `CLOUDFLARE_ZONE_ID` + token) |
| Page weight | slim search index (not full catalog) in every page; visible server HTML; below-fold animations only; Meta Pixel (when on) loads after the page is interactive |
| Images | covers/previews as 200/400/800 px WebP with srcset, lazy loading, 1-year cache; `hero.webp` 32 KB; logo sized to display; optimizer cache 31 days |
| Checkout speed | Razorpay preconnect + `checkout.js` prewarm on touch/hover |
| Reliability | atomic paid transition shared by confirm + webhook; unique Razorpay ids; amount check; 8 s Supabase timeouts, no retry storms; webhook returns 503 on DB errors so Razorpay redelivers; order page + 10-min cron reconcile with Razorpay; busy/retry messages instead of errors |
| Security | security headers, `pdf_path` never public, short-lived signed URLs, per-order caps, admin fails closed, order tokens never sent to Meta, Next.js 16.3.6 / sharp 0.35.5 (0 audit vulnerabilities) |
| SEO | unknown book URLs return a real **404** |
| Observability | `funnel_daily` view (migration 002); log tags `[checkout]`, `[confirm]`, `[webhook]`, `[download]`, `[reconcile]`, `[reminders]`, `[interakt] send failed`… |
| Load tests | `loadtest/` k6 scripts (landing spike, checkout, webhook replay, download) + 12 failure drills — **written, not yet run** |

### Target production architecture (planned, NOT live — the user will do this after everything else is set up)

```
Visitor → Cloudflare (cache key = path + `_rsc` only, WAF, rate limits, Load Balancing)
            ├─ Lightsail server A (Mumbai, 2 GB) — Caddy → app1 + app2
            └─ Lightsail server B (Mumbai, 2 GB) — Caddy → app1 + app2
                     both → Supabase Pro (DB + PDFs) + Razorpay
```

≈ ₹4,900/month of a ₹7,000 budget. One 1M-view Reel ≈ 5 req/s at the origin; one
server handles ~100× that — the second server is for availability. Zero-downtime
rolling deploy (`deploy/deploy.sh`) was tested locally. Key Cloudflare settings:
cache rules in `viral-launch-plan.md` §Phase 5 (bypass dynamic routes; static 1 y;
`/_next/image` 30 d; public HTML respect origin with query string limited to `_rsc`
so `?igsh=`/`fbclid` don't bust the cache), Rocket Loader off, Bot Fight Mode off,
`checkout-rate-limit` rule, webhook allow-rule, Always Online on.

### ⚠️ Current reality on Replov

Replov is the **testing host**, not production. Responses carry **no CDN headers**
— every visit reaches the Next.js server directly. ISR still avoids per-visit
database queries, but there is **no edge cache, no rate limiting and no failover**,
and a `*.replov.com` address can never sit behind our Cloudflare. `X-Nextjs-Cache`
also showed `STALE` repeatedly on book pages (2026-09-30) — worth checking.

**Before a Reel points at the site:** Lightsail ×2 + Cloudflare on the real domain
(`docs/deploy-lightsail.md`; GitHub workflow `.github/workflows/deploy.yml` is ready
but skipped until `DEPLOY_ENABLED=true`), then the `loadtest/` scripts and the
per-Reel runbook (`viral-launch-plan.md` §Phase 8).

**Watch costs:** PDFs download straight from Supabase (not through the CDN), and
each WhatsApp PDF is one more fetch — Supabase egress is the main variable cost.
~20 MB per sale → ~20 GB per 1,000 sales: the free plan (~5 GB) is not enough,
**Supabase Pro (250 GB) is required** (plan not yet confirmed). Compressing the
PDFs would cut egress and speed up downloads on mobile data.

---

## 8. Deploying & environment variables

### How the user deploys now

Push to `main` → the user clicks redeploy of the **latest commit** on Replov. (An
earlier redeploy served an old build — always confirm the commit, e.g. check a
feature from the newest commit on the live URL.) `NEXT_PUBLIC_*` values are inlined
at build time → changing one needs a redeploy. The GitHub "Deploy" and "Reconcile
payments" workflows are **skipped** (`DEPLOY_ENABLED` unset; the reconcile workflow
would also call `NEXT_PUBLIC_SITE_URL`, i.e. the wrong host). The cron runs on
**cron-job.org** instead (below).

### Third-party accounts (all the client's; shared with the original site)

**Razorpay** — status 2026-10-01: **test mode fully working** on Replov (test keys,
test webhook returning 200). Live not set up yet.
- Test and live keys/webhooks are separate; nothing in test mode affects the
  original site (Razorpay docs: test-mode actions have no live consequences).
- The live **key secret can't be read back** from the dashboard and nobody has it.
  Plan: the client regenerates the live key (OTP to their registered mobile) and
  chooses **"deactivate old key within 24 hours"**; within that window the new
  secret goes on our host **and** the original site's Vercel env → no downtime.
  Never regenerate with "immediately".
- Add a **separate live webhook** (don't edit/delete the original site's):
  URL `https://<our host>/api/razorpay/webhook`, events `payment.captured`,
  `order.paid`, `payment.failed`, secret = our `RAZORPAY_WEBHOOK_SECRET`.
  Webhook **400** in Razorpay's log = secret mismatch. Our webhook also receives the
  original site's payments and ignores unknown orders (200).
- Auto-capture must be ON.

**Interakt** — API key set on Replov. Approved templates in the account
(9 total; 3 belong to "A S Consultancy" and are not ours). Sender name shown to
buyers: **"AS Consultancy Services"** (same number the original site uses — the
user is fine with it).

| Template | Used for | Header | Body blanks |
|---|---|---|---|
| `payment_sucess_pdf_v2` (sic) | after payment (auto + popup + My Books + dashboard resend) | **Document** (the PDF) | `{{1}}` book |
| `pending_followup_v2` | payment reminder (cron) | none | `{{1}}` name, `{{2}}` book, `{{3}}` link |

Both are **Marathi only**. Hindi buyers currently get the Marathi text with the
Hindi title + Hindi PDF. Hindi texts for both templates were drafted (2026-10-01
conversation); once approved in Interakt set `INTERAKT_TEMPLATE_LANGUAGE_HI=hi` and
`INTERAKT_REMINDER_TEMPLATE_LANGUAGE_HI=hi`. Other success templates
(`payment_success_pdf_v1` etc.) are older versions; `payment_success_pdf_v1` has an
Interakt click-tracking button that doesn't work via API — don't use it.

**Meta Pixel** — the original has 5 pixel IDs (`25798398699825779`,
`938102005677893`, `1323976956324834`, `2087926305438648`, `4549881145333883`; it
sends PageView only). Ours sends PageView, ViewContent, InitiateCheckout and
Purchase (from the book page before the redirect, `eventID` = order id); never on
`/order`, `/my-books`, `/dashboard`; Meta's automatic events + history tracking
off. **Off until the client confirms which IDs to use** — not set on Replov.

**cron-job.org** — set up 2026-10-01: `POST https://kaidyachaanifaidyacha-28da.replov.com/api/cron/reconcile`
every 10 min, header `Authorization: Bearer <CRON_SECRET>`. Response
`{"ok":true,"pending":…,"recovered":…,"reminders":{"due":…,"sent":…}}`; 401 = bad
secret. Move the URL with the host.

### Environment variables

Build-time (public, inlined into the JS — redeploy after changing):

| Var | Value / if missing |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | site shows seed books with no covers/previews |
| `NEXT_PUBLIC_SITE_URL` | **set to the Replov URL for testing** (WhatsApp/reminder links and the "other books" link are built from it). Change to `https://kaydyachaanifaydyach.com` on domain-move day |
| `NEXT_PUBLIC_META_PIXEL_IDS` | comma-separated; empty = pixel off (current) |

Runtime (server secrets — never in git):

| Var | Purpose / if missing |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | all server DB/storage access; checkout returns 503 |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | currently **test** keys; missing → "Payment gateway temporarily unavailable" |
| `RAZORPAY_WEBHOOK_SECRET` | we choose it; must equal the secret typed in the Razorpay webhook (test and live webhooks get different ones) |
| `CHECKOUT_DEMO_MODE` | `false` in production |
| `ORDER_ACCESS_SECRET` | signs order/download links (random 64 hex); **never change after real sales** — it breaks every buyer's saved link. Falls back to the Razorpay key secret if unset |
| `ADMIN_EMAILS` | who can open the dashboard |
| `CRON_SECRET` | ≥ 32 chars; protects `/api/cron/reconcile` |
| `INTERAKT_API_KEY` | Interakt → Settings → Developer Setting (secret key, pasted as-is) |
| `INTERAKT_TEMPLATE_NAME_MR` / `_LANGUAGE_MR` / `_HEADER_MR` / `_BODY_MR` | `payment_sucess_pdf_v2` / `mr` / `document` / `product` |
| `INTERAKT_TEMPLATE_NAME_HI` / `_LANGUAGE_HI` / `_HEADER_HI` / `_BODY_HI` | same template; language `mr` until a Hindi version is approved |
| `INTERAKT_TEMPLATE_BUTTON_<LANG>` | URL-button blank value; empty for our templates |
| `AUTO_WHATSAPP_ON_PAYMENT` | `true` — send the PDF from the webhook |
| `INTERAKT_REMINDER_TEMPLATE_NAME` / `_LANGUAGE` | `pending_followup_v2` / `mr` (empty name = reminders off) |
| `INTERAKT_REMINDER_TEMPLATE_LANGUAGE_HI` / `_EN` | empty until Hindi/English versions are approved |
| `PAYMENT_REMINDER_DELAY_MINUTES` | `30` |
| `DOWNLOAD_LIMIT` (30), `WHATSAPP_SEND_LIMIT` (3) | per-order caps |
| `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | optional cache purge on admin save (after Cloudflare) |

`.env.local.example` documents all of these. Local `.env.local` has Supabase keys
only (Razorpay/Interakt/secrets empty) — the live values are on Replov.

### Domain / host move day (checklist)
`NEXT_PUBLIC_SITE_URL` → real domain (rebuild); new Razorpay live webhook URL (and
website in Razorpay settings); cron-job.org URL; Supabase Auth site URL;
Cloudflare DNS + Phase 5 rules + `CLOUDFLARE_*` env; one real purchase on the new host.

---

## 9. Local development

- Windows machine. **Windows Application Control blocks Turbopack's native binary**
  since the 16.3.6 upgrade → use **`npm run dev:webpack`** (preview config
  `kaida-dev-webpack`; first compile ~45 s) and `npx next build --webpack` +
  preview config `kaida-prod` (`next start -p 3100`) for production checks.
  Production builds on Linux are unaffected. Don't try to change the Windows policy.
- After moving route files, delete `.next/types` and `.next/dev/types` or `tsc`
  reports stale "Cannot find module …/page.js" errors.
- Port 3000 may be taken by another session's server; `autoPort` is on in
  `.claude/launch.json`.
- `npx tsc --noEmit` and `npx eslint` must stay clean (React Compiler lint rejects
  manual `useCallback` it can't preserve and `Date.now()` in a component body —
  put it in a helper function).
- **Testing checkout safely:** stub `window.fetch` for `/api/checkout` in the browser
  to see what Buy sends; never trigger a real checkout without the user's OK (it
  creates a Razorpay order + DB order in the shared project). The user runs test
  purchases on their phone; check results with a read-only Node script against
  Supabase (mask phone numbers in output).
- Order pages locally: the token is HMAC-SHA256 of `order-contact:<id>` with the
  local fallback secret (`SUPABASE_SERVICE_ROLE_KEY`, since local
  `ORDER_ACCESS_SECRET`/Razorpay secret are empty) — it differs from production's.
  Set `sessionStorage['kaf-dl-<id>']='1'` first to avoid an auto-download.
- Dashboard pages need an admin login — agents can't log in (don't enter passwords).
  To test the product form, render it on a temporary local-only page and delete it
  afterwards.
- Shell tip: long bash heredocs containing Devanagari broke several times — write
  edit scripts to a file and run them (the Edit tool handles Devanagari fine).

---

## 10. Open items (prioritised)

### Before real sales
1. **Razorpay live**: regenerate the live key with the 24-hour option (client, OTP) →
   new secret on our host + original site's Vercel; separate live webhook + new
   webhook secret; redeploy; one real ₹99 purchase on Android (Instagram in-app
   browser) and iPhone, then refund.
2. **Supabase plan → Pro** (egress, §7) — confirm.
3. Client: dashboard Setup approvals (approver name, disclaimer approval).

### Before sending Reel traffic / moving the domain
4. **Lightsail ×2 + Cloudflare** + domain move (§7, §8 checklist) + load tests.
5. **5 missing books** (#22, 28, 29, 31, 32 — table in §4) — need PDFs from Ajay; then
   create/restore them and point their redirects in `next.config.js` at the real pages.
6. **Past buyers of the original site**: they already have their PDFs in WhatsApp;
   only their old download links on the old domain break after the move. Options:
   keep the old site on a subdomain, or resend on request.
7. **Meta Pixel IDs** from the client → `NEXT_PUBLIC_META_PIXEL_IDS` → redeploy →
   check in Meta Events Manager → Test Events.
8. Hindi versions of both Interakt templates (optional; §8).
9. Old `/api/preview/<old id>` links from the original aren't redirected yet (easy add
   in `next.config.js`).

### Known issues / tech debt
- ~~Unknown book URLs returned HTTP 200~~ fixed (`1e54bdc`): the list pages'
  `loading.tsx` moved into `(list)` route groups, so book pages no longer stream
  before `notFound()`. Book pages have no loading skeleton on purpose — don't add a
  `loading.tsx` under `ebooks/` or `combos/` (it would bring the 200 back).
- If the success template is ever switched to a link-only one, the "PDF on
  WhatsApp" wording (My Books, order page, FAQ, policies) must change back.
- `docs/viral-launch-plan.md` status table is outdated in places: migrations 003–005
  are applied; mobile now uses a full-width viewer + always-on sticky bar (not the
  compact cover of item 1.17); combos are one merged PDF (not member books, R9).
- `README.md` is still the create-next-app boilerplate.
- Big PDFs (up to ~50 MB) — consider compressing.
- P2: trim font weights, CSP header (must allow Razorpay + connect.facebook.net),
  refund status handling.

### User preferences (important)
- WhatsApp/Interakt is **now set up and wanted** (2026-10-01). Don't propose
  unrelated WhatsApp features unless asked.
- The user wants the UI to **match the original site**; flow text must describe our
  real checkout.
- Explain in plain, short English; the user often writes quickly with typos.
- Commit/push only when asked (they usually say "… and push"); they deploy on Replov
  themselves and usually ask "check the database" after each test.
- Smooth experience under high traffic is the main goal for production hosting.

---

## 11. Recent history (this work)

| Commit | What |
|---|---|
| `9c23a35` | Automatic WhatsApp skips orders already delivered (webhook retries never message twice) |
| `40b9472` | Order page: popup only if WhatsApp not sent (waits for the webhook first), no `<form>` (fixed token-less reload → "not found"), "ही लिंक अपूर्ण आहे" page for broken links |
| `f09052e` | Wording: the book arrives as a **PDF** on WhatsApp (My Books, order page mr/hi/en, FAQ, terms/shipping/privacy) |
| `1e54bdc` | Interakt per-language templates (Document header = PDF, body/button mapping), payment reminders + migration 005, reconcile also checks `failed`, Meta Pixel, real 404 for unknown books, this doc |
| `e51b856` | How-to-buy steps (home + product page) describe our real flow |
| `e4cb78b` | `dev:webpack` script |
| `4703714` | Next.js 16.3.6 + sharp 0.35.5 (security; 0 audit vulnerabilities) |
| `5340c80` | Header/home like the original (bilingual nav, Buy Now, View Books, no home FAQ) |
| `3e1d42e` | Preview viewer, 6-page PDF previews, product page like the original, sticky bar (this commit alone doesn't build — fixed by `5340c80`) |
| `6efc9f3` | Dashboard: remove/cancel images & PDFs, save cleared fields; combo page count kept; Hindi books keep their language |
| `75bbdc7` | Dashboard "View PDF"; safer combo member list |
| `6c070c9` | Combos listed on `/ebooks` |
| `547f9ed` | Real PDFs + upload script, dummy products removed, #19/#26 fixed, Hindi-only purchase fix, combo save fix, Ready rule, old-URL redirects |
| ≤ `918f2ae` | Earlier: viral-readiness phases 1–3, outage handling, Docker/Lightsail, multilingual editions, dashboard onboarding |

### Tested 2026-10-01 (Razorpay test mode, user's phone)
Paid → auto-download → order page ✅ · webhook 200 + phone saved + PDF on WhatsApp
without popup ✅ · popup fallback while webhook was failing (no 404) ✅ · failed
payment → one reminder ~36 min later, none for paid orders ✅ · unknown book URL →
404 ✅ · My Books Interakt check ✅. Not yet tested: Purchase pixel event, live mode.
