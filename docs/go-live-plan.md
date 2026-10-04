# Go-live plan — Lightsail + Cloudflare on kaydyachaanifayddyacha.com

> Updated 2026-10-04. Builds on `docs/deploy-lightsail.md` (server how-to) and
> `docs/viral-launch-plan.md` §Phase 5 (Cloudflare rules) — this file is the
> **order of work**, what to test, and how to switch over safely.

## Decisions (2026-10-04)

| | Decision |
|---|---|
| Domain | **`kaydyachaanifayddyacha.com`** — registered at **Hostinger** on 2026-10-03 (we have access). Note the spelling: `fay`**`dd`**`yach`**`a`**. The original site stays on `kaydyachaanifaydyach.com` (GoDaddy → Vercel) and is **not touched**. |
| Staging hostname | `new.kaydyachaanifayddyacha.com` |
| Supabase | currently **Tokyo (`ap-northeast-1`)** → **move to a new project in Mumbai (`ap-south-1`)** before go-live (Stage 1B) |
| Servers | **Start with ONE Lightsail server** (Mumbai) behind Cloudflare — no Load Balancing. Measure under real traffic; add a second server + Load Balancing later only if needed ("Later: second server" below). |
| Payment-check cron | stays on **cron-job.org** (GitHub `RECONCILE_ENABLED` stays unset) |

## Goal

Reel visitors on phones get the book page **fast and from cache**, Buy → pay →
PDF (download + WhatsApp) **always works**, and nothing breaks if one server dies.

```
Visitor ─► Cloudflare (cache, SSL, WAF, rate limit)
             └─► Server A  Lightsail Mumbai ap-south-1a   Caddy ─► app1 + app2
                         ─► Supabase Pro Mumbai (DB + PDFs) · Razorpay · Interakt
```

≈ ₹3,300/month (1 server ₹1,000, snapshots ₹170, Supabase Pro ₹2,100; Cloudflare Free).
Why one is enough: with Cloudflare caching, a 1M-view Reel sends ~5 req/s to the
server at peak; one 2 GB server handles ~100× that. Two app containers on the server
keep deploys and app crashes gap-free. The only thing a second server adds is
surviving a **whole-machine** failure during a Reel (rare) — add it when sales make
that risk expensive.

## How we switch without risk

1. Nothing is live on the new domain yet, so there is no old site to replace on it.
2. Build the servers, test everything on **`new.kaydyachaanifayddyacha.com`** with
   **Razorpay test keys**.
3. When every test passes: live Razorpay keys, then put the load balancer on the
   apex + `www` of the new domain. Replov keeps running until we're sure.

| Stage | Who | Status |
|---|---|---|
| 0. Repo prep | Claude | ✅ done 2026-10-04 |
| 1. Accounts (Cloudflare, Supabase Mumbai, AWS, GitHub) | you + Claude | in progress — Cloudflare active 2026-10-04, Mumbai project created |
| 2. Server (one) | you | |
| 3. First deploy on staging | you | |
| 4. Functional tests on staging | you (phone) + Claude (database) | |
| 5. Speed + load tests | you + Claude | |
| 6. Go-live day | you + client | |
| 7. After launch | you | |

---

## Stage 0 — Repo prep (Claude) ✅

- [x] `deploy/app.env.example`: the settings added this week (Interakt template
      body/header, reminder template, `AUTO_WHATSAPP_ON_PAYMENT=true`, delay).
- [x] Docker build + `deploy.yml`: pass `NEXT_PUBLIC_META_PIXEL_IDS` (build-time).
- [x] `deploy/Caddyfile`: serves `kaydyachaanifayddyacha.com`, `www.` and the staging
      host `new.` (one Origin certificate for the domain + `*.` covers all three).
- [x] `.github/workflows/reconcile.yml`: own switch `RECONCILE_ENABLED` (leave unset —
      cron-job.org is the cron).
- [x] Sitemap, robots, page metadata, book structured data and the About page now use
      `NEXT_PUBLIC_SITE_URL` instead of a hard-coded domain.
