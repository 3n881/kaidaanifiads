# Go-live plan — AWS EC2 + Cloudflare on kaydyachaanifayddyacha.com

> Updated 2026-10-09. Builds on `docs/deploy-lightsail.md` (server how-to) and
> `docs/viral-launch-plan.md` §Phase 5 (Cloudflare rules) — this file is the
> **order of work**, what to test, and how to switch over safely.
> **New agent? Read "▶ Current status" first, then "Problems we hit".**

## ▶ Current status (2026-10-09) — start here

| Area | State |
|---|---|
| Code | All go-live code is on `main`: new domain in server config, one-server plan, `/media` image caching, preview-PDF purge, WhatsApp/reminder settings, **EC2 firewall script + deploy SSH fix (2026-10-09)**. |
| Domain + Cloudflare | ✅ `kaydyachaanifayddyacha.com` active on Cloudflare (Free), SSL Full (strict), Origin certificate created, Cache Purge token + Zone ID **tested** (single-file and prefix purge both work on Free). DNS still shows Hostinger's parking record — replaced with the server IP in Stage 3 (`new.`) / Stage 6 (apex). |
| Database | ✅ **Mumbai** Supabase project `ntqwvfksdqdyoyknkprh` holds the real data (copied + verified 2026-10-04). Tokyo project `yjsmebmytltwwihvivbd` is now only used by Replov. |
| Replov (old test host) | Stays on **Tokyo** on purpose (user decision 2026-10-04). Treat it as a test site only: **no book edits / uploads on Replov's dashboard** — they would land in Tokyo, not Mumbai. If anything must change before go-live, change it in Mumbai (local scripts / the new server) or ask Claude to copy it. |
| **Server** | **Decided 2026-10-09: AWS EC2 `t3.small` in Mumbai** (Lightsail still refused the 2 GB plan after 5 days). Budget ≈ ₹4,100/month incl. Supabase Pro — **approved by the user**. (Leaner options discussed and declined for now: Lightsail $7 / EC2 `t3.micro`, 1 GB — measured ~60 MB per app container, so 1 GB would also work.) Not created yet → **Stage 2 (EC2 steps)**. |
| GitHub variables (Stage 1D) | Not confirmed yet. |
| Next action | User: Stage 1D GitHub variables/secrets → **Stage 2: create the EC2 server** (click-by-click below) → send Claude the Elastic IP → Stage 2 server setup → Stage 3 first deploy. |

### Where the secrets and key files are (never commit, never paste in chat)

| What | Where |
|---|---|
| Mumbai Supabase URL / anon / service-role key, DB URL; Cloudflare Zone ID + Cache Purge token | `.env.mumbai` in the project folder (git-ignored) |
| Local dev settings (now pointing at **Mumbai**) | `.env.local` (git-ignored); the old Tokyo values are in `.env.local.tokyo-backup` |
| Cloudflare Origin certificate + private key | `origin.pem` + `origin.key` on the user's laptop → go to `/opt/kaf/certs/` on the server |
| Razorpay, Interakt, `ORDER_ACCESS_SECRET`, `CRON_SECRET`, `ADMIN_EMAILS` | Replov's environment settings (reuse for the server's `app.env`) |
| Server SSH key (`kaf-key.pem`) | downloaded when the EC2 instance is created → GitHub secret `DEPLOY_SSH_KEY` |
| AWS access key for GitHub deploys (IAM user `github-deploy`) | GitHub secrets `AWS_DEPLOY_ACCESS_KEY_ID` / `AWS_DEPLOY_SECRET_ACCESS_KEY` only |

## Problems we hit (and what we did)

