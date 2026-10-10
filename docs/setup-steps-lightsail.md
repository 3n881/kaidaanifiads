# Lightsail setup — step by step (with fixes for common errors)

> Written 2026-10-10. **This is the path we're on:** AWS Lightsail `$12` (2 GB / 2 vCPU) in
> Mumbai — AWS lifted the plan limit on 2026-10-10 and instance `kaf-a` is created. (EC2
> alternative, not used: `docs/setup-steps-ec2.md`.)
> Tick each box as you go. If a step fails, look at **"If it fails"** under that step, then tell
> Claude the step number and the exact error text (or a screenshot).
> Background: `docs/go-live-plan.md`. Never paste keys, passwords or tokens into chat or here.

## Already done

- [x] Code on GitHub (`main`): domain, image caching, WhatsApp, firewall scripts, deploy that
      opens SSH only while deploying (EC2 + Lightsail).
- [x] Cloudflare: `kaydyachaanifayddyacha.com` active, SSL Full (strict), Origin certificate
      (`origin.pem` + `origin.key` on your laptop), Cache Purge token + Zone ID (in `.env.mumbai`).
- [x] Supabase moved to **Mumbai** (project `ntqwvfksdqdyoyknkprh`), copied and checked.
- [x] Lightsail instance **`kaf-a`** (Mumbai `ap-south-1a`, Ubuntu 24.04, $12 dual-stack),
      key pair **`kaf-key`** (`kaf-key.pem`), static IP **`kaf-a-ip`**, automatic snapshots.

## Values to note (not secret)

| What | Value |
|---|---|
| Static IP of `kaf-a` | |
| AWS account ID (12 digits, top-right menu) | |
| Your laptop's public IP (checkip.amazonaws.com) | |

Secrets stay only in their files / GitHub secrets: `kaf-key.pem`, `origin.key`, `.env.mumbai`,
the GitHub `read:packages` token, the `github-deploy` access key.

---

## Step 1 — GitHub variables + package token (5 min)

GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEW_SUPABASE_URL` from `.env.mumbai` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEW_SUPABASE_ANON_KEY` from `.env.mumbai` |
| `NEXT_PUBLIC_SITE_URL` | `https://kaydyachaanifayddyacha.com` (the main domain — no staging address) |
| `NEXT_PUBLIC_MEDIA_PROXY` | `true` |

- [ ] 4 variables added (**not** `DEPLOY_ENABLED` yet — Step 7).
- [ ] GitHub profile → **Settings → Developer settings → Personal access tokens → Tokens
      (classic) → Generate new token (classic)** → only **`read:packages`**, *No expiration* →
      save the token (Step 6).

**If it fails:** no spaces/quotes in values; the URL must be the **Mumbai** one (`https://ntqwvfks…`).

## Step 2 — Supabase URL settings (2 min)

Mumbai project → **Authentication → URL Configuration**:

- [ ] **Site URL**: `https://kaydyachaanifayddyacha.com`
- [ ] **Redirect URLs** (all three): `https://kaydyachaanifayddyacha.com/**`,
      `https://www.kaydyachaanifayddyacha.com/**`, `https://kaidyachaanifaidyacha-28da.replov.com/**`

## Step 3 — Server ✅ (created 2026-10-10)

- [x] Instance `kaf-a`, key `kaf-key`, static IP `kaf-a-ip`, automatic snapshots.
- [ ] Check: Lightsail → `kaf-a` → **Networking** shows the static IP attached; **Snapshots** →
      Automatic snapshots **Enabled**.

## Step 4 — Firewall ✅ (done 2026-10-10, verified: SSH open for the admin IP only, 80/443 Cloudflare only)

- [x] On your **laptop**, open https://checkip.amazonaws.com → note your IP.
- [x] AWS console (any page) → **`>_` CloudShell** icon in the top bar, region **Mumbai**.
- [x] Paste (replace the IP):
      ```bash
      curl -fsSLO https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/lightsail-firewall.sh && bash lightsail-firewall.sh kaf-a YOUR.LAPTOP.IP/32 ap-south-1
      ```