- [x] Image caching: `/media/<path>` route serves covers, preview pages and preview
      PDFs from our domain with long cache headers (images 1 year, previews 1 hour) so
      Cloudflare caches them in India. On with `NEXT_PUBLIC_MEDIA_PROXY=true`.

## Stage 1 — Accounts

### 1A. Cloudflare + the domain (you)

- [x] cloudflare.com → sign up → **Add a site** → `kaydyachaanifayddyacha.com` → **Free**.
      The DNS list can be empty or show Hostinger parking records — **delete the
      parking `A`/`CNAME` records** (nothing real is on the domain yet).
- [x] Cloudflare shows **2 nameservers**. Hostinger **hPanel → Domains →
      kaydyachaanifayddyacha.com → DNS / Nameservers → Change nameservers** →
      paste both → save. Wait for Cloudflare to say **Active** (minutes to a few hours).
- [x] **SSL/TLS → Overview: Full (strict)**. **Edge Certificates**: Always Use HTTPS on,
      Min TLS 1.2, TLS 1.3 on, 0-RTT **off**. (HTTP/3 on under Network.)
- [ ] **SSL/TLS → Origin Server → Create certificate**: hostnames
      `kaydyachaanifayddyacha.com` + `*.kaydyachaanifayddyacha.com`, 15 years →
      save the **certificate and the private key** (key is shown once).
- ~~Load Balancing~~ — **not needed with one server** (only for the second server later).
- [ ] **My Profile → API Tokens → Create**: only *Zone → Cache Purge* for this zone →
      `CLOUDFLARE_API_TOKEN`; note the **Zone ID** (domain Overview page).

### 1B. Supabase → Mumbai (you + Claude)

Supabase can't change a project's region, so we create a new project and copy
everything. Only 9 books and 5 test orders exist — cheapest moment to do it.

You:
- [ ] supabase.com → **New project** in the same organization → Region **South Asia
      (Mumbai) `ap-south-1`** → plan **Pro**, spend cap **on** → set a strong database
      password and save it.
- [ ] In the new project, **Authentication → Users → Add user**: the admin e-mail(s)
      with a password (tick *auto confirm*). Same e-mail as `ADMIN_EMAILS`.
- [ ] **Authentication → URL Configuration**: Site URL
      `https://kaydyachaanifayddyacha.com`; Redirect URLs:
      `https://kaydyachaanifayddyacha.com/**`, `https://new.kaydyachaanifayddyacha.com/**`,
      `https://kaidyachaanifaidyacha-28da.replov.com/**`.
- [ ] Create a file **`.env.mumbai`** in the project folder (it is git-ignored) with:
      ```
      NEW_SUPABASE_URL=            # Settings → API → Project URL
      NEW_SUPABASE_ANON_KEY=       # Settings → API → anon public key
      NEW_SUPABASE_SERVICE_ROLE_KEY=   # Settings → API → service_role key
      NEW_DB_URL=                  # Settings → Database → Connection string → URI (session pooler), with the password filled in
      ```
      Tell Claude when it's saved — **don't paste keys in chat**.

Claude:
- [x] Create the tables on the new database: `supabase/schema.sql`, `onboarding.sql`,
      migrations `001`–`005` (all idempotent). *(2026-10-04, project `ntqwvfksdqdyoyknkprh`;
      reached via the IPv4 session pooler `aws-0-ap-south-1.pooler.supabase.com` — the
      direct `db.` host is IPv6-only.)*
- [x] Copy Storage: `covers` 102 files (30.7 MB, incl. `previews/`), `pdfs` 9 files (186.8 MB).
- [x] Copy rows: `products` 9 (URLs rewritten to the new project), `combo_items` 0,
      `store_settings` 1, `orders` 5.
- [x] Verify: every value identical to Tokyo, no Tokyo links left, 93/93 images,
      9/9 PDFs sign + download, 9/9 preview PDFs, anon sees 9 books and no orders,
      functions + `funnel_daily` work, 2 confirmed auth users. Local `.env.local`
      now points at Mumbai (Tokyo values kept in `.env.local.tokyo-backup`).

