# EC2 setup — step by step (with fixes for common errors)

> Written 2026-10-09. The exact clicks and commands to put the site on one AWS EC2
> `t3.small` server in Mumbai behind Cloudflare. Tick each box as you go. If a step
> fails, look at **"If it fails"** under that step, then tell Claude the step number and
> the exact error text (or a screenshot).
>
> Background and the why: `docs/go-live-plan.md` (Stages 1–3). Never paste keys, passwords
> or tokens into chat or into this file.

## Already done (2026-10-09)

- [x] Code on GitHub (`main`): domain, image caching, WhatsApp, EC2 firewall script, deploy fix.
- [x] Cloudflare: `kaydyachaanifayddyacha.com` active, SSL Full (strict), Origin certificate
      (`origin.pem` + `origin.key` on your laptop), Cache Purge token + Zone ID (in `.env.mumbai`).
- [x] Supabase moved to **Mumbai** (project `ntqwvfksdqdyoyknkprh`), everything copied and checked.

## Values to note (not secret — fill in as you go)

| What | Value |
|---|---|
| AWS account ID (12 digits, top-right menu) | |
| Security group ID (`sg-…`) | |
| Elastic IP of `kaf-a` | |
| Your laptop's public IP (checkip.amazonaws.com) | |

Secret things stay **only** in their files / GitHub secrets: `kaf-key.pem`, `origin.key`,
`.env.mumbai`, the GitHub `read:packages` token, the `github-deploy` access key.

---

## Step 1 — GitHub variables + package token (5 min)

GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEW_SUPABASE_URL` from `.env.mumbai` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEW_SUPABASE_ANON_KEY` from `.env.mumbai` |
| `NEXT_PUBLIC_SITE_URL` | `https://new.kaydyachaanifayddyacha.com` |
| `NEXT_PUBLIC_MEDIA_PROXY` | `true` |