| # | Date | Problem | Resolution |
|---|---|---|---|
| 1 | 10-04 | Plan assumed the original domain `kaydyachaanifaydyach.com` (GoDaddy, client/old developer). We only control **Hostinger**, and the domain bought there is spelled **`kaydyachaanifayddyacha.com`**. | Go live on the Hostinger domain (user decision). Original site untouched; old buyers keep using it. Code made domain-agnostic (`NEXT_PUBLIC_SITE_URL`). |
| 2 | 10-04 | Supabase was in **Tokyo** (`ap-northeast-1`): each DB call from India +~160 ms (≈ +0.7 s per Buy), cover images 0.6–1.3 s each. | New project in **Mumbai**, everything copied by Claude (schema, storage, rows), verified. Measured from Pune: cover image 630 → 390 ms avg (best 550 → 170 ms), 5 MB preview PDF 1.3–1.6 → 1.0 s. |
| 3 | 10-04 | Mumbai DB "direct connection" host (`db.<ref>.supabase.co`) is **IPv6-only**; the local network has no IPv6. | Use the IPv4 **session pooler** `aws-0-ap-south-1.pooler.supabase.com:5432`, user `postgres.<ref>`, same password (derived automatically; `.env.mumbai` unchanged). |
| 4 | 10-04 | Images were the slowest part of the site (served straight from Supabase on every visit). | `/media/<path>` route + `NEXT_PUBLIC_MEDIA_PROXY=true` → Cloudflare caches covers/previews in India (images 1 year, preview PDFs 1 hour + purge on rebuild). Off on hosts without a CDN (Replov). |
| 5 | 10-04 | "Do we need two servers + load balancer?" | No — start with **one** server behind Cloudflare (capacity ~100× a Reel peak); add the second server only for whole-machine failover later ("Later: second server" below). |
| 6 | 10-04 | Replov can't/won't be moved to Mumbai. | Replov stays on Tokyo as a test site; data is split — see Current status. |
| 7 | 10-04 | Unsure if Cloudflare Free allows purge-by-prefix (used to refresh pages after admin edits). | Tested with the real token: prefix and single-file purge both work. Note: the token also has *Zone → Read* (harmless; remove it in Cloudflare if you want purge-only). |
| 8 | 10-05 | **Lightsail blocks the 2 GB plan** in all Mumbai zones (a, b, c): `CreateInstances[ap-south-1] Sorry, your account can not create an instance using this Lightsail plan size. Please try a smaller plan size or contact Customer Support if you need to use a larger plan. (400)` — a restriction on new AWS accounts. | Waited 5 days, still blocked → **switched to EC2 `t3.small` Mumbai (2026-10-09)**. Don't use the 0.5–1 GB plans: the setup runs two app containers and needs 2 GB. |
| 9 | 09-29 | Local Windows PC blocks Turbopack's native binary (Application Control). | Local only: `npm run dev:webpack`. Production builds on Linux are unaffected. |
| 10 | 10-04 | The site shows `support@kaydyachaanifaydyach.com` — that domain has **no mail server**, mails never arrive. | Open question (below). |
| 11 | 10-09 | **Gap in the existing deploy:** the firewall allowed SSH only from the admin's IP, but GitHub's deploy logs in over SSH from GitHub's machines — every automatic deploy would have been blocked. | `deploy.yml` now opens SSH for the runner's own IP only while it deploys and always closes it (EC2 security group, IAM user limited to that one group: `deploy/github-deploy-iam-policy.json`). New EC2 firewall script `deploy/ec2-firewall.sh`. |
| 12 | 10-09 | "Which server is fastest?" | EC2 Mumbai: Supabase Mumbai runs on AWS `ap-south-1`, so DB calls are ~1 ms (vs ~15–20 ms from DigitalOcean Bangalore). Page/image speed is decided by Cloudflare's India edge (~99 % of requests never reach the server). |
| 13 | 10-09 | `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is passed by `deploy.yml` as a build secret, but the Dockerfile doesn't read it (legacy builder, no BuildKit secrets). | Harmless: one image is built per release and runs on every container, so Server Action keys already match. Leave the secret unset. |

### AWS Support case text (for problem 8)

Support Center → **Create case** → *Service limit increase* (or *Account and billing*) →
Service **Lightsail**, Region **Asia Pacific (Mumbai)**, request: 2 GB plan, 2 instances:

> Hello, when I create a Lightsail instance in ap-south-1 (Mumbai) with the $12/month
> plan (2 GB RAM, 2 vCPU, dual-stack), I get: "Sorry, your account can not create an
> instance using this Lightsail plan size. Please try a smaller plan size or contact
> Customer Support if you need to use a larger plan." (CreateInstances, 400). Please
> enable the 2 GB plan for my account in ap-south-1. I need up to 2 instances for a
> production website (an ebook store on Docker). Thank you.

## Hosting options (decided: EC2 `t3.small` Mumbai, 2026-10-09)

Requirements: Ubuntu 24.04, Docker, SSH from GitHub Actions, **public IPv4**,
**≥ 2 GB RAM** (two app containers + Caddy), close to the Mumbai database. Prices are
approximate (Oct 2026) — confirm on each site.

| Option | Server | ≈ / month | To Mumbai DB | Ready? | Notes |
|---|---|---|---|---|---|
| **AWS Lightsail** (original plan) | 2 GB / 2 vCPU | **$12** | same city, ~1 ms | ❌ blocked 5+ days | Cheapest, but the 2 GB plan is refused on this account |
| **DigitalOcean** — Bangalore (BLR1) | 2 GB / 1 vCPU · 2 GB / 2 vCPU | **$12 · $18** | ~15–20 ms | ✅ instant | Very reliable and simple; Replov already runs on DigitalOcean |
| **Vultr** — Mumbai | 2 GB / 1 vCPU | ~$12 | same city | ✅ instant | Good value, same city as the DB |
| **AWS EC2** `t3.small` — Mumbai ✅ **chosen** | 2 GB / 2 vCPU | ~$22 (server ~$16 + 30 GB disk ~$3 + Elastic IP ~$4) | same AWS region as the DB, ~1 ms | ✅ | Fastest Buy (same region as Supabase); burstable CPU; same AWS account |
| **Hostinger VPS** — India (KVM 2) | 2 vCPU / 8 GB | ~₹700–900 on a 1–2-year prepay | close | ✅ instant | Account already exists; most RAM per rupee, but long prepay and higher renewal |

**Decision 2026-10-09: EC2 `t3.small`, Mumbai** — Lightsail stayed blocked; EC2 is in the same AWS
region as the Supabase database (fastest Buy). The table is kept for reference.

**Recommendation given 2026-10-05 (before the decision):**
- Can wait ~1 day → **open the AWS case and stay on Lightsail** ($12, closest, everything ready).
- Want to proceed today → **DigitalOcean Bangalore, 2 GB** ($18 with 2 vCPU for headroom; $12 with
  1 vCPU also works). +15–20 ms per DB call ≈ +0.1 s per Buy — negligible.
- 1 vs 2 vCPU: with Cloudflare absorbing ~99 % of Reel traffic the server mostly runs Buy/order/
  download — 1 vCPU is enough, 2 gives headroom.

**What changes if it's not Lightsail** (everything else — `setup-server.sh`, Docker, Caddy,
Cloudflare, GitHub auto-deploy — works as-is):
- Firewall: EC2 → `deploy/ec2-firewall.sh` (security group, done). Non-AWS providers → a small
  `ufw` script (not written yet): ports 80/443 only from Cloudflare's IP ranges, SSH only from
  the user's IP, and GitHub's deploy needs SSH access (problem 11).
- Snapshots/backups: turn on the provider's automatic backups (DigitalOcean/Vultr ≈ +20 % of the
  server price).
- GitHub: secret `DEPLOY_SSH_KEY` + variable `DEPLOY_HOSTS` (the older `LIGHTSAIL_*` names still work).
- Monitoring: UptimeRobot on `/api/health` (provider alarms optional).


## Decisions (2026-10-04)

| | Decision |
|---|---|
| Domain | **`kaydyachaanifayddyacha.com`** — registered at **Hostinger** on 2026-10-03 (we have access). Note the spelling: `fay`**`dd`**`yach`**`a`**. The original site stays on `kaydyachaanifaydyach.com` (GoDaddy → Vercel) and is **not touched**. |
| Staging hostname | `new.kaydyachaanifayddyacha.com` |
| Supabase | moved from **Tokyo** to a new **Mumbai** project `ntqwvfksdqdyoyknkprh` — ✅ done 2026-10-04 (Stage 1B) |
| Servers | **ONE AWS EC2 `t3.small`** (2 vCPU / 2 GB, Mumbai `ap-south-1`) behind Cloudflare — no Load Balancing. Measure under real traffic; add a second server + Load Balancing later only if needed ("Later: second server" below). |
| Payment-check cron | stays on **cron-job.org** (GitHub `RECONCILE_ENABLED` stays unset) |
| Replov | stays on the Tokyo database as a test site; not switched (2026-10-04) |

## Goal

Reel visitors on phones get the book page **fast and from cache**, Buy → pay →
PDF (download + WhatsApp) **always works**, and nothing breaks if one server dies.

```
Visitor ─► Cloudflare (cache, SSL, WAF, rate limit)
             └─► Server A  EC2 t3.small Mumbai ap-south-1   Caddy ─► app1 + app2
                         ─► Supabase Pro Mumbai (DB + PDFs) · Razorpay · Interakt
