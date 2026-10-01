# Project handoff — Kaydyacha Ani Faydyach ebook store

> Written 2026-09-30 for the next developer / AI agent. Read this first, then
> `AGENTS.md`, then the two deeper docs it points to. Everything below was
> checked against the code, the database or the live sites on the date above.

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
| **Ours** | https://kaidyachaanifaidyacha-28da.replov.com | This repo, deployed on **Replov**. The user redeploys it manually from the latest `main` commit. |
| **Original** | https://www.kaydyachaanifaydyach.com | The client's **previous** site (hosted on Vercel, its own database + Cloudflare R2 images). **Reference only — never change it.** We copy its look, content and product numbering. The domain will later be moved to our site. |

The big number on each card on the original `/ebooks` page **is our product `id`**.

---

## 2. Stack & where things live

- **Next.js 16.3.6** (App Router, Turbopack, `proxy.ts` instead of middleware — this
  Next version differs from older docs; read `node_modules/next/dist/docs/` before
  changing framework-level code, per `AGENTS.md`), React 19.2, Tailwind 4, TypeScript.
- **Supabase** project `yjsmebmytltwwihvivbd` — Postgres, Auth (admin login), Storage.
  Local `.env.local` points at the **same project the live site uses**, so any
  database or storage write you make locally **is live immediately**.
- **Razorpay** for payments. **Interakt** (WhatsApp) is wired but switched off.
- `sharp` (image variants), `pdf-lib` (preview PDFs).
- Output: `standalone` Docker image (`Dockerfile`, node 22-slim).

```
src/app/                 routes (pages, API routes, dashboard, order page)
  api/checkout           create order (server-side price) → Razorpay order
  api/checkout/confirm   verify Razorpay signature → mark paid (atomic)
  api/razorpay/webhook   backup path to mark paid (HMAC + amount check)
  api/download/[orderId] token + paid check → 5-min signed Supabase URL (302)
  api/cron/reconcile     sweep unpaid orders against Razorpay (Bearer CRON_SECRET)
  order/[orderId]        refreshable order page, auto-downloads once
  my-books               orders saved on this device (localStorage)
  dashboard/*            admin (products, orders, setup, content, integrations, launch)
  dashboard/products/[id]/pdf   admin-only "View PDF" (5-min signed URL)
src/components/          UI (ProductDetail, ProductGallery, BuyButton, StickyBuyBar, …)
src/lib/                 products.ts (catalog read + cache), catalog.ts (locale helpers),
                         orders.ts, delivery.ts, reconcile.ts, razorpay.ts, onboarding.ts,
                         previews.ts / preview-pdf.ts, covers.ts, cdn.ts, i18n.ts
src/data/catalog.ts      seed data (used only when Supabase isn't configured) + SITE constants
scripts/                 seed.ts, upload-pdfs.ts
supabase/                schema.sql, migrations 001–004 applied, 005 (payment reminders) to run, checks/verify.sql
deploy/                  Lightsail/Caddy/docker-compose setup (planned production, not in use)
docs/                    viral-launch-plan.md, deploy-lightsail.md, this file
loadtest/                k6 scripts + failure drills
content/                 LOCAL ONLY, git- and docker-ignored: ebook PDFs + original images
```

---

## 3. Buyer flow (as built)

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
5. The order stays in **माझी पुस्तके** (`/my-books`) on that phone for re-downloads.
6. If the browser dies after paying: webhook marks it paid; the order page and the
   10-minute cron ask Razorpay directly, so no paid order is lost.

**Language editions:** each product has `mr` / `hi` / `en` editions (title,
descriptions, pages, cover, previews, PDF). The site UI language defaults to
Marathi. If a book has no edition in the visitor's language, the page shows and
**sells the edition it has** (`editionLocaleFor` in `src/lib/catalog.ts`); checkout
also falls back server-side. Hindi-only books (#27, #30) are buyable from Marathi mode.

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
- **Missing from our site (exist on the original):** #22, #28, #29, #31 (deleted as
  placeholders) and #32 ग्रामपंचायत योद्धा (never created). They come back when Ajay
  sends their PDFs. Their old URLs temporarily redirect to `/ebooks` / `/combos`.
- `available_locales` = editions on sale (listing complete + PDF). Recomputed when an
  edition is saved in the dashboard.

### Storage layout (Supabase)

| Bucket | Path | Notes |
|---|---|---|
| `pdfs` (private) | `<slug>-<locale>-<timestamp>.pdf` | Served only via 5-min signed URLs |
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