- [ ] 4 variables added (**not** `DEPLOY_ENABLED` yet — that's Step 7).
- [ ] Your GitHub profile → **Settings → Developer settings → Personal access tokens →
      Tokens (classic) → Generate new token (classic)** → tick only **`read:packages`**,
      expiration *No expiration* → Generate → save the token (needed in Step 6).

**If it fails:** values must have no spaces/quotes. The URL must be the **Mumbai** one
(`https://ntqwvfks…supabase.co`), not Tokyo.

## Step 2 — Supabase URL settings (2 min)

Mumbai project → **Authentication → URL Configuration**:

- [ ] **Site URL**: `https://kaydyachaanifayddyacha.com`
- [ ] **Redirect URLs** (add all three):
      `https://kaydyachaanifayddyacha.com/**`
      `https://new.kaydyachaanifayddyacha.com/**`
      `https://kaidyachaanifaidyacha-28da.replov.com/**`

**If it fails:** make sure you're in the **Mumbai** project (`ntqwvfks…`), not the Tokyo one.

## Step 3 — Create the server (15 min)

AWS console → region (top right) **Asia Pacific (Mumbai) ap-south-1** → **EC2**.

- [ ] **3.1 Security group:** left menu **Network & Security → Security Groups → Create
      security group** → name `kaf-web`, description `kaf web server`, VPC: default →
      **delete any inbound rules** (leave outbound as is) → **Create**. Note the **ID** (`sg-…`).
- [ ] **3.2 Launch the instance:** **Instances → Launch instances**
  - Name: **`kaf-a`**
  - Application and OS image: **Ubuntu** → **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type**,
    architecture **64-bit (x86)**
  - Instance type: **`t3.small`**
  - Key pair: **Create new key pair** → name `kaf-key`, type **RSA**, format **.pem** → it
    downloads **once** — keep it with `origin.pem`/`origin.key`
  - Network settings → **Edit** → Firewall: **Select existing security group** → `kaf-web`;
    Auto-assign public IP: Enable
  - Configure storage: **30 GiB, gp3**
  - **Launch instance**
- [ ] **3.3 Elastic IP:** **Network & Security → Elastic IPs → Allocate Elastic IP address →
      Allocate** → select it → **Actions → Associate Elastic IP address** → Instance: `kaf-a`
      → Associate. Note the IP.
- [ ] **3.4 Daily backups:** **Elastic Block Store → Lifecycle Manager → Create lifecycle
      policy** → *EBS snapshot policy* → Target resource types: **Instance** → Target tags:
      `Name` = `kaf-a` → Schedule: every **24 hours**, retain **7** → Create policy.

**If it fails:**
- *"The instance type t3.small is not supported / not eligible"* or a Free-Plan message →
  AWS **Billing → Account plan → Upgrade to Paid plan** (keeps remaining credits), then retry.
  If it says a **limit/quota**: open a support case like problem 8 in the go-live plan, but for
  EC2 `t3.small` in ap-south-1.
- *"vCPU limit exceeded"* → Service Quotas → EC2 → *Running On-Demand Standard instances* →
  request 4.
- Key pair file didn't download → delete the key pair, create a new one before launching.
- Can't find Lifecycle Manager → it's under **Elastic Block Store** in the EC2 left menu.

## Step 4 — Firewall (3 min)

- [ ] On your **laptop**, open https://checkip.amazonaws.com → note your IP.
- [ ] In the AWS console click **`>_` (CloudShell)** in the top bar (region still **Mumbai**).
- [ ] Paste (replace both values):
      ```bash
      curl -fsSLO https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/ec2-firewall.sh && bash ec2-firewall.sh sg-XXXXXXXX YOUR.LAPTOP.IP/32
      ```
- [ ] It ends with a table: ports **443** and **80** with 15 IPv4 + 7 IPv6 ranges each, port
      **22** with 1 IPv4.

**If it fails:**
- `InvalidGroup.NotFound` → wrong `sg-…` or CloudShell is in another region (switch to Mumbai).
- `InvalidParameterValue … CIDR` → the IP must end with `/32`, e.g. `49.36.12.34/32`.
- `RulesPerSecurityGroupLimitExceeded` → tell Claude (Cloudflare added ranges; fix is easy).
- Later, SSH from your laptop times out → your home IP changed: re-run this step.

## Step 5 — GitHub deploy access (10 min)

- [ ] **5.1** **IAM → Users → Create user** → name `github-deploy` → *do not* give console
      access → Next.
- [ ] **5.2** Permissions: **Attach policies directly → Create policy** (opens a new tab) →
      **JSON** → paste, replacing `ACCOUNT_ID` (12 digits) and `SG_ID` (`sg-…`):
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Action": ["ec2:AuthorizeSecurityGroupIngress", "ec2:RevokeSecurityGroupIngress"],
          "Resource": "arn:aws:ec2:ap-south-1:ACCOUNT_ID:security-group/SG_ID"
        }]
      }
      ```
      → Next → name **`kaf-github-deploy-ssh`** → Create policy → back in the first tab
      refresh, tick it → Next → **Create user**.
- [ ] **5.3** Open user `github-deploy` → **Security credentials → Create access key** →
      *Application running outside AWS* → Create → copy **Access key** and **Secret access key**.
- [ ] **5.4** GitHub → Settings → Secrets and variables → Actions:
  - **Secrets** (New repository secret):
    - `AWS_DEPLOY_ACCESS_KEY_ID` = the access key
    - `AWS_DEPLOY_SECRET_ACCESS_KEY` = the secret access key
    - `DEPLOY_SSH_KEY` = open `kaf-key.pem` in Notepad → copy **everything**, from
      `-----BEGIN RSA PRIVATE KEY-----` to `-----END RSA PRIVATE KEY-----`
  - **Variables**:
    - `DEPLOY_HOSTS` = the Elastic IP
    - `DEPLOY_SG_ID` = the `sg-…`

**If it fails:** the policy JSON must have no `ACCOUNT_ID`/`SG_ID` placeholders left; the
account ID has no dashes. If the deploy later says *AccessDenied … AuthorizeSecurityGroupIngress*,
the policy's ARN doesn't match the group — check both values.

---

## Step 6 — Set up the server (together with Claude, ~30 min)

Send Claude the Elastic IP first. Commands for **Windows PowerShell**, in the folder that holds
`kaf-key.pem`, `origin.pem`, `origin.key`.

- [ ] **6.1 Lock the key file** (SSH refuses keys other users can read):
      ```powershell
      icacls .\kaf-key.pem /inheritance:r
      icacls .\kaf-key.pem /grant:r "$($env:USERNAME):(R)"
      ```
- [ ] **6.2 Connect:**
      ```powershell
      ssh -i .\kaf-key.pem ubuntu@ELASTIC_IP
      ```
      Type `yes` the first time. Prompt should become `ubuntu@ip-…:~$`.
- [ ] **6.3 Install** (on the server):
      ```bash
      curl -fsSL https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/setup-server.sh | bash
      exit
      ```
      Then connect again (6.2) so the Docker group applies.
- [ ] **6.4 Copy the Origin certificate** (on the laptop, PowerShell):
      ```powershell
      scp -i .\kaf-key.pem .\origin.pem .\origin.key ubuntu@ELASTIC_IP:/opt/kaf/certs/
      ```
      then on the server: `chmod 600 /opt/kaf/certs/origin.key`
- [ ] **6.5 Settings file** (on the server): `nano /opt/kaf/app.env` → fill in (Ctrl+O, Enter,
      Ctrl+X to save) → `chmod 600 /opt/kaf/app.env`

      | Setting | Value / where from |
      |---|---|
      | `NEXT_PUBLIC_SITE_URL` | `https://new.kaydyachaanifayddyacha.com` (staging) |
      | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Mumbai values from `.env.mumbai` (`NEW_…`) |
      | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **test** keys (as on Replov) |
      | `RAZORPAY_WEBHOOK_SECRET` | a **new** secret you'll also enter in Razorpay's test webhook (Step 7) |
      | `ORDER_ACCESS_SECRET`, `CRON_SECRET` | **same values as on Replov** |
      | `INTERAKT_*`, `AUTO_WHATSAPP_ON_PAYMENT`, `PAYMENT_REMINDER_DELAY_MINUTES` | same as on Replov (template names are pre-filled) |
      | `ADMIN_EMAILS` | same as on Replov |
      | `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | from `.env.mumbai` |
      | `CHECKOUT_DEMO_MODE` | `false` |

- [ ] **6.6 Image login** (on the server; paste the `read:packages` token when it asks for a
      password — nothing shows while typing):
      ```bash
      docker login ghcr.io -u 3n881
      ```
      Expect `Login Succeeded`.

**If it fails:**
- `UNPROTECTED PRIVATE KEY FILE` → redo 6.1.
- `Permission denied (publickey)` → wrong key file or user: must be `ubuntu@` and `kaf-key.pem`.
- `Connection timed out` → Step 4 (your IP changed?) or wrong IP.
- `scp: /opt/kaf/certs/...: Permission denied` → run 6.3 first (it creates `/opt/kaf`).
- `docker: permission denied` → you didn't reconnect after 6.3.
- `docker login … unauthorized` → token missing `read:packages`, or a typo in the username.

## Step 7 — First deploy on staging (together with Claude)

- [ ] GitHub variable **`DEPLOY_ENABLED`** = `true` → **Actions → Deploy → Run workflow** on `main`.
      Watch it: *build* (~5–10 min) → *deploy*: "Open SSH for this runner only" → "Roll out" →
      "Close SSH again", all green.
- [ ] Cloudflare → **DNS → Add record**: Type `A`, Name `new`, IPv4 = Elastic IP,
      **Proxied (orange cloud)** → Save.
- [ ] Claude checks: `https://new.kaydyachaanifayddyacha.com/api/health`, pages, images via
      `/media`, that the server is unreachable directly (firewall).