```

≈ ₹4,100/month (EC2 t3.small ~₹1,400 + 30 GB disk ~₹230 + Elastic IP ~₹310 + snapshots ~₹100,
Supabase Pro ₹2,100; Cloudflare Free). New AWS accounts may get free-tier credits that cover
the first months of EC2.
Why one is enough: with Cloudflare caching, a 1M-view Reel sends ~5 req/s to the
server at peak; one 2 GB server handles ~100× that. Two app containers on the server
keep deploys and app crashes gap-free. The only thing a second server adds is
surviving a **whole-machine** failure during a Reel (rare) — add it when sales make
that risk expensive.

## How we switch without risk

1. Nothing is live on the new domain yet, so there is no old site to replace on it.
2. Build the server, test everything on **`new.kaydyachaanifayddyacha.com`** with
   **Razorpay test keys**.
3. When every test passes: live Razorpay keys, then point the apex + `www` of the new
   domain at the server in Cloudflare DNS. Replov keeps running until we're sure.

| Stage | Who | Status |
|---|---|---|
| 0. Repo prep | Claude | ✅ done 2026-10-04 |
| 1. Accounts (Cloudflare, Supabase Mumbai, AWS, GitHub) | you + Claude | Cloudflare ✅, Supabase Mumbai ✅, AWS ✅ (EC2), GitHub variables ⏳ |
| 2. Server (one EC2) | you + Claude | ⏳ next — EC2 steps below |
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
- [x] **SSL/TLS → Origin Server → Create certificate**: hostnames
      `kaydyachaanifayddyacha.com` + `*.kaydyachaanifayddyacha.com`, 15 years →
      save the **certificate and the private key** (key is shown once).
- ~~Load Balancing~~ — **not needed with one server** (only for the second server later).
- [x] **My Profile → API Tokens → Create**: only *Zone → Cache Purge* for this zone →
      `CLOUDFLARE_API_TOKEN`; note the **Zone ID** (domain Overview page).

### 1B. Supabase → Mumbai (you + Claude)

Supabase can't change a project's region, so we create a new project and copy
everything. Only 9 books and 5 test orders exist — cheapest moment to do it.

You:
- [x] supabase.com → **New project** in the same organization → Region **South Asia
      (Mumbai) `ap-south-1`** → plan **Pro**, spend cap **on** → set a strong database
      password and save it.
- [x] In the new project, **Authentication → Users → Add user**: the admin e-mail(s)
      with a password (tick *auto confirm*). Same e-mail as `ADMIN_EMAILS`.
- [ ] **Authentication → URL Configuration** *(not confirmed yet — check)*: Site URL
      `https://kaydyachaanifayddyacha.com`; Redirect URLs:
      `https://kaydyachaanifayddyacha.com/**`, `https://new.kaydyachaanifayddyacha.com/**`,
      `https://kaidyachaanifaidyacha-28da.replov.com/**`.