- [x] It prints `Firewall updated for kaf-a: 80/443 Cloudflare only, 22 from …`. In Lightsail →
      `kaf-a` → **Networking**, the IPv4/IPv6 firewall now lists HTTPS + HTTP (Cloudflare ranges)
      and SSH (your IP only).

**If it fails:**
- `NotFoundException … kaf-a` → CloudShell region isn't Mumbai, or the instance name differs.
- `InvalidInputException … cidr` → the IP must end with `/32`.
- Lightsail's browser **"Connect using SSH"** button stops working after this — expected (SSH
  is only open to your laptop). Use Step 6.2 instead.
- Later, SSH from your laptop times out → your home IP changed: re-run this step.

## Step 5 — GitHub deploy access (10 min)

- [ ] **5.1** **IAM → Users → Create user** → `github-deploy` → no console access → Next.
- [ ] **5.2** **Attach policies directly → Create policy** → **JSON** → paste:
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Action": ["lightsail:GetInstancePortStates", "lightsail:PutInstancePublicPorts"],
          "Resource": "*"
        }]
      }
      ```
      → name **`kaf-github-deploy-ssh`** → Create → back in the first tab refresh, tick it →
      **Create user**. (It can only read/set Lightsail firewall ports — nothing else.)
- [ ] **5.3** User `github-deploy` → **Security credentials → Create access key** →
      *Application running outside AWS* → copy both values.
- [ ] **5.4** GitHub → Settings → Secrets and variables → Actions:
  - **Secrets:** `AWS_DEPLOY_ACCESS_KEY_ID`, `AWS_DEPLOY_SECRET_ACCESS_KEY`, and
    `DEPLOY_SSH_KEY` = everything in `kaf-key.pem` (Notepad), from `-----BEGIN` to `-----END … KEY-----`
  - **Variables:** `DEPLOY_HOSTS` = the static IP, `DEPLOY_LIGHTSAIL_INSTANCE` = `kaf-a`
    (do **not** set `DEPLOY_SG_ID` — that's for EC2)

**If it fails:** if the deploy later says *AccessDenied … lightsail:PutInstancePublicPorts*, the
policy isn't attached to `github-deploy`.

---

## Step 6 — Set up the server ✅ (done by Claude 2026-10-10 from the admin laptop)

> Done: Docker 29.9 + Compose, 1 GB swap, automatic updates, `/opt/kaf` files, Origin
> certificate (valid to 2041, key matches), `app.env` (all required values, `chmod 600`), GHCR
> login. Local copies used: `C:\Users\shivr\kaf-keys` (key, certs, `app.env`, `ghcr-token.txt`).
> `ORDER_ACCESS_SECRET` was **generated new** (Replov had none) — never change it after real sales.

Windows **PowerShell**, in the folder with `kaf-key.pem`, `origin.pem`, `origin.key`.

- [x] **6.1 Lock the key file:**
      ```powershell
      icacls .\kaf-key.pem /inheritance:r
      icacls .\kaf-key.pem /grant:r "$($env:USERNAME):(R)"
      ```
- [x] **6.2 Connect:** `ssh -i .\kaf-key.pem ubuntu@STATIC_IP` → type `yes` the first time →
      prompt `ubuntu@ip-…:~$`.
- [x] **6.3 Install** (on the server), then reconnect (6.2):
      ```bash
      curl -fsSL https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/setup-server.sh | bash
      exit
      ```
- [x] **6.4 Origin certificate** (laptop):
      `scp -i .\kaf-key.pem .\origin.pem .\origin.key ubuntu@STATIC_IP:/opt/kaf/certs/`
      then on the server: `chmod 600 /opt/kaf/certs/origin.key`
- [x] **6.5 Settings:** on the server `nano /opt/kaf/app.env` (Ctrl+O, Enter, Ctrl+X) →
      `chmod 600 /opt/kaf/app.env`

      | Setting | Value / where from |
      |---|---|
      | `NEXT_PUBLIC_SITE_URL` | `https://kaydyachaanifayddyacha.com` |
      | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Mumbai values from `.env.mumbai` (`NEW_…`) |
      | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **test** keys (as on Replov) |
      | `RAZORPAY_WEBHOOK_SECRET` | a **new** secret, also entered in Razorpay's test webhook (Step 7) |
      | `ORDER_ACCESS_SECRET` | **generated new 2026-10-10** (Replov had none) — never change after real sales |
      | `CRON_SECRET` | same as on Replov |
      | `INTERAKT_*`, `AUTO_WHATSAPP_ON_PAYMENT`, `PAYMENT_REMINDER_DELAY_MINUTES` | same as on Replov (template names pre-filled) |
      | `ADMIN_EMAILS` | same as on Replov |
      | `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | from `.env.mumbai` |
      | `CHECKOUT_DEMO_MODE` | `false` |

- [x] **6.6 Image login** (paste the `read:packages` token as the password; nothing shows):
      `docker login ghcr.io -u 3n881` → `Login Succeeded`.

**If it fails:**
- `UNPROTECTED PRIVATE KEY FILE` → redo 6.1.
- `Permission denied (publickey)` → must be `ubuntu@` with `kaf-key.pem` (the key chosen when
  creating `kaf-a`).
- `Connection timed out` → Step 4 (IP changed?) or wrong IP.
- `scp … Permission denied` → do 6.3 first (it creates `/opt/kaf`).
- `docker: permission denied` → reconnect after 6.3.
- `docker login … unauthorized` → token lacks `read:packages` or username typo.

## Step 7 — First deploy on the main domain (together with Claude) — ✅ live 2026-10-10

> Live check 10-10: health ✅, 9 books + covers ✅, sitemap uses the real domain ✅, `/media` cached by
> Cloudflare (MISS → HIT, 1-year immutable) ✅, `www` + `http→https` ✅, origin not reachable directly ✅.
> Pages 0.1–0.4 s through Cloudflare Mumbai. Took 4 deploy runs — see go-live plan problems 16–18.

> **No staging address** (decision 2026-10-10): nothing is live on the domain yet, so the site is
> deployed straight to `kaydyachaanifayddyacha.com` and tested there with Razorpay **test** keys
> **before** anyone is told about it. Going public = switching to live keys (go-live plan Stage 6).

- [x] GitHub variable **`NEXT_PUBLIC_SITE_URL`** = `https://kaydyachaanifayddyacha.com` (change it if
      it still says `new.`). The server's `app.env` already has it.