You (after Claude's OK):
- [ ] **Replov** env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` → new values → **redeploy** (the public ones are baked
      into the build). Claude updates `.env.local`.
- [ ] Test on Replov: books + covers + previews show, admin login works, one test
      purchase (Razorpay test mode) → PDF + WhatsApp.
- [ ] After ~1 week without problems: **pause, then delete the Tokyo project**
      (until then it costs extra compute).

### 1C. AWS (you)
- [ ] AWS account with billing; **AWS CLI** on your laptop (for the firewall script).

### 1D. GitHub (you) — repo → Settings → Secrets and variables → Actions
- [ ] Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**Mumbai**
      values from 1B), `NEXT_PUBLIC_SITE_URL=https://new.kaydyachaanifayddyacha.com`,
      `NEXT_PUBLIC_META_PIXEL_IDS` (empty until the client confirms),
      **`NEXT_PUBLIC_MEDIA_PROXY=true`** (images + previews via `/media`, cached by Cloudflare).
      **`DEPLOY_ENABLED` last** (Stage 3).
- [ ] Your GitHub profile → Developer settings → **classic token** with only
      `read:packages` (servers use it to pull the image).
- [ ] Secret `LIGHTSAIL_SSH_KEY` comes in Stage 2 (private key of the server key pair).

## Stage 2 — Servers (you) — `docs/deploy-lightsail.md` §2–§5

- [ ] Lightsail → create **`kaf-a`** (Mumbai, zone **ap-south-1a**): Ubuntu 24.04,
      **2 GB** plan (US$12), download the SSH key pair, attach a **static IP**,
      **automatic snapshots** on. Put the key pair's private key in the GitHub
      secret `LIGHTSAIL_SSH_KEY`.
- [ ] On the server: `setup-server.sh` → Origin cert/key into `/opt/kaf/certs/` →
      `/opt/kaf/app.env` → `docker login ghcr.io` (the `read:packages` token).
- [ ] `app.env` for staging:
  - Supabase: **Mumbai** values.
  - Razorpay **test** key ID + secret; a **new** webhook secret for the staging webhook.
  - `ORDER_ACCESS_SECRET`, `CRON_SECRET`: **reuse Replov's values** (test-order links
    keep working). `ORDER_ACCESS_SECRET` must never change after real sales.
  - Interakt + `ADMIN_EMAILS`: same as on Replov.
  - `NEXT_PUBLIC_SITE_URL=https://new.kaydyachaanifayddyacha.com`
- [ ] Firewall: `./deploy/lightsail-firewall.sh kaf-a <your-ip>/32` —
      web ports only from Cloudflare, SSH only from you.
- [ ] GitHub variable `LIGHTSAIL_HOSTS="<static-ip-of-kaf-a>"`.

## Stage 3 — First deploy on staging (you)

- [ ] GitHub variable `DEPLOY_ENABLED=true` → Actions → **Deploy** → Run workflow.
      Builds one image and rolls it out to the server (two containers, one at a time).
- [ ] Cloudflare **DNS → Add record**: type `A`, name `new`, IPv4 = server's static IP,
      **Proxied (orange cloud)**.
- [ ] UptimeRobot (free): HTTPS monitor on `https://new.kaydyachaanifayddyacha.com/api/health`,
      every 5 min, alert to your phone/e-mail.
- [ ] Cloudflare **Cache Rules** 1–5 and **WAF** rules (`viral-launch-plan.md` §Phase 5),
      plus rule **`media`**: path starts with `/media/` → *Eligible for cache*, Edge TTL
      *respect origin* (1 year for images, 1 hour for preview PDFs).
      Smart Tiered Cache on; Rocket Loader, Email obfuscation, Bot Fight Mode **off**.
- [ ] Razorpay **Test Mode** → Webhooks → add
      `https://new.kaydyachaanifayddyacha.com/api/razorpay/webhook` (events
      `payment.captured`, `order.paid`, `payment.failed`; staging secret).