**Deliberate differences (keep them):** the original says buyers fill in name +
WhatsApp before paying and receive the PDF by WhatsApp and email. Our site has no
pre-payment form and delivers by instant download + माझी पुस्तके, so the FAQ answers
and the "How to buy" steps describe **our** flow (commit `e51b856`).

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
| Page weight | slim search index (not full catalog) in every page; visible server HTML; below-fold animations only |
| Images | covers/previews as 200/400/800 px WebP with srcset, lazy loading, 1-year cache; `hero.webp` 32 KB; logo sized to display; optimizer cache 31 days |
| Checkout speed | Razorpay preconnect + `checkout.js` prewarm on touch/hover |
| Reliability | atomic paid transition shared by confirm + webhook; unique Razorpay ids; amount check; 8 s Supabase timeouts, no retry storms; webhook returns 503 on DB errors so Razorpay redelivers; order page + 10-min cron reconcile with Razorpay; busy/retry messages instead of errors |
| Security | security headers, `pdf_path` never public, 5-min signed download URLs, per-order caps, admin fails closed, Next.js 16.3.6 / sharp 0.35.5 (0 audit vulnerabilities) |
| Observability | `funnel_daily` view (migration 002); log tags `[checkout]`, `[confirm]`, `[webhook]`, `[download]`… |
| Load tests | `loadtest/` k6 scripts (landing spike, checkout, webhook replay, download) + 12 failure drills — **written, not yet run** |

### Target production architecture (planned, NOT live)

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

Checked 2026-09-30: responses from the Replov URL carry **no CDN headers** (no
`cf-cache-status`, no `age`) — every visit reaches the Next.js server directly.
ISR still avoids per-visit database queries, but there is **no edge cache, no rate
limiting and no failover**. `X-Nextjs-Cache` also showed `STALE` repeatedly on book
pages — worth checking that background revalidation succeeds on Replov.

**Before a Reel points at this site**, do one of:
1. Put **Cloudflare (proxied)** in front of the production domain with the Phase 5
   cache/WAF rules (works with Replov as the origin if Replov allows a custom domain
   behind a proxy), or
2. Move to the planned **Lightsail ×2 + Cloudflare** setup (`docs/deploy-lightsail.md`;
   GitHub workflow `.github/workflows/deploy.yml` is ready but skipped until
   `DEPLOY_ENABLED=true`).

Then run the `loadtest/` scripts against staging and the per-Reel runbook
(`viral-launch-plan.md` §Phase 8).

**Watch costs:** PDFs download straight from Supabase (not through the CDN) —
Supabase egress is the main variable cost (250 GB on Pro). Some PDFs are up to 50 MB;
compressing them would cut egress and speed up downloads on mobile data.

---

## 8. Deploying & environment variables

### How the user deploys now

Push to `main` → the user clicks redeploy of the **latest commit** on Replov. (An
earlier redeploy served an old build — always confirm the commit, e.g. check a
feature from the newest commit on the live URL.) The GitHub "Deploy" workflow runs on
every push but is **skipped** (`DEPLOY_ENABLED` unset). The "Reconcile payments" cron
workflow is skipped for the same reason — so **the 10-minute payment sweep is not
running**; set it up on whatever host is used.

### Build-time (public, inlined into the JS)

| Var | Missing → |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | site shows seed books with no covers/previews; image optimizer blocks Supabase images |
| `NEXT_PUBLIC_SITE_URL` | currently the original domain (correct for after the domain move; sitemap/canonical point there meanwhile) |

### Runtime (server secrets — never in git)