- [x] Create a file **`.env.mumbai`** in the project folder (it is git-ignored) with:
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

~~You: switch Replov to Mumbai~~ — **skipped** (2026-10-04): Replov stays on Tokyo as a
test site; the first real test on Mumbai happens on the new server (Stage 4). `.env.local`
already points at Mumbai.
- [ ] After go-live + ~1 week without problems: **pause, then delete the Tokyo project**
      (until then it costs extra compute) — and delete the Replov deployment.

### 1C. AWS (you)
- [x] AWS account with billing (Lightsail 2 GB blocked → using EC2, problem 8).
- [ ] Nothing to install: run `deploy/ec2-firewall.sh` in **AWS CloudShell** (the `>_` icon in
      the AWS console top bar, region Mumbai) — it has the AWS CLI built in. (Alternative: AWS
      CLI on your laptop with `aws configure`.)

### 1D. GitHub (you) — repo → Settings → Secrets and variables → Actions
- [ ] Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**Mumbai**
      values from 1B), `NEXT_PUBLIC_SITE_URL=https://new.kaydyachaanifayddyacha.com`,
      `NEXT_PUBLIC_META_PIXEL_IDS` (empty until the client confirms),
      **`NEXT_PUBLIC_MEDIA_PROXY=true`** (images + previews via `/media`, cached by Cloudflare).
      **`DEPLOY_ENABLED` last** (Stage 3).