- [ ] Then the rest of go-live-plan **Stage 3** (Cloudflare cache/WAF rules incl. `media`, Razorpay
      **test** webhook to `https://new.kaydyachaanifayddyacha.com/api/razorpay/webhook`,
      cron-job.org URL, UptimeRobot) → **Stage 4** tests.

**If it fails:**
- *Open SSH … AccessDenied* → Step 5.2 policy ARN (account ID / sg ID).
- *Roll out … Permission denied (publickey)* → `DEPLOY_SSH_KEY` must be the **whole** `.pem`
  including the BEGIN/END lines.
- *Roll out … Connection timed out* → `DEPLOY_HOSTS` / `DEPLOY_SG_ID` wrong, or the group isn't
  attached to the instance.
- *deploy.sh … unauthorized / pull access denied* → Step 6.6 on the server.
- Health check fails / container restarts → on the server: `cd /opt/kaf && docker compose logs --tail 100`
  and send Claude the output (it never prints secrets, but check before sharing).
- Site shows **526** in Cloudflare → origin certificate missing/wrong at `/opt/kaf/certs/`
  (Step 6.4) or SSL mode isn't *Full (strict)*.
- **522/521** → Caddy not running (`docker compose ps`) or the firewall blocks Cloudflare (re-run Step 4).