- [ ] cron-job.org → change the URL to `https://new.kaydyachaanifayddyacha.com/api/cron/reconcile`.

**Check (Claude can run these):**
```bash
curl -s https://new.kaydyachaanifayddyacha.com/api/health        # {"ok":true,"deployment":"<sha>"}
curl -sI "https://new.kaydyachaanifayddyacha.com/ebooks/<slug>?igsh=a" | grep -i cf-cache-status   # 2nd time: HIT
curl -sI "https://new.kaydyachaanifayddyacha.com/media/<any cover>-400.webp" | grep -i cf-cache-status   # 2nd time: HIT
curl -sk --max-time 5 https://<ip-A>/ ; echo "exit=$?"            # must time out (firewall)
```

## Stage 4 — Functional tests on staging (Razorpay test mode)

Claude checks the database after each.

| # | Test | Pass |
|---|---|---|
| 1 | Buy with `success@razorpay`, your own number | auto-download, order page, PDF on WhatsApp **without** popup, webhook 200 |
| 2 | Buy another book with `failure@razorpay` | one reminder 30–40 min later |
| 3 | Reopen the order page, refresh 5× | download again works; no second auto-download |
| 4 | माझी पुस्तके on the same phone | order listed, opens |
| 5 | Open the book link **from Instagram** (DM it to yourself) on Android + iPhone, buy | Razorpay opens inside Instagram, order page loads, PDF saves (or "open in browser" hint) |
| 6 | Admin: log in to `/dashboard`, edit a product text, save | saved; page updates within 5 min |
| 7 | Unknown book URL | 404 page |
| 8 | Close the tab right after paying | webhook marks it paid; WhatsApp still arrives |

## Stage 5 — Speed + load tests (staging)

**A. Page speed (phones are what matter)**

| Tool | Pages | Target |
|---|---|---|
| PageSpeed Insights (mobile) — pagespeed.web.dev | `/`, `/ebooks`, 2 book pages | Performance ≥ 90, LCP < 2.5 s, CLS < 0.1, TBT < 200 ms |
| WebPageTest — Mumbai, Moto G, 4G | 1 book page, first + repeat view | first view visually complete < 3 s |
| `curl -w "%{time_starttransfer}"` from India | book page, twice | `cf-cache-status: HIT`, TTFB < 200 ms |
| Real phone on Jio/Airtel 4G, from Instagram | book page → Buy | page usable < 2 s; Razorpay opens < 2 s after tap |

**B. Load + failure tests** — `loadtest/README.md` (`checkout.js` refuses production
hosts but allows `new.`)
- [ ] A/B `landing.js` — Reel spike with random `?igsh=`: cache HIT > 98 %, errors < 1 %.
      Start ~300 req/s; run from a cloud machine or add a temporary Cloudflare WAF
      *skip* rule for your IP so Cloudflare doesn't block the test.
- [ ] C `checkout.js` — order creation p95 < 1.5 s (creates test orders; delete them after).
- [ ] D webhook replay — paid exactly once, `whatsapp_sends` ≤ 1.
- [ ] E `download.js` — valid 302 / bad 403 / over-limit 429.
- [ ] **Container drill**: `docker stop` one app container during a test purchase →
      Caddy sends traffic to the other, purchase completes → start it again.
- [ ] **Deploy during load**: run the Deploy workflow while `landing.js` runs → 0 errors.
- [ ] Record per run: req/s, p95, errors, cache HIT %, server CPU/RAM, Supabase CPU.

## Stage 6 — Go-live day (quiet hour, no Reel that day)

The original site keeps its domain, its Razorpay webhook and its buyers — we only
add things for the new domain.