- [ ] Your GitHub profile → Developer settings → **classic token** with only
      `read:packages` (servers use it to pull the image).
- [ ] Secrets that come in Stage 2: `DEPLOY_SSH_KEY` (contents of `kaf-key.pem`),
      `AWS_DEPLOY_ACCESS_KEY_ID` + `AWS_DEPLOY_SECRET_ACCESS_KEY` (IAM user `github-deploy`);
      variables `DEPLOY_HOSTS` (the Elastic IP) and `DEPLOY_SG_ID` (the security group ID).

## Stage 2 — Server: AWS EC2 `t3.small`, Mumbai (you + Claude)

### 2A. Create the server (AWS console, ~20 min)
- [ ] console.aws.amazon.com → top-right region **Asia Pacific (Mumbai) `ap-south-1`** → **EC2**.
- [ ] **Security group first:** EC2 → Network & Security → **Security Groups → Create security
      group** → name `kaf-web`, description "kaf web server", VPC = default → **no inbound
      rules** (the script adds them) → Create. Note its **ID** (`sg-…`).
- [ ] **Launch instances:**
  - Name **`kaf-a`**
  - AMI: **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type**, architecture **64-bit (x86)**
  - Instance type **`t3.small`** (2 vCPU, 2 GiB)
  - Key pair → **Create new key pair**: name `kaf-key`, type RSA, format **.pem** → it downloads
    once — keep it with `origin.pem`/`origin.key`, never share it
  - Network settings → **Edit** → *Select existing security group* → **`kaf-web`**;
    auto-assign public IP: Enable
  - Storage: **30 GiB, gp3**
  - Advanced details → Credit specification: leave **Unlimited** (default; extra charge only if
    CPU stays above 20 % for long periods)
  - **Launch instance**. If AWS refuses `t3.small` on the new account, open the same kind of
    support case as for Lightsail (problem 8) — and tell Claude.
- [ ] **Elastic IP** (a fixed address): EC2 → Network & Security → **Elastic IPs → Allocate** →
      then **Actions → Associate** → instance `kaf-a`. Send Claude this IP (not secret).
- [ ] **Daily backups:** EC2 → Elastic Block Store → **Lifecycle Manager → Create lifecycle
      policy** → EBS snapshot policy → target: *Instance*, tag `Name` = `kaf-a` → every 24 h,
      keep 7 → Create.