- [x] Cloudflare → **DNS → Records**: **delete** the Hostinger parking records for `@` / `www`
      (any `A`, `AAAA` or `CNAME` on the root or `www`), then **Add record**:
      - Type `A`, Name `@`, IPv4 = the static IP of `kaf-a-ip` (Lightsail → Networking), **Proxied** → Save
      - Type `CNAME`, Name `www`, Target `kaydyachaanifayddyacha.com`, **Proxied** → Save
- [x] GitHub variable **`DEPLOY_ENABLED`** = `true` → **Actions → Deploy → Run workflow** (`main`).
      Steps should go green: build → "Open SSH for this runner only (Lightsail firewall)" →
      "Roll out" → "Close SSH again (Lightsail)".
- [x] Claude checks `https://kaydyachaanifayddyacha.com/api/health`, pages, `/media` images, `www`
      redirect/serving, and that the server can't be reached directly.
- [ ] Rest of go-live-plan **Stage 3** (Cloudflare cache/WAF rules incl. `media`, Razorpay **test**
      webhook `https://kaydyachaanifayddyacha.com/api/razorpay/webhook` with the
      `RAZORPAY_WEBHOOK_SECRET` from `app.env`, cron-job.org URL, UptimeRobot) → **Stage 4** tests.

**If it fails:**
- *Open SSH … AccessDenied* → Step 5.2 policy not attached.
- *Roll out … Permission denied (publickey)* → `DEPLOY_SSH_KEY` must be the whole `.pem`.
- *Roll out … Connection timed out* → `DEPLOY_HOSTS` wrong, or `DEPLOY_LIGHTSAIL_INSTANCE` isn't `kaf-a`.
- *pull access denied / unauthorized* → Step 6.6.
- Container keeps restarting → on the server `cd /opt/kaf && docker compose logs --tail 100`
  (check for secrets before sharing).
- Cloudflare **526** → origin certificate (6.4) or SSL mode not *Full (strict)*.
- **522/521** → `docker compose ps` (Caddy running?) or firewall (re-run Step 4).