1. **Razorpay (live mode)** — the account is shared with the original site:
   - Use the **existing live key ID + secret** (ask the client; don't regenerate — that
     would break the original site), *or* if the client prefers, regenerate with
     "deactivate old key within 24 h" and update the original site's Vercel settings too.
   - **Webhooks → Add new** (don't edit the original site's):
     `https://kaydyachaanifayddyacha.com/api/razorpay/webhook`, 3 events, new secret.
   - **Account & Settings → Website/app details**: add `kaydyachaanifayddyacha.com`
     (Razorpay may review the new site's policy pages — they exist at `/terms`,
     `/refund-policy`, `/privacy-policy`, `/shipping-policy`, `/cancellation-policy`,
     `/contact`).
2. `app.env` on the server: live Razorpay keys + live webhook secret,
   `NEXT_PUBLIC_SITE_URL=https://kaydyachaanifayddyacha.com`. GitHub variable
   `NEXT_PUBLIC_SITE_URL` → same (+ pixel IDs if ready) → **Deploy** workflow.
3. Cloudflare **DNS**: replace the Hostinger parking record — `A` record for `@`
   (the apex) = server's static IP, **Proxied**; `CNAME www → kaydyachaanifayddyacha.com`,
   **Proxied**. Traffic arrives within seconds.
4. cron-job.org URL → `https://kaydyachaanifayddyacha.com/api/cron/reconcile`.
5. **Warm the cache**: open every book page once; check `cf-cache-status: HIT`.
6. **Real purchase**: ₹99 on Android from Instagram + one on iPhone → download,
   WhatsApp PDF, Claude checks the database → refund both in Razorpay.
7. Google Search Console: add the domain, submit `/sitemap.xml`.
8. Update the creator's Instagram bio / Reel links to the new domain.
9. After 1–2 quiet days: delete the Replov deployment and its Razorpay test webhook.

**Rollback:** remove the apex + `www` DNS records in Cloudflare (the domain just
stops answering) and point the bio back to the original site. Nothing on the original
site changes at any point.

## Stage 7 — After launch

- [ ] UptimeRobot (free) on `https://kaydyachaanifayddyacha.com/api/health`, alerts to phone.
- [ ] Lightsail alarms on the server: CPU > 70 % for 5 min, status check failed.
- [ ] UptimeRobot monitor moved to the apex (set up in Stage 3 for `new.`).
- [ ] Weekly: Supabase egress vs 250 GB; consider compressing the biggest PDFs
      (#26 49.5 MB, #25 33 MB, #30 29 MB) to cut cost and download time.
- [ ] Per Reel: routine in `docs/deploy-lightsail.md` §9 (no deploys an hour before;
      watch HIT ratio, pool health, `funnel_daily`; follow up paid-not-downloaded).
- [ ] Deploys from now on: push to `main` → GitHub builds and rolls out
      automatically (zero downtime).
- [ ] Later (client's choice): forward the original domain `kaydyachaanifaydyach.com`
      to the new one so old Reel links reach us (our site already redirects the
      original's `/ebooks/<old id>` URLs).

## Later: second server + Load Balancing (only if needed)

Add it when: a Reel peak pushes server CPU above ~60 % for minutes, the uptime
monitor ever reports the server down, or sales per Reel make an outage expensive.
No code changes needed:
1. Lightsail → snapshot of `kaf-a` → create `kaf-b` from it in **ap-south-1b** + static IP;
   same `/opt/kaf/app.env` and certs (they come with the snapshot).
2. Firewall script for `kaf-b`; GitHub `LIGHTSAIL_HOSTS="<ip-A> <ip-B>"`.
3. Cloudflare → Traffic → **Load Balancing** (≈ US$5/month): monitor `GET /api/health`,
   pool with both IPs, load balancers on the apex + `www` (replace the A/CNAME records).
4. Failover drill: stop `kaf-a` during a test purchase → still completes via `kaf-b`.
Details: `docs/deploy-lightsail.md` §7.

## Open questions

1. **Support e-mail**: the site shows `support@kaydyachaanifaydyach.com` (original
   domain), which has **no mail server** — messages don't arrive. Set up e-mail on
   the new domain (Hostinger / Cloudflare Email Routing) and switch the address?
2. Razorpay live keys for go-live: reuse the client's existing live key, or regenerate?
