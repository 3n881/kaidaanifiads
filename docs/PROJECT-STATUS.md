# PROJECT STATUS — master doc (read this first)

> **Last updated 2026-10-16 night** (ad-link speed check + 600 px phone cover) (live commit `ebc643f`; 14 Oct: cover fixes, Meta Pixel on, WhatsApp hint;
> 16 Oct: **Meta Conversions API live + verified**, migration 010, **§7c production settings register** = every
> setting and where it lives, **§7d brand outro video**). One place for any developer or AI agent to
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
| **Production (ours)** | **https://kaydyachaanifayddyacha.com** (+ `www`) | This repo. Live since **2026-10-10** on AWS Lightsail `kaf-a` (Mumbai) behind Cloudflare. **Razorpay LIVE keys since 2026-10-11; real purchases work. Not announced yet** (no Search Console / Instagram bio link). Note the spelling: `fay`**`dd`**`yach`**`a`** |
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
| Meta Pixel | **On since 2026-10-14**: ID `1323976956324834` (GitHub variable `NEXT_PUBLIC_META_PIXEL_IDS`). Domain verification + Conversions API token still to come from the client (§11 item 8) |

### Where secrets live (never commit, never paste in chat)

| What | Where |
|---|---|
| Production runtime secrets (Supabase service key, Razorpay, Interakt, `ORDER_ACCESS_SECRET`, `CRON_SECRET`, `ADMIN_EMAILS`, Cloudflare purge token) | `/opt/kaf/app.env` on the server (chmod 600); local copy `C:\Users\shivr\kaf-keys\app.env` |
| SSH key `kaf-key.pem`, Origin cert `origin.pem`/`origin.key`, GHCR token | `C:\Users\shivr\kaf-keys\` on the admin laptop |
| Mumbai Supabase keys + DB URL, Cloudflare Zone ID, purge token, `CLOUDFLARE_RULES_TOKEN` | `.env.mumbai` in the project folder (git-ignored) |
| Local dev settings | `.env.local` (git-ignored). **Points at the PRODUCTION Mumbai database**: any local write or script run is live immediately. Old Tokyo values are in `.env.local.tokyo-backup` |
| Build-time public values | GitHub → Settings → Secrets and variables → Actions → **Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_MEDIA_PROXY=true`, `NEXT_PUBLIC_META_PIXEL_IDS` (`1323976956324834`), `DEPLOY_ENABLED=true`, `DEPLOY_HOSTS`, `DEPLOY_LIGHTSAIL_INSTANCE=kaf-a` |
| Deploy secrets | GitHub Secrets: `DEPLOY_SSH_KEY`, `AWS_DEPLOY_ACCESS_KEY_ID`, `AWS_DEPLOY_SECRET_ACCESS_KEY` (IAM user `github-deploy`, may only edit Lightsail port rules) |

---