| Var | Purpose / if missing |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | all server DB/storage access; checkout returns 503 |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | payments; missing → "Payment gateway temporarily unavailable" (production never uses demo mode) |
| `RAZORPAY_WEBHOOK_SECRET` | webhook verification (webhook URL `https://<domain>/api/razorpay/webhook`, events `payment.captured`, `order.paid`, `payment.failed`; auto-capture ON) |
| `ORDER_ACCESS_SECRET` | signs order/download links (`openssl rand -hex 32`; never change after launch) |
| `ADMIN_EMAILS` | who can open the dashboard |
| `CRON_SECRET` | protects `/api/cron/reconcile` |
| `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | optional cache purge on admin save |
| `DOWNLOAD_LIMIT` (30), `WHATSAPP_SEND_LIMIT` (3), `AUTO_WHATSAPP_ON_PAYMENT` (false), `INTERAKT_*` | limits / WhatsApp (off) |

Local `.env.local` (2026-09-30) has Supabase keys but **empty** Razorpay keys,
`ADMIN_EMAILS`, `ORDER_ACCESS_SECRET`, `CRON_SECRET` and webhook secret. Whether Replov
has them set is **unknown** — verify.

---

## 9. Local development

- Windows machine. **Windows Application Control blocks Turbopack's native binary**
  since the 16.3.6 upgrade → use **`npm run dev:webpack`** (preview config
  `kaida-dev-webpack`; first compile ~45 s) and `npx next build --webpack` for local
  build checks. Production builds on Linux are unaffected (verified with a local
  `docker build` + container run). Don't try to change the Windows policy.
- Port 3000 may be taken by another session's server; `autoPort` is on in
  `.claude/launch.json`.
- `npx tsc --noEmit` and `npx eslint` must stay clean (React Compiler lint rejects
  manual `useCallback` it can't preserve).
- **Testing checkout safely:** stub `window.fetch` for `/api/checkout` in the browser
  to see what Buy sends; never trigger a real checkout without the user's OK (it
  creates a Razorpay order + DB order in the shared project).
- Dashboard pages need an admin login — agents can't log in (don't enter passwords).
  To test the product form, render it on a temporary local-only page and delete it
  afterwards.
- Shell tip: long bash heredocs containing Devanagari broke several times — write
  edit scripts to a file and run them.

---

## 10. Open items (prioritised)

### Before sending Reel traffic / moving the domain
1. **Payment never tested end to end.** Confirm Razorpay live keys + webhook on the
   host, then one real purchase on Android (Instagram in-app browser) and iOS.
2. **CDN + rate limiting** in front of the site (§7 "Current reality").
3. Verify runtime env on the host (`ADMIN_EMAILS`, `ORDER_ACCESS_SECRET`,
   `CRON_SECRET`, webhook secret) and set up the reconcile cron.
4. **5 missing books** (#22, 28, 29, 31, 32) — need PDFs from Ajay; then create/restore
   them and point their redirects in `next.config.js` at the real pages.
5. **Past buyers of the original site**: their orders live in the old database; their
   links won't work on our site. Decide: keep the old site on another address, or migrate orders.
6. **Meta/Facebook pixels**: the original has 5, ours has none — ask the client whether
   ads tracking is needed before the switch.
7. Old `/api/preview/<old id>` links from the original aren't redirected yet (easy add
   in `next.config.js`).
8. Domain move: DNS from Vercel to our host; update Razorpay webhook URL; Supabase Auth site URL.

### WhatsApp (Interakt) + Meta Pixel — added 2026-10-01
- Uses the client's existing approved Interakt templates (sender shows as
  "AS Consultancy Services"): **`payment_sucess_pdf_v2`** (Document header = the
  order's PDF, `{{1}}` book name) after payment; **`pending_followup_v2`**
  (`{{1}}` name, `{{2}}` book, `{{3}}` book page link) as a once-per-phone-per-book
  reminder 30 min after a failed payment, sent by the reconcile cron
  (`src/lib/reminders.ts`, needs migration 005). Both are Marathi-only; Hindi
  versions can be added in Interakt and switched on with `*_LANGUAGE_HI=hi`.
- Meta Pixel: `NEXT_PUBLIC_META_PIXEL_IDS` (the original site's 5 IDs). PageView,
  ViewContent, InitiateCheckout, Purchase (fired on the book page before the
  redirect, eventID = order id). Never loads on `/order`, `/my-books`, `/dashboard`
  (order URLs carry the access token).

### Known issues / tech debt
- ~~Unknown book URLs returned HTTP 200~~ fixed: the list pages' `loading.tsx`
  moved into `(list)` route groups so book pages don't stream → real 404.
- `docs/viral-launch-plan.md` status table is outdated in places: migrations 003/004
  are applied; mobile now uses a full-width viewer + always-on sticky bar (not the
  compact cover of item 1.17); combos are one merged PDF (not member books, R9).
- `README.md` is still the create-next-app boilerplate.
- Big PDFs (up to ~50 MB) — consider compressing.
- P2: trim font weights, CSP header after checkout is verified, refund status handling.

### User preferences (important)
- **WhatsApp/Interakt is not a priority** — don't propose WhatsApp work unless asked.
  (Interakt is wired but off: `INTERAKT_API_KEY` empty.)
- The user wants the UI to **match the original site**; flow text must describe our
  real checkout.
- Explain in plain, short English; the user often writes quickly with typos.
- Commit/push only when asked (they usually say "… and push"); they deploy on Replov themselves.

---

## 11. Recent history (this work)

| Commit | What |
|---|---|
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