- [ ] **Firewall** in **AWS CloudShell** (`>_` icon, top bar):
      `curl -fsSLO https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/ec2-firewall.sh && bash ec2-firewall.sh <sg-id> <your-laptop-ip>/32`
      (your laptop's IP: open https://checkip.amazonaws.com **on your laptop**, not in CloudShell).
      Result: 80/443 only from Cloudflare, SSH only from you. Home IPs change — re-run it if
      SSH from your laptop stops working.
- [ ] **IAM user for GitHub deploys:** IAM → Users → **Create user** `github-deploy` (no console
      access) → Permissions: *Attach policies directly* → **Create policy** → JSON → paste
      `deploy/github-deploy-iam-policy.json` with `ACCOUNT_ID` (top-right menu, 12 digits) and
      `SECURITY_GROUP_ID` (the `sg-…`) filled in → name `kaf-github-deploy-ssh` → attach →
      create user → user → **Security credentials → Create access key** → *Application running
      outside AWS* → copy both values into GitHub secrets `AWS_DEPLOY_ACCESS_KEY_ID` /
      `AWS_DEPLOY_SECRET_ACCESS_KEY`.
- [ ] GitHub: secret **`DEPLOY_SSH_KEY`** = full contents of `kaf-key.pem`; variables
      **`DEPLOY_HOSTS`** = the Elastic IP, **`DEPLOY_SG_ID`** = the `sg-…` ID.
- [ ] Optional: CloudWatch alarm on the instance — *CPUUtilization > 70 % for 5 min* and
      *StatusCheckFailed* → e-mail.

### 2B. Set up the server (SSH, ~30 min — Claude guides live)
- [ ] From your laptop: `ssh -i kaf-key.pem ubuntu@<elastic-ip>` (Windows: in Git Bash; if it
      complains about key permissions, Claude will help).
- [ ] `curl -fsSL https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/setup-server.sh | bash`
      → log out and back in (Docker group).
- [ ] Copy the Origin certificate: `origin.pem` → `/opt/kaf/certs/origin.pem`,
      `origin.key` → `/opt/kaf/certs/origin.key` (e.g. `scp -i kaf-key.pem origin.* ubuntu@<ip>:/opt/kaf/certs/`).
- [ ] `/opt/kaf/app.env` for staging (`chmod 600`):
  - Supabase: **Mumbai** values (from `.env.mumbai`).
  - Razorpay **test** key ID + secret; a **new** webhook secret for the staging webhook.
  - `ORDER_ACCESS_SECRET`, `CRON_SECRET`: **reuse Replov's values** (test-order links keep
    working). `ORDER_ACCESS_SECRET` must never change after real sales.
  - Interakt + `ADMIN_EMAILS`: same as on Replov. Cloudflare `CLOUDFLARE_ZONE_ID` /
    `CLOUDFLARE_API_TOKEN` from `.env.mumbai`.
  - `NEXT_PUBLIC_SITE_URL=https://new.kaydyachaanifayddyacha.com`
- [ ] `docker login ghcr.io -u 3n881` with the `read:packages` token (Stage 1D).

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
- [ ] CloudWatch alarms on the EC2 instance: CPU > 70 % for 5 min, status check failed.
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
1. EC2 → `kaf-a` → **Actions → Image and templates → Create image** (AMI) → launch `kaf-b`
   from it in another zone (e.g. `ap-south-1b`), same `kaf-web` security group, own Elastic IP.
   `/opt/kaf/app.env` and certs come with the image.
2. GitHub `DEPLOY_HOSTS="<ip-A> <ip-B>"` (same security group → the deploy SSH opening covers both).
3. Cloudflare → Traffic → **Load Balancing** (≈ US$5/month): monitor `GET /api/health`,
   pool with both IPs, load balancers on the apex + `www` (replace the A/CNAME records).
4. Failover drill: stop `kaf-a` during a test purchase → still completes via `kaf-b`.

## Open questions

1. **Support e-mail**: the site shows `support@kaydyachaanifaydyach.com` (original
   domain), which has **no mail server** — messages don't arrive. Set up e-mail on
   the new domain (Hostinger / Cloudflare Email Routing) and switch the address?
2. Razorpay live keys for go-live: reuse the client's existing live key, or regenerate?
