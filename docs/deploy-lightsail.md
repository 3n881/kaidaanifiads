# Deploying to AWS Lightsail (behind Cloudflare)

Budget target: ₹7,000 / month including Supabase. This setup ≈ ₹3,300 (one server) or ≈ ₹4,900 (two servers).

```
Visitor ─► Cloudflare (cache, SSL, WAF) ─► Lightsail server(s), Mumbai
                                             └─ Caddy :443 (Cloudflare Origin cert)
                                                  ├─ app1  (Next.js container)
                                                  └─ app2  (same image)
                                          ─► Supabase (DB + PDFs)
```

Each server runs **two identical app containers** behind Caddy. Deploys restart them one at a time,
so there is no downtime, and a crashed Node process is covered by the other one.

**Tested locally (2026-09-26):**
- 178 page loads during a rolling deploy → 0 failed.
- Deploying a broken image → deploy stops, only the replaced container is rolled back, 0 failed requests.
- Memory: ~60 MB per app container, ~15 MB for Caddy.

---

## 1. One-time: accounts and secrets

| Where | What |
|---|---|
| Supabase | Upgrade to **Pro**, turn **spend cap on**, note the region |
| Cloudflare | Add the domain (Free plan); **SSL/TLS → Origin Server → Create certificate** (15 years, `kaydyachaanifaydyach.com`, `*.kaydyachaanifaydyach.com`) — save the cert and key |
| Cloudflare | API token with only *Zone → Cache Purge* → `CLOUDFLARE_API_TOKEN`; Zone ID → `CLOUDFLARE_ZONE_ID` |
| GitHub → Settings → Secrets and variables → Actions | **Secrets:** `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (`openssl rand -base64 32`), `LIGHTSAIL_SSH_KEY` (private key of the Lightsail key pair). **Variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `LIGHTSAIL_HOSTS` (space-separated static IPs), and `DEPLOY_ENABLED=true` **last** |
| GitHub → Settings → Developer settings | Classic token with only `read:packages` (servers use it to pull the image) |

## 2. Create the server

1. Lightsail → Create instance → **Mumbai (ap-south-1)**, zone `ap-south-1a` → Linux, **Ubuntu 24.04 LTS** → **2 GB RAM** plan.
2. Attach a **static IP**. Enable **automatic snapshots** (daily).
3. Upload your SSH key pair (the same one used for `LIGHTSAIL_SSH_KEY`).

## 3. Prepare the server

```bash
ssh ubuntu@<static-ip>
curl -fsSL https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/setup-server.sh | bash
exit   # log in again so the docker group applies
```

If the repository is private, the `curl` fails. In that case copy the folder from your laptop with `scp -r deploy ubuntu@<ip>:/tmp/`, then run `bash /tmp/deploy/setup-server.sh` and `cp /tmp/deploy/* /opt/kaf/`.

## 4. Configure the server

```bash
ssh ubuntu@<static-ip>
cd /opt/kaf
nano certs/origin.pem          # paste the Cloudflare Origin certificate
nano certs/origin.key          # paste the private key
chmod 600 certs/origin.key
nano app.env                   # fill from app.env.example — identical on every server
echo <read:packages token> | docker login ghcr.io -u 3n881 --password-stdin
```

## 5. Lock the firewall (from your laptop, AWS CLI configured)

```bash
./deploy/lightsail-firewall.sh <instance-name> <your-ip>/32
```

This allows ports 80 and 443 **only from Cloudflare**, and SSH only from your IP.

## 6. First deploy

Set `DEPLOY_ENABLED=true` in GitHub variables, then **Actions → Deploy → Run workflow**. After that, every push to `main` deploys automatically.

- It builds the image once and tags it with the commit SHA.
- Then it SSHes into each host in `LIGHTSAIL_HOSTS` in turn and runs `deploy.sh`.

To deploy manually on a server:

```bash
IMAGE=ghcr.io/3n881/kaidaanifiads:<sha> /opt/kaf/deploy.sh
```

To roll back, run the same command with the previous SHA (`cat /opt/kaf/.current-image` shows the live one).

## 7. Point Cloudflare at it

1. DNS: `A @ <static-ip>` **proxied** (orange cloud), and `CNAME www @` proxied.
2. SSL/TLS: **Full (strict)**.
3. Apply the Cache/WAF rules from `docs/viral-launch-plan.md` → Phase 5.

**Check it works:**

```bash
curl -sI https://kaydyachaanifaydyach.com/api/health
curl -sI "https://kaydyachaanifaydyach.com/ebooks/<slug>?igsh=a" | grep -i cf-cache-status   # run twice → HIT
curl -s --max-time 5 https://<static-ip>/ -k   # must FAIL (firewall: Cloudflare only)
```

## 8. Monitoring

- Lightsail → Metrics → alarms: CPU > 70 % for 5 min, status check failed.
- Free uptime monitor (e.g. UptimeRobot) on `https://kaydyachaanifaydyach.com/api/health`.
- Logs: `docker compose logs -f app1 app2 | grep -E "\[(checkout|confirm|webhook|download)\]"`.
- Supabase: `select * from funnel_daily;`.

---

## Adding a second server

### Does it work with this code?

Yes. Everything a second server needs is already in place:

| Concern | Status |
|---|---|
| Same build everywhere | CI builds **one** image and deploys it to all hosts |
| Admin forms / Server Actions | Same `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` baked in at build → works on any server |
| Rolling-deploy version skew | `deploymentId` = commit SHA → browsers hard-reload instead of breaking |
| Payments hitting different servers | `markOrderPaid` is an atomic DB update, so confirm on server A plus webhook on server B still marks the order paid exactly once |
| Order/download links | HMAC with the shared `ORDER_ACCESS_SECRET` → valid on every server |
| Admin login | Supabase cookie session, no server memory → works on any server |
| Page cache (ISR) | Per server. After an admin edit the other server can serve the old page for **≤ 5 minutes**. The Cloudflare HTML rule must **respect origin TTL** (`s-maxage=300`), not override to 1 h. The same already applies to the two containers on one server. |

### How

1. Create a second instance the same way, in **another zone** (`ap-south-1b`) so one AWS zone outage doesn't take both down. Repeat steps 3–5 with the **same** `app.env` and certificate.
2. Add its IP to `LIGHTSAIL_HOSTS` (`"<ip1> <ip2>"`). Deploys then roll through server 1, then server 2.
3. Put a load balancer in front. Two choices:

| Load balancer | ≈ ₹/month | Setup change |
|---|---|---|
| **Cloudflare Load Balancing** (recommended) | ~425 (US$5, 2 origins, health checks) | Pool with both IPs, monitor `GET /api/health` expecting 200. **No server changes** — each server keeps Caddy and the Origin cert |
| Lightsail load balancer | ~1,530 (US$18) | The load balancer terminates TLS; Caddy must switch to plain HTTP on port 80 behind it; firewall allows the load balancer |

### What it changes

| | One server (2 containers) | Two servers |
|---|---|---|
| Monthly cost | ≈ ₹3,300 | ≈ ₹4,900 (+ server ₹1,000, snapshots ₹170, Cloudflare LB ₹425) |
| Deploys without downtime | ✅ | ✅ |
| One app process crashes | ✅ other container serves | ✅ |
| **Whole server down / reboot / AWS maintenance / zone outage** | ❌ checkout and downloads stop (cached pages stay up; Razorpay webhooks retry for 24 h) | ✅ the other server takes over automatically |
| Capacity | Far more than needed (~60 MB, <1 % CPU per container under burst) | 2× — not needed for load |
| Extra work | — | Keep `app.env` identical on both; deploys take ~1 min longer |

**Recommendation:** launch on one server. Add the second server about a week before a big paid Reel campaign, when a
server outage would cost the most. Lightsail bills by the hour, so you can delete it after the campaign and only pay
for the weeks it runs.