## 3. Status at a glance (2026-10-16)

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
| Page speed (first screen) | ✅ PageSpeed mobile home: best **97**, 3-run median **90** (12 Oct); book page 91–92. Lab scores swing ~80–97 — cause found and fixed 12 Oct (language picker blur at first paint, §7a); owner to re-run 3× |
| Cloudflare caching + deploys | ✅ 2026-10-12: deploys clear only **pages** (prefix purge + home by Cache-Tag `kaf-home`), then **warm** pages/build files/fonts; **Smart Tiered Cache** on; admin book saves clear home, /ebooks, /combos, sitemap on both hosts (§4, §7) |
| My Books | ✅ 2026-10-12: lists **paid** orders only (`/api/orders/status`); before, cancelled attempts showed as books |
| Stage 5: speed + load tests | 🟡 PageSpeed done (§7a). **k6 Reel spike PASSED** 2026-10-11 from Grafana Cloud Mumbai: 66,825 requests, peak 300 req/s, **0 errors**, p95 17 ms, **100 % from Cloudflare**, server CPU flat. **k6 Server direct** 2026-10-11 (dev PC, `loadtest/origin.js`, 10→60 req/s uncached): 11,028 req, **0 errors**; comfortable up to ≈ 30–40 req/s; **after catalog caching (`4b1fbd2`) all thresholds pass up to 60 req/s** (median ≈ 0.4 s flat, p95 ≤ 1.6 s) vs ~5 req/s needed in a Reel (> 10× headroom). Still to do: WebPageTest, real-phone check |
| Stage 6: go-live (Razorpay **live** keys + announce) | 🟡 **Live payments working 2026-10-11**: real ₹99 purchase 14:50 IST (#30) → paid, downloaded, PDF on WhatsApp, webhook saved the phone. Refund that test payment in Razorpay. Not announced yet (Search Console, Instagram bio pending) |
| 5 books missing (#22, 28, 29, 31, 32) | ⬜ Waiting for PDFs from Ajay |
| Meta Pixel | ✅ **On since 2026-10-14** (`b9d351b`): pixel `1323976956324834`; checked live — PageView + ViewContent reach Meta from a book page. InitiateCheckout / Purchase not yet seen in Meta Test events (owner to check). Privacy policy §4 explains it |
| Meta Conversions API (server-side Purchase) | ✅ **Live 2026-10-16** (`ebc643f`, token in `/opt/kaf/app.env`). First real check: order #8 paid 3:37:16 pm → sent to Meta 3:37:17 pm (Meta OK; IP/UA cleared), WhatsApp + download OK. Every Buy since 12:12 saves `_fbp`/`_fbc` (all ad-click visitors) |
| Meta domain verification | ⬜ Optional, not blocking ads. Waiting for the client's `facebook-domain-verification=…` line (§11 item 8) |
| Admin cover uploads | ✅ 2026-10-14 (`8484f3f`): no more false "Saving failed"; non-3:4 covers padded to 3:4; reader shows cover first. #8, #12, #19 covers re-uploaded 5:23–5:24 pm → 800×1067 ✅ |
| Brand outro video (Reels) | ✅ 2026-10-16: 7 s 9:16 logo-build outro, `Desktop\kaf-videos\kaf-outro\renders\kaf-outro.mp4` — outside the repo, details §7d |
| Checkout drop-off (watch) | 🟡 16 Oct 12:12–2:23: 6 ad visitors (all with Meta ad-click id) opened Razorpay, 5 left at its mobile-number screen, 1 payment failed (reminder sent). Same pattern as the morning before any change — not a site bug; next sale at 3:37 went through fine. Watch the funnel (`funnel_daily`) |
| Ad link "30 s to open" (client, 16 Oct) | 🟡 Checked: the ad's page (`/combos/vivah-te-ghatasphot-margdarshika`) answers in 0.5–1 s from Cloudflare cache with `fbclid`, via http/www/IPv6 and Facebook/Instagram browsers. Cloudflare Web Analytics (24 h, 206 views): m.facebook.com visitors P75 2.6 s, that page P75 1.9 s, LCP P50 1.4 s / P75 2.3 s / P90 4.2 s / **P99 26.7 s** (≈ 1 in 100 on weak data). Facebook's link check + in-app browser start run *before* our page and aren't measured. Fix shipped: phones get the 600 px book cover instead of 800 px (112 → 75 KB) — `<picture>` + per-screen preloads. Client to test in Chrome / clear FB browser data / compare Landing page views vs Link clicks |
| Book page WhatsApp hint | ✅ 2026-10-14 (`5883955`): green line under both Buy buttons — "enter your WhatsApp number while paying" (Razorpay's own popup text can't be changed) |

Production database snapshot (2026-10-13 09:10 IST, read-only): **11 products** — 10 visible at ₹99 (9 original + **new #32 "ग्रामपंचायत: संपूर्ण माहिती"**, slug `book-32`, added by the owner 12 Oct: PDF + cover + 6 reader pages OK, but **no description, category "Other"**, empty `available_locales` (harmless — falls back to `language`)) + **#31 "test book" ₹1 now HIDDEN** ✅. Since live payments (11 Oct 14:30 IST): **20 orders — 8 paid (₹498, incl. the owner's test purchases; ₹0 refunded so far), 11 not paid (mostly the owner's cancelled tries), 1 failed**; 32 orders in total; 1 interested-buyer sign-up (`leads`); 0 contact messages.

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
  `private, no-store`. **Admin save / delete / show-hide of a book** (`revalidatePublic` in
  `src/app/dashboard/actions.ts`): `updateTag("products")` (catalog cache) → `revalidatePath` `/`, `/ebooks`,
  `/combos`, the book page, `/sitemap.xml` → Cloudflare purge (`src/lib/cdn.ts`): home by Cache-Tag `kaf-home`
  (both hosts), prefixes `/ebooks`, `/combos`, `/sitemap.xml` on **both** `kaydyachaanifayddyacha.com` and
  `www.` (www serves its own copies, no redirect). A new book's page has never been cached, so it renders fresh;
  new covers/previews get new file names. Result: a new or edited book is on home, /ebooks and /combos within
  seconds, on both hosts, and in the sitemap the same day. (Before 12 Oct: www lists up to 5 min old, sitemap up to
  1 day.)
  Every deploy purges only the **pages** from Cloudflare (`deploy/deploy.sh`; images and build files stay cached).
- **Two app copies = two caches (known, accepted 2026-10-14):** the ONE server runs the site twice (Docker containers
  `app1` + `app2`; Caddy alternates visitors between them) for zero-downtime deploys and crash safety. Each copy keeps
  its own page + catalog cache. An admin save clears only the copy that handled it, so a book page / the home page can
  show the old version for **~5–15 min** after a save (seen 14 Oct: #19's home card took > 14 min). It fixes itself.
  Owner is OK with this. If it becomes a problem: after a save, call an internal endpoint on both `http://app1:3000`
  and `http://app2:3000` (env var in `deploy/docker-compose.yml`) that runs `revalidateTag(CATALOG_TAG, { expire: 0 })`
  + `revalidatePath` for the public pages, *before* the Cloudflare purge (built and tested once, then removed on request).
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
6. **माझी पुस्तके** (`/my-books`) lists **paid** orders saved on that phone and can resend the PDF to WhatsApp.
   The phone saves an order (`kaf-orders`) *before* payment starts (so a closed browser can still find a paid
   one); since 2026-10-12 My Books asks `POST /api/orders/status` (each order's signed access token, max 30,
   `no-store`) and hides unpaid/cancelled/failed attempts. Shows "तपासत आहे…" while checking; if the check
   fails it falls back to the full list.
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

**Razorpay's popup (owner asked 14 Oct):** it asks "पुढे जाण्यासाठी मोबाईल नंबर टाका" and shows "यासह लॉगिन करा"
(Razorpay's Marathi for "Continue"; the OTP is only for Razorpay's saved UPI/cards, no account on our site). That text
is Razorpay's and **cannot be changed**, and the number step **must stay** (it is the WhatsApp delivery + reminder
number). Our answer: a green line under both Buy buttons, `whatsappHint` in `src/lib/product-copy.ts` (mr/hi/en, follows
the edition): "पेमेंट करताना तुमचा WhatsApp नंबर टाका — पुस्तक PDF त्याच नंबरवर WhatsApp ला येईल." Option not taken:
force Razorpay to English (`config.display.language`).

Deliberate difference from the original site: it asks for name + WhatsApp **before** paying. We don't.
All FAQ, how-to-buy, policy and order texts describe **our** flow.

---

## 6. Catalog and content

**10 live products** (2026-10-13), all ₹99 (MRP ₹198; #32 MRP ₹149). #31 "test book" (₹1) exists but is **hidden**. Combos are **one merged PDF** on the combo row (`combo_items`
stays empty on purpose).

| ID | Slug | Type | Lang | PDF | Reader pages |
|---|---|---|---|---|---|
| 32 | `book-32` (ग्रामपंचायत: संपूर्ण माहिती — added by the owner in the dashboard 12 Oct; Marathi-only title → fallback slug) | ebook | mr | ✅ (195 pages) | 6 |
| 30 | `rti-adhiniyam-2005-sampurna-guide` | ebook | hi | ✅ | 6 |
| 27 | `hindu-uttaradhikar-kanoon-guide` | ebook | hi | ✅ | 6 |
| 26 | `jamin-mojani-sampurna-margadarshak` | ebook | mr | ✅ (49.5 MB) | 6 |
| 25 | `patsanstha-fasavnuk-combo` | combo | mr | ✅ (33 MB) | 6 |
| 19 | `atrocity-kayada-combo` | ebook (slug says combo — keep it) | mr | ✅ | 6 |
| 16 | `rti-brahmastra-3in1` | combo | mr | ✅ | 6 |
| 12 | `ghar-ghenyaadhi-he-vachach` | combo | mr | ✅ | 6 |
| 8 | `vivah-te-ghatasphot-margdarshika` | combo | mr | ✅ | 6 |
| 4 | `malmatta-vatap-kayadeshir-hakka` | combo | mr | ✅ | 6 |

**Open question:** is our new #32 the original site's #32 "ग्रामपंचायत योद्धा"? If yes, point its old-URL redirect
(`legacyPendingBooks` in `next.config.js`, now → `/ebooks`) to `/ebooks/book-32` and move it to `legacyBooks`.
If the owner wants a readable slug instead of `book-32`, change it **before** sharing the link in a Reel (old links would 404).

**Missing (exist on the original, waiting for PDFs from Ajay):**
#31 वडिलोपार्जित जमीन… (**₹49** there), #29 हक्कसोडपत्र… , #28 ऊसाचा हिशोब… , #22 लग्न, फसवणूक + हुंडा
प्रतिबंध (combo). Their old URLs temporarily redirect to `/ebooks` / `/combos` (`next.config.js`).

**Adding or replacing a PDF:** put it in `content/ebooks/<id>-<slug>-<mr|hi|en>.pdf` (local only,
git-ignored). Match it to a product by page count and the original site's number. Then run
`npm run db:upload-pdfs -- --dry-run`, then `npm run db:upload-pdfs` (`--force` replaces,
`--previews-only` rebuilds preview PDFs). Then run `npm run db:reader-pages` for reader images.
Alternatively, upload in the dashboard (50 MB limit). The dashboard builds the reader images in the
browser on upload.

**Covers must be 3:4 (book shape).** Cards fill a 3:4 box and crop anything else. Since 2026-10-14 any upload that
isn't 3:4 (±3 %) is padded to 3:4 with its own edge colour (`src/lib/book-shape.ts`, used by `uploadCover` for covers
and preview images), and the dashboard warns when the picked picture isn't 3:4. Best result: upload a portrait image,
e.g. 1200×1600. Covers replaced on 14 Oct (owner): #8, #12, #19 (square originals → padded, 800×1067).

Storage: `pdfs` (private) `<slug>-<locale>-<ts>.pdf` · `covers` (public) `<slug>-<locale>-v<ts>-{200,400,600,800}.webp`,
`previews/<slug>-<locale>.pdf` (first 6 pages), reader-page WebPs (200/400/800/1600).

---

## 7. Deploy and operations

**How a deploy happens:** push to `main` → GitHub Actions **Deploy** builds one Docker image (tag = first
12 characters of the SHA, pushed to GHCR) → opens Lightsail port 22 for the runner's IP only → copies
`deploy/deploy.sh`, `docker-compose.yml` and `Caddyfile` to `/opt/kaf/` → `deploy.sh` restarts app1, waits
until it is healthy, then does the same for app2 (it rolls back the replaced container on failure) →
reloads Caddy → **purges the pages from Cloudflare** (home by its **Cache-Tag `kaf-home`** + 15 page prefixes on both hosts = 30
prefixes, Free plan's max per call; `/media/…` images and `/_next/static/…` are kept because their names change
with their content) → closes port 22 again. Zero downtime. **If you add a new public page, add it to `pages=` in
`deploy.sh`** (otherwise it refreshes within 5 min anyway). Until 2026-10-11 every deploy purged *everything*,
which left covers cold (1.1–1.6 s each) right after a deploy. Then it **warms** Cloudflare: requests `/`, `/ebooks`,
`/combos`, the book pages linked from them, every `/_next/static` CSS/JS file they use and the fonts inside the
CSS (≈ 24 requests, a few seconds). Each release has new build-file URLs (`?dpl=<sha>`), so without this the first
visitor per Cloudflare location waited 1–2 s for the CSS and font. **Smart Tiered Cache is ON** (owner, 11 Oct:
Caching → Tiered Cache; upper tiers BOM + SIN for our origin 13.206.92.130), so a location that lacks a file asks
Mumbai/Singapore before our server. The other origin listed there, 2.57.91.91, is the old Hostinger pointer —
not in use.
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
| 010 | Meta Conversions API: `orders.meta_fbp`, `meta_fbc`, `client_ip`, `client_user_agent` (saved at checkout, IP + browser cleared after sending), `meta_capi_sent_at` (sent once) — applied to Mumbai **2026-10-16** (psql via the session pooler) |

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

**Evening drop to 87 (11 Oct ~22:00) and why:** (1) each of the evening's deploys purged *all* of Cloudflare's
cache, so PageSpeed got cold covers (MISS, 1.1–1.6 s each, some timed out) — fixed: deploys now purge pages only
(§7); (2) the ₹1 **#31 test book** is the first home card and therefore the LCP image — owner to hide/delete it;
(3) PageSpeed varies ±5 points between runs, so judge on 2–3 runs. Re-run at 22:04 → **93** again (FCP 1.7 s,
LCP 3.0 s, SI 3.0 s, TBT 50 ms, CLS 0; server answer 10 ms).

**Run right after the deploy (22:15) → 90:** the HTML was a HIT (server 6 ms), but the new release's CSS
(1.2 s) and font (2.1 s) were cold at PageSpeed's Cloudflare location → white 5 of 8 frames, SI 4.5 s. Fixed by the
post-deploy warm-up + Smart Tiered Cache (§7). Checked right after the `d7518d0` deploy: the release's CSS and
`/ebooks` were already a HIT at Marseille (Airtel's location).

**Re-run 22:25 → 93** (FCP 1.7 s · LCP 3.1 s · SI **3.0 s** (was 4.5) · TBT **0 ms** · CLS 0; CSS **0.18 s** (was 1.2),
font **0.35 s** (was 2.1), white 3 of 8 filmstrip frames (was 5)). That run probably loaded just before
`d7518d0` went live (it referenced the previous release's files, which were cached by then), so the warm-up is
proven by the HIT check above, not by this run. What's left is the lab itself: ≈ 1.1 s white = the slow-4G phone
connecting; ≈ 1.2 s of LCP = the emulated slow CPU drawing the page. Nothing big left to gain in code.

**12 Oct morning runs 80 / 76:** network all warm (HTML 10 ms, CSS 0.2 s, font 0.4 s, cover 0.26 s, new
release's files) and *less* main-thread work (1.1 s vs 1.9 s) than the 93 runs — the lab's shared test machine
was slower (FCP 2.2 s, render delay 1.9 s). Lab score swings this much; judge on the median of 3 runs and,
after launch, on real-visitor data. To make slow CPUs matter less, the home page's below-the-fold sections
(combos row, How to buy, Benefits, Testimonials) and the **footer on every page** now use `.cv-auto`
(`src/app/page.tsx`, `Footer.tsx`), as on the book page. Checked at 375 px: all sections and the footer render
at full size and fade in when scrolled to.

**After the `.cv-auto` deploy (12 Oct 9:19) → 97** (FCP 1.7 s · LCP **2.4 s** · SI **2.5 s** · TBT 10 ms · CLS 0;
Style & Layout 226 ms vs 397–1,006 ms before; LCP render delay 0.31 s vs 1.2–2.0 s).

**Cloudflare purge by URL doesn't work for pages (found 12 Oct):** the API answers `success` but the page stays a
HIT (tested `/`, `/contact`, `/terms`; also with an `Accept-Encoding` header). Pages are stored compressed
(`Vary: …, Accept-Encoding`) and the URL purge misses those copies; images by URL purge fine. So after every
deploy the home page showed the *previous* release for up to 5 min (it then refreshes itself — s-maxage 300).
Fix: `next.config.js` sends `Cache-Tag: kaf-home` on `/` only (Cloudflare strips it from visitors); `deploy.sh`
and the admin's `purgePublicPages` (`src/lib/cdn.ts`) purge the home page **by tag**. Other pages keep using
prefix purge (works). **Never go back to URL purge for pages.**
Verified live on `5c25355`: home HIT → tag purge → **MISS**; the `Cache-Tag` header is not shown to visitors.
Home `.cv-auto` sections checked at 375 px (all render full size and fade in). Owner to run PageSpeed 2 more
times for a 3-run median (PSI runs started from Claude's hidden browser pane stall on "Running analysis").

**Why lab scores jump between ~80 and ~95 (found 12 Oct, from the PSI reports' hidden "observed" timings):**
| Run | Page loaded | First paint | Score |
|---|---|---|---|
| 97 (9:19) | 1.12 s | **0.79 s** (before our scripts ran) | 97 |
| 90 (13:40, slowest test machine, benchmark 443) | 1.17 s | **0.85 s** | 90 |
| 81 (13:18) | 0.53 s | **2.36 s** (after them) | 81 |
When everything arrives fast, the scripts run *before* the first paint; on a first visit they open the language
picker — a full-screen layer with `backdrop-blur` — and that first frame took ~1.8 s on the GPU-less test phone
(local trace: main thread idle, GPU thread busy). **3-run median after `.cv-auto`: 97 / 81 / 90 → 90.**
Fix (owner OK, picker stays): `LanguageProvider` opens the picker two animation frames after the first-visit
check, i.e. after the page has been drawn (≈ 1/30 s later — not noticeable; in the slow case page *and* picker now
appear earlier); the picker backdrop is a solid `bg-brand-teal/75` tint instead of `backdrop-blur-sm`. Returning
visitors are unchanged (their saved language applies as before, no picker). Checked at 375 px: picker opens on a
first visit, choosing English closes it, unlocks scrolling and survives a reload. Tested and **not** the cause:
the other ~10 blur effects on the first screen (removing all of them ≈ 0.2 s locally, within noise).
**Rule:** don't put `backdrop-blur` on full-screen layers that can appear at load.
Live on `b396683` (12 Oct): home, `/ebooks`, `/about` all serve the new release. Note: `/api/health` turns new as
soon as app1 is updated — the Cloudflare clear + warm-up run a little later, so check pages a minute after.
**Next:** owner runs PageSpeed 3 more times; expected to stay in the 90s (no more ~80 runs).

**"White screen for the first ~1 s" (owner question):** the filmstrip is white for its first 3 of 8 frames
(≈ 1.1 s) — that is the emulated slow-4G phone connecting and downloading the HTML + 17 KB CSS; the page's HTML
already contains all content, so it draws in one go when it lands. A **splash screen would not help** (it is
part of the same HTML, so it appears at the same moment). Google's "good" FCP is ≤ 1.8 s; we are at 1.7 s on
the slowest lab profile, and real 4G/Wi-Fi is much faster. Inline CSS was already tried (no gain). Only small
optional idea left: Cloudflare **Early Hints** (Speed → Optimization, free) — maybe 0.1–0.2 s, not enabled yet.

**How to measure again:** pagespeed.web.dev (mobile) on `/` and a book page. For experiments, Lighthouse
13.5 + Puppeteer with devtools throttling (4× CPU, 150 ms / 1.6 Mbps) — note that on the Windows dev PC
text layout is slowed by Windows loading system font files, so local numbers look worse than Android.
**Rules:** don't re-add font preloads or a Devanagari web font, keep the cover `fetchpriority=high` +
eager on the first carousel/book cover, and keep list pages free of `useSearchParams`.

## 7b. Commands cheat sheet — server, Cloudflare, database, local (2026-10-13)

Everything an agent or developer needs to operate the store. Secrets are never typed into chat or docs:
commands read them from files (`.env.mumbai`, `.env.local`, `/opt/kaf/app.env`).

### Getting onto the server
- **Browser SSH (always works):** AWS Lightsail console → instance **`kaf-a`** → *Connect using SSH*.
- **Laptop SSH** only if Lightsail → kaf-a → Networking → port 22 allows the current home IP (it changes):
  `ssh -i C:\Users\shivr\kaf-keys\kaf-key.pem ubuntu@13.206.92.130` (static IP `kaf-a-ip`).
- Deploys don't need either: GitHub Actions opens port 22 for its own IP, deploys, closes it again.
- Everything lives in **`/opt/kaf/`**: `app.env` (runtime secrets, chmod 600), `docker-compose.yml`, `Caddyfile`,
  `deploy.sh` (all three copied from `deploy/` on every deploy), `certs/` (Cloudflare Origin cert),
  `.current-image` (image now live), `app.env.test-keys-backup` (Razorpay test keys).

### On the server (`cd /opt/kaf` first)
| Task | Command |
|---|---|
| Container status + health | `docker compose ps` |
| Live logs | `docker compose logs -f --tail=200 app1 app2` |
| One topic in the last hour | `docker compose logs --since 1h app1 app2 \| grep '\[webhook\]'` (tags: `[checkout] [confirm] [webhook] [download] [reconcile] [reminders] [interakt] [cdn] [orders]`) |
| Health from inside | `docker compose exec -T app1 node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"` |
| CPU / memory / disk | `docker stats --no-stream` · `free -h` · `df -h` |
| **After editing `app.env`** (e.g. reminder delays, Interakt template) | `nano app.env` (add `sudo` if denied), then `IMAGE=$(cat .current-image) bash deploy.sh` — recreates app1 then app2 with the new values, zero downtime, then clears + warms Cloudflare |
| Roll back to an older release | `IMAGE=ghcr.io/3n881/kaidaanifiads:<12-char sha> bash deploy.sh` (sha = a commit from `git log`; images are in GHCR) |
| Back to Razorpay test keys (emergency) | `cp app.env.test-keys-backup app.env && IMAGE=$(cat .current-image) bash deploy.sh` |

`deploy.sh` order: pull → recreate app1 → wait healthy → app2 → wait healthy (rolls back on failure) → reload
Caddy → write `.current-image` → Cloudflare page purge → warm-up → prune old images.

### From the laptop (no SSH needed)
| Task | Command |
|---|---|
| Which commit is live | `curl -s https://kaydyachaanifayddyacha.com/api/health` (turns new as soon as **app1** is updated; the Cloudflare clear + warm-up finish ~1 min later) |
| Which release a page shows | `curl -s https://kaydyachaanifayddyacha.com/ \| grep -o 'dpl=[0-9a-f]*' \| sort -u` |
| Is a page/file cached | `curl -sI https://kaydyachaanifayddyacha.com/ebooks \| grep -i cf-cache-status` (HIT / MISS / EXPIRED / DYNAMIC = never cached) |
| Watch a deploy | GitHub → Actions → **Deploy**. Pushes that only touch `docs/**`, `**/*.md`, `loadtest/**` do **not** deploy |
| Run the cron by hand | `curl -X POST https://kaydyachaanifayddyacha.com/api/cron/reconcile -H "Authorization: Bearer <CRON_SECRET from kaf-keys/app.env>"` — ⚠️ real: reconciles with Razorpay and **sends due WhatsApp reminders** |

### Cloudflare cache purge (token + zone in `.env.mumbai`)
```bash
z=$(grep -m1 '^CLOUDFLARE_ZONE_ID=' .env.mumbai | cut -d= -f2- | tr -d "\"'\r")
t=$(grep -m1 '^CLOUDFLARE_API_TOKEN=' .env.mumbai | cut -d= -f2- | tr -d "\"'\r")
api() { curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$z/purge_cache" \
  -H "Authorization: Bearer $t" -H "Content-Type: application/json" --data "$1"; }
api '{"tags":["kaf-home"]}'                                   # home page, both hosts
api '{"prefixes":["kaydyachaanifayddyacha.com/ebooks","www.kaydyachaanifayddyacha.com/ebooks"]}'  # a page + everything under it (max 30 per call)
api '{"files":["https://kaydyachaanifayddyacha.com/media/<file>.webp"]}'  # single IMAGE/PDF only
```
- **Never purge a page by URL** (`files`): Cloudflare says success but keeps the compressed copy (tested 12 Oct).
- **Avoid `purge_everything`**: it empties the image cache and the first visitors (and PageSpeed) get slow covers.
- `CLOUDFLARE_RULES_TOKEN` can edit cache/WAF rules (not Transform Rules, not DNS); the purge token can only purge.
- Settings changed by hand in the dashboard (record them here): Transform Rule `strip-tracking-query`,
  Smart Tiered Cache on, Web Analytics on, Rocket Loader / Email obfuscation / Bot Fight Mode off, Early Hints off.

### Database (production = Mumbai `ntqwvfksdqdyoyknkprh`)
- **Read-only checks:** a small Node script with GET requests only to `${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/…`
  (service key from `.env.local`), run as `node --env-file=.env.local <script>.mjs`; keep scripts outside the repo
  (scratchpad) and mask phone numbers in output.
- **SQL / migrations:** Supabase dashboard → SQL editor, or `psql` with the session-pooler URL `NEW_DB_URL` from
  `.env.mumbai` (put it in a temp file, delete after). Migrations 001–010 are applied (§7). New ones go in
  `supabase/migrations/0NN_name.sql` and are applied by hand — the app never runs migrations.
- `select * from funnel_daily;` = daily visits → checkouts → paid.
- ⚠️ `.env.local` points at **production**. Every `npm run db:*` script writes live data: use `--dry-run` first.

### Local development (Windows PC)
| Task | Command |
|---|---|
| Dev server | `npm run dev:webpack` (Claude preview config `kaida-dev-webpack`, port 3000; Turbopack is blocked by Windows Application Control) |
| Production build / start | `npx next build --webpack` · `npx next start -p 3100` (`kaida-prod`) |
| Checks before pushing | `npx tsc --noEmit` · `npx eslint <changed files>` |
| Catalog / PDFs | `npm run db:upload-pdfs -- --dry-run` → `npm run db:upload-pdfs` · `npm run db:reader-pages` · `npm run db:cover-600` (§6) |
| Load tests (production-safe ones only) | §10 → `loadtest/landing.js`, `loadtest/origin.js` via Docker `grafana/k6:0.54.0` |

### Measuring speed
- pagespeed.web.dev, mobile, **3 runs → use the median** (single runs swing ~80–97).
- The report page hides the *measured* timings: in the browser console of a report,
  `document.documentElement.innerHTML.match(/observed(FirstContentfulPaint|LargestContentfulPaint|DomContentLoaded|Load)\\":\d+/g)`
  — if first paint comes *after* load, something at hydration delayed it (that is how the picker-blur issue was found).
- The keyless PageSpeed API (`googleapis.com/pagespeedonline/v5`) hits its daily quota quickly; use the website.
- Local Lighthouse/Puppeteer numbers on this Windows PC are slower than real Android (Windows font loading).

## 7c. Production settings register — every setting we changed, where it lives (2026-10-16)

One list of **every outside setting** the live store depends on: what it is, where to find it, its state and when it
was set. Values of secrets are never written here — only where they are kept. **When you change any setting in
production, add or update its row here in the same session.** ✅ = set and confirmed · ⏳ = to do / not confirmed.

### Domain, DNS and Cloudflare (dash.cloudflare.com → zone `kaydyachaanifayddyacha.com`)
| Setting | Where | State | When |
|---|---|---|---|
| Domain `kaydyachaanifayddyacha.com` (note `fay`**`dd`**`yach`**`a`**) | Hostinger hPanel → Domains | ✅ registered; nameservers → Cloudflare | 10-03 |
| Plan | Cloudflare | ✅ Free | 10-04 |
| DNS `A @ → 13.206.92.130` + `CNAME www → apex`, both **Proxied** | Cloudflare → DNS | ✅ | 10-10 |
| DNS TXT `facebook-domain-verification=…` | Cloudflare → DNS (TXT, `@`) | ⏳ waiting for the line from the client (§11 item 8) | — |
| SSL Full (strict), Always HTTPS, min TLS 1.2, TLS 1.3 on, 0-RTT off, HTTP/3 on | SSL/TLS + Network | ✅ | 10-04 |
| Origin certificate (apex + `*.`), valid to 2041 | SSL/TLS → Origin Server; files `origin.pem`/`origin.key` in `kaf-keys\` and `/opt/kaf/certs/` | ✅ | 10-04 |
| Cache rules `bypass-dynamic`, `static-immutable`, `next-image`, `media`, `public-assets`, `public-html` | Caching → Cache Rules (made via API, token `CLOUDFLARE_RULES_TOKEN`) | ✅ | 10-10 |
| WAF `allow-razorpay-webhook` (skip) + `block-bad-methods` (block) | Security → WAF → Custom rules | ✅ | 10-10 |
| Rate limit `checkout-rate-limit`: 30 POST / 10 s per IP → block 10 s | Security → WAF → Rate limiting | ✅ | 10-10 |
| Transform Rule `strip-tracking-query` (drop `?igsh=`/`fbclid`/`utm_*` on `/`, `/ebooks*`, `/combos*` unless `_rsc=`) | Rules → Transform Rules (owner, by hand) | ✅ — **never strip `_rsc`** | 10-11 |
| Smart Tiered Cache (upper tiers BOM + SIN) | Caching → Tiered Cache (owner, by hand) | ✅ on | 10-11 |
| Web Analytics | Analytics (owner decision) | ✅ on | 10-11 |
| Rocket Loader / Email obfuscation / Bot Fight Mode / Early Hints | Speed / Scrape Shield / Security → Bots | ✅ all **off** | 10-10/11 |
| API tokens: Cache Purge (`CLOUDFLARE_API_TOKEN`), rules editor (`CLOUDFLARE_RULES_TOKEN`) + Zone ID | My Profile → API Tokens; values in `.env.mumbai` (purge token + zone also in `/opt/kaf/app.env`) | ✅ | 10-04 / 10-10 |

### Server (AWS Lightsail, Mumbai)
| Setting | Where | State | When |
|---|---|---|---|
| Instance `kaf-a`, $12 plan (2 GB / 2 vCPU), Ubuntu 24.04, `ap-south-1a`, automatic snapshots | Lightsail console | ✅ | 10-10 |
| Static IP `kaf-a-ip` = `13.206.92.130` | Lightsail → Networking | ✅ | 10-10 |
| Firewall: 80/443 from Cloudflare only; 22 from admin IP + Lightsail browser SSH; GitHub deploy opens 22 for its own IP only while deploying | Lightsail → kaf-a → Networking | ✅ (home IP changed since → laptop SSH blocked; use browser SSH or update the rule) | 10-10 |
| IAM user `github-deploy` (may only edit Lightsail port rules) | AWS IAM; keys in GitHub Secrets | ✅ | 10-10 |
| `/opt/kaf/app.env` (runtime secrets, chmod 600) — local copy `C:\Users\shivr\kaf-keys\app.env` | Server | ✅ see §9 + the env table below | 10-10 → 10-11 |
| `/opt/kaf/app.env.test-keys-backup` (Razorpay **test** keys, emergency rollback) | Server | ✅ | 10-11 |
| Two app containers `app1` + `app2` behind Caddy (`deploy/docker-compose.yml`, `deploy/Caddyfile`) | Server `/opt/kaf/`, copied from `deploy/` on every deploy | ✅ | 10-10 |
| Lightsail metric alarms (CPU > 70 %, status check) | Lightsail → Metrics | ⏳ not set | — |

**Runtime settings in `/opt/kaf/app.env`** (names; values only on the server + `kaf-keys\app.env`):
| Name | State |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Mumbai project |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | ✅ **LIVE** since 10-11 — on the server only. ⚠️ The laptop copy `kaf-keys\app.env` still has the **test** keys (checked 10-16), so scripts on the PC can't read live payments; use the Razorpay dashboard (or the admin order page's "Check with Razorpay") for payment/failure details |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ = secret of **our** live webhook (also in `kaf-keys\razorpay-live-webhook-secret.txt`) |
| `ORDER_ACCESS_SECRET` | ✅ generated 10-10 — **never change** (breaks every buyer's link) |
| `CRON_SECRET` | ✅ (same as in cron-job.org header) |
| `ADMIN_EMAILS` | ✅ (dashboard login; empty = nobody) |
| `CHECKOUT_DEMO_MODE` | ✅ `false` |
| `DOWNLOAD_LIMIT` / `WHATSAPP_SEND_LIMIT` | ✅ 30 / 3 (defaults) |
| `INTERAKT_API_KEY`, `AUTO_WHATSAPP_ON_PAYMENT=true` | ✅ |
| `INTERAKT_TEMPLATE_*_MR` / `_HI` (`payment_sucess_pdf_v2`, language `mr`, header `document`, body `product`) | ✅ |
| `INTERAKT_REMINDER_TEMPLATE_NAME=pending_followup_v2`, `_LANGUAGE=mr` | ✅ |
| `PAYMENT_REMINDER_DELAY_MINUTES=10`, `PAYMENT_FAILED_REMINDER_DELAY_MINUTES=10` | ✅ owner set 10-11 (code defaults 30 / 10) |
| `INTERAKT_LEAD_TEMPLATE_NAME` (+ `_LANGUAGE`) | ⏳ empty = interested-buyer follow-up **off** until a marketing template is approved |
| `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | ✅ (purge on admin save + after deploys) |
| `META_CAPI_ACCESS_TOKEN` | ✅ added by the owner **10-16 ~11:48** (copy in `C:\Users\shivr\kaf-keys\meta-capi-token.txt`); verified with a real sale 3:37 pm. Empty = CAPI off |
| `META_CAPI_TEST_EVENT_CODE` | Only while testing (events go to Test events only, real sales not counted) — **must be removed** after the test |
| `META_PIXEL_ID` | optional; empty = first of `NEXT_PUBLIC_META_PIXEL_IDS` (`1323976956324834`) |
After editing `app.env`: `cd /opt/kaf && IMAGE=$(cat .current-image) bash deploy.sh` (zero downtime, §7b).

### GitHub (`3n881/kaidaanifiads` → Settings → Secrets and variables → Actions)
| Setting | Where | State | When |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Mumbai) | **Variables** tab | ✅ | 10-10 |
| `NEXT_PUBLIC_SITE_URL=https://kaydyachaanifayddyacha.com` | Variables | ✅ | 10-10 |
| `NEXT_PUBLIC_MEDIA_PROXY=true` | Variables | ✅ | 10-10 |
| `NEXT_PUBLIC_META_PIXEL_IDS=1323976956324834` | Variables | ✅ owner set; live in `b9d351b` | **10-14** |
| `DEPLOY_ENABLED=true`, `DEPLOY_HOSTS` (the server's static IP), `DEPLOY_LIGHTSAIL_INSTANCE=kaf-a` | Variables | ✅ (deploys work) | 10-10 |
| `DEPLOY_SSH_KEY`, `AWS_DEPLOY_ACCESS_KEY_ID`, `AWS_DEPLOY_SECRET_ACCESS_KEY` | **Secrets** tab | ✅ | 10-10 |
| `RECONCILE_ENABLED` | Variables | ✅ deliberately **unset** (cron-job.org runs the cron) | 10-04 |
`NEXT_PUBLIC_*` are baked in at build time: change one → push or re-run **Deploy**. Docs-only pushes don't deploy.

### Supabase (production project `ntqwvfksdqdyoyknkprh`, Mumbai, Pro)
| Setting | Where | State | When |
|---|---|---|---|
| Schema + migrations 001–010 | SQL editor / pooler (`NEW_DB_URL` in `.env.mumbai`) | ✅ (§7 table) | 10-04 → **10-16** (010) |
| Storage buckets `pdfs` (private), `covers` (public) | Storage | ✅ | 10-04 |
| Admin users (same e-mails as `ADMIN_EMAILS`) | Authentication → Users | ✅ | 10-04 |
| **Auth → URL Configuration**: Site URL `https://kaydyachaanifayddyacha.com`; redirect URLs apex/**, www/** | Authentication → URL Configuration | ⏳ **never confirmed** (§11 item 2) | — |
| Old Tokyo project `yjsmebmytltwwihvivbd` (Replov only) | Supabase | ⏳ pause → delete ~1 week after launch | — |

### Razorpay (client's account, shared with the original site — never touch the original's webhook/keys)
| Setting | Where | State | When |
|---|---|---|---|
| Live keys on our server | `/opt/kaf/app.env` | ✅ | 10-11 |
| **Our** live webhook `https://kaydyachaanifayddyacha.com/api/razorpay/webhook`, events `payment.captured`, `order.paid`, `payment.failed` | Razorpay → Live → Webhooks | ✅ | 10-11 |
| Same webhook: also tick `refund.created` + `refund.processed` | same | ⏳ owner to do (refund tracking) | — |
| Test-mode webhook to our domain | Razorpay → Test → Webhooks | ✅ (harmless; delete with Replov's after launch) | 10-10 |
| Auto-capture ON | Account & Settings → Payment capture | ✅ (payments are captured) | — |
| Website `kaydyachaanifayddyacha.com` in Website/app details | Account & Settings | ⏳ not confirmed | — |
| Was the live key regenerated? (if yes, the original site's Vercel needs the new secret) | ask owner | ⏳ not confirmed | — |
| Popup text ("मोबाईल नंबर टाका", "यासह लॉगिन करा") | Razorpay's own — **not editable**; our hint line explains it (§5) | — | 10-14 |

### WhatsApp (Interakt, client's account; sender "AS Consultancy Services")
| Setting | Where | State | When |
|---|---|---|---|
| Template `payment_sucess_pdf_v2` (sic), Document header = PDF, `{{1}}` book | Interakt → Templates | ✅ approved, used | 10-01 |
| Template `pending_followup_v2` (`{{1}}` name, `{{2}}` book, `{{3}}` link) | Interakt → Templates | ✅ approved, used | 10-01 |
| Hindi versions of both | Interakt | ⏳ optional (then `*_LANGUAGE_HI=hi`) | — |
| Marketing template for interested buyers (`{{1}}` book, `{{2}}` link) | Interakt | ⏳ owner to get approved → `INTERAKT_LEAD_TEMPLATE_NAME` | — |

### Meta (client's Business account)
| Setting | Where | State | When |
|---|---|---|---|
| Pixel `1323976956324834` (one of the original site's 5 → both sites report into it) | Events Manager → Data sources | ✅ on our site; PageView + ViewContent verified live | **10-14** |
| Privacy policy section 4 "Cookies and Ad Measurement (Meta Pixel)" | `src/app/privacy-policy/page.tsx` | ✅ live | 10-14 |
| Test events check (InitiateCheckout on Buy, Purchase after paying) | Events Manager → pixel → Test events | ⏳ owner | — |
| **Conversions API token** | Events Manager → pixel → Settings → Conversions API → *Generate access token* (client) → save to `C:\Users\shivr\kaf-keys\meta-capi-token.txt` (**never in chat**) → server `app.env` | ✅ received + saved 10-16; on the server (`app.env`). **No domain verification needed** | 10-16 |
| Domain verification | Business Settings → Brand safety and suitability → Domains → Add → "Update DNS TXT record" → client sends the line → we add TXT in Cloudflare → client clicks Verify | ⏳ asked 10-15; optional, not blocking ads | — |
| Server-side Purchase (CAPI) code | `src/lib/meta-capi.ts` + checkout signals + migration 010 (§11 item 8) | ✅ live `ebc643f`; first real send order #8, 3:37 pm | 10-16 |

### Monitoring, cron and other services
| Setting | Where | State | When |
|---|---|---|---|
| cron-job.org: `POST /api/cron/reconcile` every 10 min, header `Authorization: Bearer <CRON_SECRET>` | cron-job.org → job (History should show 200) | ✅ | 10-10 |
| UptimeRobot HTTPS monitor `/api/health` every 5 min | uptimerobot.com | ✅ | 10-10 |
| GitHub container registry image `ghcr.io/3n881/kaidaanifiads:<sha>`; server pulls with a `read:packages` token | GitHub → Packages; `docker login` on the server | ✅ | 10-10 |
| Google Search Console (domain + `/sitemap.xml`) | search.google.com/search-console | ⏳ not done (launch step) | — |
| Instagram bio / Reel links → new domain | Instagram | ⏳ not done (launch step) | — |
| Support e-mail on the new domain (current address has no mail server) | Hostinger mail or Cloudflare Email Routing | ⏳ open question | — |
| Replov test deployment + its Razorpay test webhook | Replov | ⏳ delete ~1 week after launch | — |

## 7d. Marketing assets — brand outro video (2026-10-16)

A 7-second **9:16 brand outro** for the end of Instagram Reels / Shorts / Stories, made with **HyperFrames**
(HTML + GSAP rendered to video). **Not part of the website repo and not in git** — it lives on the dev PC
(OneDrive Desktop): `C:\Users\shivr\OneDrive\Desktop\kaf-videos\kaf-outro\`.

| What | Where / value |
|---|---|
| Final video | `kaf-outro\renders\kaf-outro.mp4` — 1080×1920, 30 fps, H.264, **7.0 s**, 3.0 MB, **no audio** (the Reel's music plays over it) |
| Entry file | `index.html` (root, 1080×1920, `data-duration="7"`) mounts `compositions/outro.html` (the whole scene, inside a `<template>`) |
| Brand assets | `assets/brand/emblem.png` (= website `public/icon-512.png`); layers made from it: `badge.png`, `scales.png`, `hand-left.png`, `hand-right.png`; font `assets/fonts/NotoSansDevanagari.woff2` (the website's old Devanagari font, from git history); URL text uses the bundled Montserrat |
| Layer script | `tools/split-emblem.cjs` — splits the emblem by colour + connected regions (navy pans/sleeves/hands, gold beam) into transparent layers and fills the empty badge (row-matched white, soft blur). Re-run `node tools/split-emblem.cjs` only if the logo changes |
| Plan | `shot-plan.json` (category `logo-reveal`, palette = site tokens navy `#0A2342` / gold `#FFD301`) |
| Unused | `compositions/logo-outro.html` = the original 16:9 registry block it was adapted from (not mounted) |

**What happens (timeline):** 0.25 s empty white badge spins in → 0.75 s the scales (तराजू) drop in and rock until
level ("weights match") → 1.05 s the two hands slide in from the disc edges (clipped to the disc) → 1.85 s two
handshake shakes → 2.5 s the finished seal pops, gold ring draws, glow blooms → 2.7–3.45 s कायद्याचं · आणि ·
फायद्याचं word by word + gold underline → 4.0 s "सोप्या भाषेत कायदे" → 4.25 s top label "मराठी · हिंदी · PDF ई-बुक्स"
→ 4.6 s website pill `kaydyachaanifayddyacha.com` rises, 5.4 s shine passes → hold with a gentle breathing glow to 7 s.
**Layout rule:** everything sits inside the Reels safe area (top ≈ 250 px and bottom ≈ 380 px kept clear of
Instagram's header, caption and buttons).

**Edit / re-render** (Windows, from the `kaf-outro` folder; needs Node, FFmpeg, Chrome — all installed):
```bash
npx hyperframes preview --background      # Studio at http://localhost:3002 (live reload)
npx hyperframes lint . && npx hyperframes check .
npx hyperframes snapshot . --at 1,2,6.9   # proof frames → .hyperframes/artifacts/snapshots/
npx hyperframes render . --skill=motion-graphics -q high -o ./renders/kaf-outro.mp4   # ≈ 40 s
```
Lessons: don't animate `letterSpacing` (stutters; lint error); in a sub-composition never add a `#root *` reset
(it overrode the scene's own padding/margins); text changes = edit `compositions/outro.html`; low free RAM on
this PC — close apps before rendering. Ideas not done: Instagram handle / "Follow" line, background music,
alternative tagline.

---

## 8. Code map (checked 2026-10-10; routes and caching updated 2026-10-13)

### Public pages (`src/app`)
| Route | Rendering | Notes |
|---|---|---|
| `/` | ISR 300 s | Hero → bestsellers row (auto-advancing `Carousel`/`ProductRow`) → combos row → HowToBuy → Benefits → Testimonials |
| `/ebooks/(list)`, `/combos/(list)` | ISR 300 s | `Catalog`: language tabs (3+ languages, else chips), **Book ID** search (overrides other filters), category chips, text search, sort. `loading.tsx` lives in the `(list)` group on purpose |
| `/ebooks/[slug]`, `/combos/[slug]` | SSG + ISR 300 s | `ProductDetail` + `ProductGallery` (cover + reader pages 2–6) + `SampleReader` pop-up + `StickyBuyBar`. Unknown slug → real 404 |
| `/order/[orderId]` | dynamic, noindex, no-referrer | Token check → "ही लिंक अपूर्ण आहे" if bad; DB down → "system busy" auto-refresh; `created` → inline Razorpay reconcile; paid → auto-download once (sessionStorage `kaf-dl-<id>`), `DownloadWhere`, `InAppBrowserHint`, WhatsApp popup fallback. UI language from cookie `kaf_locale` |
| `/my-books` | client list from localStorage `kaf-orders`, filtered to **paid** via `POST /api/orders/status` (`src/app/api/orders/status/route.ts`: paid / pending (<30 min) / unpaid) | Server action `sendMyBooks` sends up to 10 paid orders to a typed WhatsApp number; same reply either way (no enumeration). Combos upsell row |
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
| `api/orders/status` | My Books: POST up to 30 `{orderId, token}` → `paid` / `pending` (unpaid < 30 min) / `unpaid`; tokens verified (HMAC), `no-store` (2026-10-12) |
| `api/leads` | Didn't-pay WhatsApp sign-up (consent required, honeypot, 5/hour per IP hash) → `leads` |
| `api/auth/login` | Admin password login (checks `ADMIN_EMAILS`) |
| `api/auth/magic-link`, `auth/callback` | **Unused** by the UI (login page is password-only) |
| `api/health` | `{"ok":true,"deployment":"<sha>"}`, no DB |
| `media/[...path]` | Proxies the public `covers` bucket (whitelisted names): images 1 year immutable, `previews/*` 1 h at the edge |

### Dashboard (`/dashboard`, all dynamic; `src/proxy.ts` guards it, fails closed if `ADMIN_EMAILS` empty)
**Overview = sales dashboard** (2026-10-11, `src/lib/sales.ts` + `components/admin/SalesOverviewView.tsx`): revenue / paid / conversion / failed for today (IST), 7 days, all time — counted from `SALES_START` (live keys, 11 Oct 14:30 IST; test orders excluded; refunds not tracked yet); needs-attention lists (paid > 15 min not downloaded, paid without WhatsApp, unhandled contact messages) with wa.me links; top books 7 days; latest 10 paid orders; one small Setup card (business details still missing). The old setup checklist lives on Launch. Period cards and attention titles link into Orders. **Orders page** (2026-10-11): Today/7 days/All tabs, clickable cards that filter (Paid ₹, Not paid, Failed, Paid-not-downloaded), search (phone — last 10 digits, `pay_…`, order id), book name + language + IST time + wa.me link + downloads + WhatsApp count + Resend; cards on phones, table on desktop; test orders hidden unless `?test=1`; latest 200 matches. **Uploads >10 MB** need `experimental.proxyClientMaxBodySize` (set to 95mb) because `/dashboard` goes through `proxy.ts`. No cover uploaded → the PDF's first page (reader page 1) becomes the cover. **Saving a product** (2026-10-14): a good save redirects back with `?saved=1` and the form resets; "Not saved: …" now appears only for a real refusal (before, *every* good save showed "Not saved: Saving failed" because the redirect was caught as an error). Non-3:4 covers are padded (§6). **Refunds** (2026-10-11): webhook handles `refund.created` / `refund.processed` (add those events to the live Razorpay webhook); order stays `paid`, revenue = amount − refunded_amount everywhere; Refunded card/filter on Orders; downloads are not revoked by a refund. **Order detail page** `/dashboard/orders/[id]`: summary, timeline, buyer (wa.me), Razorpay ids (payment links to the Razorpay dashboard), actions: Check with Razorpay (`src/lib/refunds.ts` — marks captured-but-unpaid orders paid and pulls refund state; use it for refunds made before the webhook events were added), Resend WhatsApp, Copy buyer's order link · **Products** (per-edition editor `ProductForm`: text, cover, up to 5
**Interested buyers** `/dashboard/leads` (2026-10-11, `getLeadsView` in `src/lib/sales.ts`): cards (interested, bought later + %, follow-ups sent, opted out), one card per sign-up (wa.me link, book, date, language, Cancelled/Payment failed chip, Bought later, Follow-up sent, Opted out) and **Remove** (`optOutLead` → `opted_out_at`). Admin menu has 7 items (phones: 4 + 3). Server actions on admin pages recover from deploys (`src/lib/stale-action.ts`, `app/dashboard/error.tsx`).
preview images, PDF View/Replace/Remove; choosing a PDF renders 6 reader pages **in the browser** with PDF.js
and uploads them on save) · `products/new` · `products/[id]/pdf` (admin 5-min signed URL) · **Orders** (last 200,
Resend WhatsApp bypassing the cap) · **Messages** (contact inbox, mark done) · Setup / Content / Integrations /
Launch (onboarding checklists in `store_settings`; secret-looking keys rejected).
Note: `store_settings.content` (hero text, testimonials, socials) is **not read by the public site**. Hero and
testimonials are hard-coded in components.

### Libraries (`src/lib`)
`products.ts` (catalog reads: `unstable_cache` 5 min, tag `products` (`CATALOG_TAG`), + React `cache()`) · `catalog.ts` (`editionLocaleFor`, `localizeProduct`, sort/categories) ·
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
- **Catalog cache:** any new code that changes `products` from the app must call `updateTag(CATALOG_TAG)`
  (or reuse `revalidatePublic()` in `src/app/dashboard/actions.ts`), otherwise the header search, order page and
  dashboard can show old book data for up to 5 min. Don't remove the cache: without it every per-request page
  queries Supabase (k6 Server direct: p95 2–4 s at 50–60 req/s vs ≤ 1.6 s with it).
- **Cloudflare cache rules of thumb (2026-10-12):** pages are purged by **prefix** or the home **Cache-Tag
  `kaf-home`**, never by URL; images/PDFs by URL are fine. A **new public page** must be added to `pages=` in
  `deploy/deploy.sh` (purge list) and, if the admin changes it, to `revalidatePublic()` / `purgePublicPages`.
  Don't put `backdrop-blur` on a full-screen layer that can show at load (it held first paint ~1.8 s on
  PageSpeed's GPU-less phone). Below-the-fold sections get `.cv-auto`.
- **Load tests:** `loadtest/landing.js` (Reel spike) and `loadtest/origin.js` (Server direct) are safe on
  production; `checkout.js` / `download.js` are not (live payments). Docker: `MSYS_NO_PATHCONV=1 docker run --rm
  -v "$(pwd -W):/scripts" grafana/k6:0.54.0 run -e BASE=https://kaydyachaanifayddyacha.com /scripts/origin.js`.
- **Don't add `loading.tsx` under `ebooks/` or `combos/`.** List-page skeletons live in the `(list)` route
  groups. A skeleton on book pages makes unknown slugs return 200 instead of 404.
- Bash heredocs containing Devanagari broke several times. Write scripts to a file, or use the Edit tool.
- Fonts: only **Geist** (English, Latin letters only via `unicode-range`) is a web font, self-hosted in
  `src/app/fonts/`, **not preloaded**. Marathi/Hindi use the device's Devanagari font (as on the original
  site). Don't re-add font preloads or a Devanagari web font without measuring: Chrome holds the first
  paint for preloaded fonts (book page first paint 5.9 s → ~1.5 s when removed, 2026-10-11). Don't go back
  to `next/font/google` (flaky build-time download, go-live problem 18).
- Images: covers / preview / reader pages have 200/400/600/800 px WebP (+1600 for reader pages). New
  uploads make all sizes; `npm run db:cover-600` backfilled 600 px for older images. Only reader pages
  (`-p<n>-800.webp`) have a 1600 px copy — never derive `-1600` from a cover URL (404).
- **Server actions called by hand** (`startTransition(async () => { await action() })`, e.g. `ProductForm`): in Next 16
  an action that ends in `redirect()` *rejects* its promise with the redirect signal. Any client `catch` around it must
  call `unstable_rethrow(error)` first, or every successful save looks like an error (bug fixed 2026-10-14).
- **`"use server"` files export only Server Actions.** Every exported function there is a public endpoint — put helpers
  (e.g. `toBookShape`) in `src/lib/*` instead.
- **Windows line endings:** most source files are CRLF. String-replace scripts must handle `\r\n` (a script that
  silently failed on CRLF once duplicated half of `actions.ts`); prefer the Edit tool.
- **Production settings:** after changing any outside setting (Cloudflare, GitHub variable, `app.env`, Razorpay,
  Interakt, Meta, Supabase), update its row in **§7c** in the same session.

---

## 11. Open items (prioritised)

### Next up (before announcing)
1. **Stage 4 functional tests** on `kaydyachaanifayddyacha.com` (now **live** keys — use cheap real purchases and refund them): success purchase, failed
   payment → reminder, order page refresh, My Books, **Instagram in-app on Android + iPhone**, dashboard
   edit → page updates within 5 min, unknown URL → 404, close tab after paying. Some test purchases
   already happened 10-10 evening. Check them against the table and write the results into `go-live-plan.md`.
2. **Supabase Auth → URL Configuration** for the Mumbai project (Site URL + redirect URLs): never
   confirmed (`go-live-plan.md` 1B, `setup-steps-lightsail.md` Step 2). Dashboard login on the new
   domain is the test.
3. **Stage 5**: PageSpeed ✅ (home median 90 / best 97, book 91–92 — §7a; owner to re-run 3× after the 12 Oct
   picker fix). k6 Reel spike ✅ and Server direct ✅ (11 Oct). Still to do: a real phone on Jio/Airtel 4G opening a
   book link from Instagram, WebPageTest (Mumbai, Moto G, 4G), container drill, deploy-under-load.
4. **Stage 6 go-live**: ✅ Razorpay live keys + new live webhook + real ₹99 purchase (2026-10-11).
   **Owner to do now:** ~~hide #31 test book~~ ✅ hidden 12 Oct; **book #32 ग्रामपंचायत: add a description,
   short description and a real category** (dashboard → Products → #32; it shows empty text now) and
   answer the slug / old-link question in §6; refund the ₹99 + ₹1 test payments in
   Razorpay, then press **Check with Razorpay** on those orders; in Razorpay → Live → Webhooks → **our**
   webhook, also tick **`refund.created`** and **`refund.processed`**; ~~run the k6 Server direct test~~ ✅ 11 Oct;
   get an Interakt **marketing** template approved for interested buyers (body `{{1}}` book title,
   `{{2}}` book link) and set `INTERAKT_LEAD_TEMPLATE_NAME` (+ `_LANGUAGE`) in `/opt/kaf/app.env` → the
   next-day follow-up switches on (cron, after reminders; skips buyers who paid or got a reminder that day).
   Still: confirm with the owner whether the live key was *regenerated* (if
   yes, the original site's Vercel needs the new secret within 24 h); an iPhone purchase from Instagram;
   warm the cache; Google Search Console (add domain, submit `/sitemap.xml`); update the Instagram bio and
   Reel links. **SSH note:** the laptop can't SSH to the server (home IP changed); server edits go through
   Lightsail → kaf-a → Connect using SSH (browser SSH allowed in the SSH firewall rule), or update the
   port-22 rule with the new IP.

4b. **Checkout drop-off at Razorpay (16 Oct):** most ad visitors open Razorpay and leave at its mobile-number
   screen (text is Razorpay's, can't be changed — our green WhatsApp hint is under the Buy buttons since 14 Oct).
   Owner: in the Razorpay dashboard (Live) → Orders → `order_ToWBOtLMtX2os9` → its payment → read the failure reason
   (visitor E, 2:14 pm, book #16). If it says "declined / blocked as risky", that's a Razorpay account setting.
   Possible later idea (not decided): force Razorpay's popup to English (`config.display.language`).

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
8. **Meta (status 2026-10-16):**
   1. ✅ **Pixel ID** `1323976956324834` — GitHub variable set by the owner, live 14 Oct (`b9d351b`), privacy
      policy section 4 added. Verified live: PageView + ViewContent reach Meta. Owner: check InitiateCheckout
      (tap Buy) and Purchase in Events Manager → Test events. Ads can run and be tracked **now**.
   2. ⏳ **Domain verification** (optional, not blocking ads): step-by-step WhatsApp message sent to the client
      15 Oct (Business Settings → Brand safety and suitability → Domains → Add → "Update DNS TXT record" → send
      the `facebook-domain-verification=…` line, don't press Verify yet). When it arrives (safe to paste in chat):
      Cloudflare → DNS → Add record → TXT, name `@`, content = the line → then the client presses Verify.
   3. ✅ **Conversions API — LIVE 16 Oct** (`ebc643f`). Token from the client saved in
      `C:\Users\shivr\kaf-keys\meta-capi-token.txt` (never in chat) and added by the owner as
      `META_CAPI_ACCESS_TOKEN` in `/opt/kaf/app.env` (~11:48). How it works: `src/lib/meta-capi.ts` sends one
      server-side **Purchase** per paid order from `onOrderPaid` (webhook `payment.captured` + 10-min check) via
      `after()`; `event_id` = order id (= browser `eventID` → Meta de-duplicates); value, currency, content_ids,
      phone/e-mail SHA-256, country; `_fbp`/`_fbc`/IP/user agent saved at checkout (migration 010) and IP/UA
      cleared after sending; claim column `meta_capi_sent_at` = sent once (reset if Meta refuses, so a retry can
      send). Never blocks payments or WhatsApp. Verified: order #8 paid 3:37:16 pm → Meta 3:37:17 pm.
      **How to check it's still working:** read-only query `orders.meta_capi_sent_at` on recent paid orders (filled
      ≈ 1 s after `paid_at`); server log `[meta-capi] purchase sent` / `[meta-capi] Meta refused …`.
      A test send from the dev PC with a real order was blocked by the permission system (buyer data leaving the
      PC) — always verify on production instead. `META_CAPI_TEST_EVENT_CODE` must stay empty in production.
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
- No CSP header yet (must allow Razorpay + connect.facebook.net). (Refund tracking exists since 11 Oct.)
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
| `HANDOFF.md` §8 "Meta Pixel — off", 5 pixel IDs | Pixel off / which ID | **On** since 10-14 with one ID `1323976956324834` (§7c Meta) |
| `HANDOFF.md` §8 env table | `PAYMENT_REMINDER_DELAY_MINUTES=30`, Replov values | Server uses 10 / 10 minutes; full current list in §7c |

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
| 10-11 | `4b1fbd2` | **Catalog cached across requests** (`src/lib/products.ts`: `unstable_cache` 5 min, tag `products`, + React `cache()` per request). `/order` and other per-request pages no longer query Supabase on every visit (local prod build: first request 0.16 s, then 0.013–0.024 s). Admin save/delete/show-hide call `updateTag("products")` (read-your-writes); script changes appear within 5 min. Chose `unstable_cache` over `"use cache"` because that needs the app-wide Cache Components switch |
| 10-11 | loadtest | **Server direct re-run after caching** (live `4b1fbd2`): 11,728 req, 0 errors, **all thresholds passed**, 1 dropped iteration (was 701); order page median ≈ 0.40 s flat from 10 to 60 req/s (≈ 0.25 s of it is network from the dev PC), p95 0.48–0.93 s up to 40 req/s and 0.78–1.6 s at 50–60 (was 2.2–4.2 s), no stall |
| 10-11 | `0a6b5c2` | PageSpeed fell to 87 after the evening deploys → `deploy.sh` now purges only pages (30 prefixes + home URLs) instead of everything, so images/build files stay cached; same purge run once by hand (pages MISS, covers HIT). Re-run 93. Answered "white first second": network time on the slow-4G lab phone, splash screen wouldn't help (§7a) |
| 10-11 | `d7518d0` | Run straight after that deploy scored 90 (new CSS/font cold at Cloudflare). Owner turned on **Smart Tiered Cache** (BOM + SIN); `deploy.sh` now **warms** pages, book pages, build files and fonts after the purge |
| 10-11 | docs | PageSpeed re-run 22:25 → **93** (SI 3.0 s, TBT 0, CSS 0.18 s, font 0.35 s, white 3/8 frames); new release's CSS + `/ebooks` HIT at Marseille right after deploy |
| 10-12 | `e0b7395` | Morning PageSpeed 80/76 = lab machine variance (network warm, less CPU work). Home below-the-fold sections + footer get `.cv-auto` (skip layout until scrolled near) |
| 10-12 | `5c25355` | PageSpeed **97** after `.cv-auto`. Found Cloudflare URL purge silently fails for pages (home showed the previous release ≈ 5 min after each deploy and after admin saves) → home purged by **Cache-Tag `kaf-home`** in `deploy.sh` and `src/lib/cdn.ts` |
| 10-12 | `dd7be65` | Tag purge verified live (home HIT → MISS, header hidden from visitors); 3-run PageSpeed median pending (owner runs) |
| 10-12 | `b396683` | PageSpeed 3-run median **90** (97/81/90). Bad runs = scripts ran before first paint and the language picker's full-screen blur held it ~1.8 s → picker opens after the first paint (2 frames) and uses a solid tint instead of blur |
| 10-12 | docs | Picker change verified live (all pages on `b396683`); 3 new PageSpeed runs pending (owner) |
| 10-12 | `f23dbcb` | Admin book saves now also clear the **www.** copies of /ebooks + /combos and the **sitemap** (Next + Cloudflare, both hosts). Purge body tested live: www lists, www home and both sitemaps HIT → MISS |
| 10-12 | `6e6123a` `3f38d47` | **My Books showed unpaid attempts** (owner's 4 cancelled ग्रामपंचायत tries) → new `/api/orders/status`; My Books lists only paid orders. Checked live with the owner's 7 saved orders: 1 paid (shown), 2 unpaid + 4 fresh attempts (hidden) |
| 10-12 | docs | `3f38d47` live: My Books paid-only (first version briefly also showed unpaid attempts < 30 min old as "pending" — dropped, a real payment is marked paid within seconds). `/my-books` and `/api/orders/status` not cached by Cloudflare (DYNAMIC / no-store) |
| 10-13 | docs | **Full refresh of this doc**: header, §2 (live keys), §3 status + DB snapshot (11 products, #31 hidden, new #32 needs text, 8 paid / ₹498), new **§7b commands cheat sheet** (server, Cloudflare purge, DB, local, speed measuring), code map (`api/orders/status`, `api/leads`), §10 cache rules, §11 open items |
| 10-14 | `8484f3f` | **Admin cover fixes.** (1) Every successful product save showed "Not saved: Saving failed" — Next 16 rejects the action promise with the `redirect()` signal and `ProductForm`'s catch swallowed it → `unstable_rethrow` in the catch (reproduced + verified on a temporary local page). (2) Square covers (owner's #8, #12, #19 uploads, 800×800) were cropped in the 3:4 cards → `src/lib/book-shape.ts` pads any non-3:4 cover/preview upload to 3:4 with its edge colour; dashboard warns when a picked cover isn't 3:4. Those 3 covers need re-uploading to get padded. (3) The sample reader skipped the uploaded cover (showed PDF pages 1–6) → reader shows cover + pages 2–6 like the viewer; 1600 px zoom only for `-p<n>-` page images. Known, accepted: after an admin save, pages can lag up to ~15 min because app1/app2 each have their own cache (a save clears only the container that handled it); owner OK with it (fix = ask both containers to revalidate, not built) |
| 10-14 | `b9d351b` | **Meta Pixel on**: client gave pixel `1323976956324834` (one of the original site's 5, so both sites report into it); owner set GitHub variable `NEXT_PUBLIC_META_PIXEL_IDS`. Privacy policy got section 4 "Cookies and Ad Measurement (Meta Pixel)" (what is sent; never name/phone/order link; not on /order, /my-books, /dashboard). Still from the client: domain-verification TXT + Conversions API token (server-side Purchase not built yet) |
| 10-14 | `5883955` | Owner asked to change Razorpay's popup ("पुढे जाण्यासाठी मोबाईल नंबर टाका" / "यासह लॉगिन करा"): that text is Razorpay's own and can't be edited, and the number step must stay (it is the WhatsApp delivery number). Instead the book page shows a green line under both Buy buttons: "पेमेंट करताना तुमचा WhatsApp नंबर टाका — पुस्तक PDF त्याच नंबरवर WhatsApp ला येईल." (+ hi/en, `whatsappHint` in `product-copy.ts`) |
| 10-14 | server check | Owner re-uploaded covers #8, #12, #19 (5:23–5:24 pm) → saved 800×1067 (3:4) in all sizes; shown on home, /ebooks, /combos and the book pages; no cropping at 375 px |
| 10-15 | client | Sent the client WhatsApp step lists for the **Meta Conversions API token** (no domain verification needed) and the **domain verification** TXT line (§11 item 8) |
| 10-16 | CAPI | **Meta Conversions API built** (`src/lib/meta-capi.ts`): server-side Purchase from `onOrderPaid` (webhook `payment.captured` + 10-min check) via `after()`, once per order (`meta_capi_sent_at` claim), `event_id` = order id (= browser eventID → de-duplicated), phone/e-mail SHA-256, country; checkout saves `_fbp`/`_fbc` cookies + IP + user agent (after the response, best effort; IP/UA cleared after sending). Migration **010 applied** to Mumbai. Privacy policy §4 updated. Dry run on a real order OK (payload correct, nothing sent). A real send from the dev PC was blocked by the permission system (buyer data) → verify on production instead. **Off until `META_CAPI_ACCESS_TOKEN` is in `/opt/kaf/app.env`** (token saved in `kaf-keys\meta-capi-token.txt`) |
| 10-16 | CAPI live | Owner added `META_CAPI_ACCESS_TOKEN` to `/opt/kaf/app.env` (~11:48). Verified read-only: checkouts from 12:12 save fbp/fbc/IP/UA; first paid order after it (#8, 3:37 pm) reached Meta 1 s after payment. Also found: 6 ad visitors 12:12–2:23 left at Razorpay's number screen (1 failed payment → WhatsApp reminder 2:31 pm). The laptop `kaf-keyspp.env` has Razorpay **test** keys, so failure reasons must be read in the Razorpay dashboard |
| 10-16 | video | **Brand outro video** (HyperFrames, outside the repo: `Desktop\kaf-videos\kaf-outro`): 9:16, 7 s — first version had the emblem assemble from 4 cropped quarters; owner asked for meaning instead → emblem split into layers (badge, scales, two hands) so the scales drop in and balance and the hands meet and shake, then name, tagline, website. Rendered `renders/kaf-outro.mp4` (1080×1920, 3 MB). Details §7d |
| 10-16 | docs | New **§7c production settings register** (every Cloudflare / server / `app.env` / GitHub / Supabase / Razorpay / Interakt / Meta / monitoring setting, where it lives, state, date); §3, §4 (two-cache note), §5 (Razorpay popup), §6 (3:4 covers), §8, §10 (new rules), §11 item 8 updated |
| 10-16 | phone cover | Client: ad link takes ~30 s to open. Measured: page itself 0.5–1 s (cache HIT incl. `fbclid`); real-visitor data says FB visitors P75 2.6 s, 1 % 20–38 s (weak networks / Facebook's own step, not our server — 0.1 s). Book page main image now `<picture>`: phones max **600 px** (was 800, −33 % bytes), ≥ 769 px screens up to 800 px; two `preload`s with `media` (`src/lib/covers.ts` PHONE_*/WIDE_*, `ProductGallery.tsx`, `ProductDetail.tsx`). Checked locally at 375 px (only 600 requested) and 1024 px |

Problems we hit while going live and how we fixed them: `go-live-plan.md` → "Problems we hit"
(19 entries: domain spelling, Tokyo latency, IPv6-only DB host, Lightsail plan block, health check, build
variables, fonts, Cloudflare Free-plan limits …).

---

## 14. Doc index

| Doc | Use it for | Freshness |
|---|---|---|
| **`docs/PROJECT-STATUS.md`** | This overview; **§7c = every production setting and where it lives**; §7b = commands; §7d = brand outro video | Current |
| `docs/go-live-plan.md` | Go-live stages 0–7 with checklists, problems log, hosting decision, test tables for Stages 4–6 | Current (minor stale bits, §12) |
| `docs/ui-match-original.md` | Every UI decision vs the original site (items 1–49 + status) | Current |
| `docs/HANDOFF.md` | Deep detail: buyer flow, catalog, dashboard, env vars, Interakt templates, Razorpay rules, local dev tips | Detail still right; hosting/DB parts stale (§12) |
| `docs/setup-steps-lightsail.md` | Server setup steps 1–7 with "if it fails" fixes | Current (done) |
| `docs/viral-launch-plan.md` | Original audit, cache/WAF rule tables (Phase 5), outage handling (Phase 9), per-Reel runbook | Rules current; status table stale |
| `docs/deploy-lightsail.md` | Server runbook: manual deploy/rollback, monitoring, per-Reel routine, how code supports multiple servers | Two-server parts superseded |
| `docs/setup-steps-ec2.md` | EC2 alternative | Not used |
| `loadtest/README.md` | k6 tests (Reel spike ✅ and Server direct ✅ both passed 11 Oct) + 12 failure drills | Current |
| `supabase/checks/verify.sql` | Pre-launch DB checks | Not run |
| `AGENTS.md` / `CLAUDE.md` | Next.js 16 warning (auto-written by `next dev`) | — |
