# Deploying to AWS Lightsail — two servers behind Cloudflare

**Decision (2026-09-26):** two always-on Lightsail servers in different Mumbai zones, behind Cloudflare Load Balancing.
Budget: ≈ ₹4,900 / month of the ₹7,000 limit, including Supabase.

**Why two servers:**
- The client posts Reels **2–3 times a week** with millions of views, so we get a traffic peak **~150 times a year**.
- One server already has far more capacity than a peak needs (see "Capacity" below).
- The second server exists so a **server failure during a peak never stops Buy / download**. Losing one peak's sales costs more than the ~₹1,600/month it adds.

```
Visitor ─► Cloudflare (cache, SSL, WAF, Load Balancing)
             ├─► Server A  (Lightsail, ap-south-1a)  Caddy ─► app1 + app2
             └─► Server B  (Lightsail, ap-south-1b)  Caddy ─► app1 + app2
                         both ─► Supabase Pro (DB + PDFs)
```

Four identical app containers in total, across two machines:

| Failure | What happens |
|---|---|
| One app process crashes | The other container on the same server serves |
| A deploy is running | Containers restart one at a time, servers one after another — no gap |
| **A whole server / its zone fails, or AWS maintenance** | Cloudflare's health check fails within ~1 minute, and all traffic moves to the other server |
| Cloudflare cache | Book pages keep being served even if **both** servers are down |

**Tested locally (2026-09-26):**
- Rolling deploy: 178 page loads, 0 failed.
- Broken-image deploy: stopped and rolled back only the replaced container, 0 failed.
- Memory: ~60 MB per app container, ~15 MB for Caddy.

---

## Monthly cost (≈ ₹85 / US$; confirm Mumbai prices in the consoles)

| Item | ≈ US$ | ≈ ₹ |
|---|---|---|
| Lightsail server A — 2 GB RAM, 2 vCPU, static IP, ~3 TB transfer included | 12 | 1,000 |
| Lightsail server B — same | 12 | 1,000 |
| Automatic snapshots (both) | 4 | 340 |
| Cloudflare Free plan + **Load Balancing** add-on (2 origins, health checks) | 5 | 425 |
| Supabase Pro (never pauses, 250 GB egress, daily backups) | 25 | 2,100 |
| **Total** | **~58** | **~4,900** |
| Headroom (Supabase egress overage, bigger plans later) | | ~2,100 |

## Capacity: why 2 GB servers are enough

These are estimates for one 1M-view Reel. Replace them with the client's real link-click numbers when available.

| | Estimate |
|---|---|
| Link taps (0.5–2 %) | 5,000–20,000 visitors, mostly in the first hours |
| Peak visitors | ~20–30 / second |
| Requests at Cloudflare | a few hundred / second — served from cache |
| Buyers (2–5 %) | ~0.5–1 / second at peak |
| Requests reaching the servers | **~5 / second** (checkout, confirm, order page, download) |

One server handles roughly 100× that. Capacity is not the reason for the second server; availability is.

**Watch:** Supabase egress. PDFs download straight from Supabase.
- Example: 5,000 sales/week × 5 MB × 1–2 downloads ≈ 200 GB/month, against 250 GB included.
- Overage is about US$0.09/GB.
- Keep PDFs under 5 MB.

---

## 1. One-time: accounts and secrets

| Where | What |
|---|---|
| Supabase | Upgrade to **Pro**, turn **spend cap on**, note the region (Mumbai ideal) |
| Cloudflare | Add the domain (Free plan). **SSL/TLS → Origin Server → Create certificate** (15 years, `kaydyachaanifaydyach.com`, `*.kaydyachaanifaydyach.com`) — the **same** cert/key goes on both servers |
| Cloudflare | **Traffic → Load Balancing → enable** (US$5/month) |
| Cloudflare | API token with only *Zone → Cache Purge* → `CLOUDFLARE_API_TOKEN`; Zone ID → `CLOUDFLARE_ZONE_ID` |
| GitHub → Settings → Secrets and variables → Actions | **Secrets:** `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (`openssl rand -base64 32`), `LIGHTSAIL_SSH_KEY`, `CRON_SECRET` (`openssl rand -hex 32`, same value as in `app.env`). **Variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `LIGHTSAIL_HOSTS` = `"<ip-A> <ip-B>"`, and `DEPLOY_ENABLED=true` **last** |
| GitHub → Developer settings | Classic token with only `read:packages` (servers pull the image) |

## 2. Create both servers

Do this twice: server **A** in zone `ap-south-1a`, server **B** in `ap-south-1b`.

1. Lightsail → Create instance → **Mumbai** → pick the zone → Linux, **Ubuntu 24.04 LTS** → **2 GB RAM** plan. Names like `kaf-a` and `kaf-b`.
2. Attach a **static IP** to each. Enable **automatic snapshots** on each.
3. Use the same SSH key pair on both (the one stored as `LIGHTSAIL_SSH_KEY`).

## 3. Prepare each server

```bash
ssh ubuntu@<static-ip>
curl -fsSL https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/setup-server.sh | bash
exit   # log in again so the docker group applies
```

If the repository is private, the `curl` fails. In that case copy the folder from your laptop with `scp -r deploy ubuntu@<ip>:/tmp/`, then run `bash /tmp/deploy/setup-server.sh` and `cp /tmp/deploy/* /opt/kaf/`.

## 4. Configure each server (identical on A and B)

```bash
ssh ubuntu@<static-ip>
cd /opt/kaf
nano certs/origin.pem          # Cloudflare Origin certificate
nano certs/origin.key          # its private key
chmod 600 certs/origin.key
nano app.env                   # from app.env.example — MUST be identical on both servers
echo <read:packages token> | docker login ghcr.io -u 3n881 --password-stdin
```

`app.env` must match byte-for-byte on both servers. The critical values are `ORDER_ACCESS_SECRET` (order and download links), `CRON_SECRET`, the Razorpay keys, and the Supabase keys.
Keep a copy in a password manager. When a value changes, update both servers, then redeploy.

## 5. Lock both firewalls (from your laptop, AWS CLI configured)

```bash
./deploy/lightsail-firewall.sh kaf-a <your-ip>/32
./deploy/lightsail-firewall.sh kaf-b <your-ip>/32
```

This allows ports 80 and 443 **only from Cloudflare** (including its load-balancer health checks), and SSH only from your IP.

## 6. First deploy

Set `DEPLOY_ENABLED=true`, then **Actions → Deploy → Run workflow**.

- CI builds **one** image (tag = commit SHA).
- Deploys go to server A (app1, then app2), then to server B.
- If a server fails its health checks, that server rolls back and the workflow stops before touching the next one. The healthy server keeps serving.

To deploy manually on one server:

```bash
IMAGE=ghcr.io/3n881/kaidaanifiads:<sha> /opt/kaf/deploy.sh
```

To roll back, run the same command with the previous SHA (`cat /opt/kaf/.current-image`), on **both** servers.

## 7. Cloudflare: load balancer + DNS

1. **Monitor:** Traffic → Load Balancing → Manage Monitors → Create
   - Type HTTPS, path `/api/health`, port 443, expected code `200`
   - Header `Host: kaydyachaanifaydyach.com`
   - Interval 60 s, retries 2, timeout 5 s
2. **Pool:** `kaf-mumbai`
   - Origins `kaf-a` → `<ip-A>` and `kaf-b` → `<ip-B>`, weight 1 each
   - Attach the monitor. Health-check region: *India* / *Asia*
   - Notification e-mail on unhealthy
3. **Load balancer:** hostname `kaydyachaanifaydyach.com`
   - Proxied (orange cloud), pool `kaf-mumbai`, steering *Off* (failover) or *Random*
   - Session affinity **off** (the app is stateless)
4. Repeat for `www.kaydyachaanifaydyach.com`, or add `CNAME www @` proxied.
5. SSL/TLS: **Full (strict)**.
6. Apply the Cache/WAF rules from `docs/viral-launch-plan.md` → Phase 5. The HTML rule must **respect origin TTL**.

**Check it works:**

```bash
curl -s https://kaydyachaanifaydyach.com/api/health            # {"ok":true,"deployment":"<sha>"}
curl -sI "https://kaydyachaanifaydyach.com/ebooks/<slug>?igsh=a" | grep -i cf-cache-status   # twice → HIT
curl -sk --max-time 5 https://<ip-A>/ ; echo "exit=$?"      # must time out (firewall)
```

**Failover drill (do once before the next Reel):**
1. On server A run `docker compose -f /opt/kaf/docker-compose.yml stop`.
2. Within ~2 minutes the Cloudflare pool shows A unhealthy, and the site plus a test checkout still work (served by B).
3. Run `docker compose -f /opt/kaf/docker-compose.yml start` and confirm A turns healthy again.

## 8. Monitoring

- **Reconciliation:** Actions → "Reconcile payments" runs every 10 minutes. A red run means the site or Supabase was unreachable. Server logs show `[reconcile] recovered paid order` whenever it rescued a payment.

- Cloudflare → Load Balancing → pool health, plus the e-mail alert when a server drops.
- Lightsail → Metrics → alarms on each server: CPU > 70 % for 5 min, status check failed.
- Free uptime monitor (e.g. UptimeRobot) on `https://kaydyachaanifaydyach.com/api/health`.
- Logs per server: `docker compose logs -f app1 app2 | grep -E "\[(checkout|confirm|webhook|download)\]"`.
- Sales funnel: `select * from funnel_daily;` in Supabase.

## 9. Routine per Reel (2–3× a week)

1. **Before the post:** no deploys in the hour before the creator posts (deploys are safe, but keep the peak boring).
2. **During the peak:**
   - Watch the Cloudflare cache HIT ratio (should stay > 95 %) and the pool health.
   - Check `funnel_daily` for checkouts vs paid vs downloaded.
3. **After the peak:** `select * from orders where status='paid' and download_count=0 and paid_at < now() - interval '15 minutes';` and follow up on WhatsApp.

## How the code supports two servers

| Concern | How it's handled |
|---|---|
| Same build everywhere | CI builds one image and deploys it to all hosts |
| Admin forms / Server Actions | Same `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` baked in at build |
| Rolling-deploy version skew | `deploymentId` = commit SHA → browsers hard-reload instead of breaking |
| Confirm on A + webhook on B | `markOrderPaid` is an atomic DB update → paid exactly once |
| Order / download links | HMAC with the shared `ORDER_ACCESS_SECRET` → valid on either server |
| Admin login | Supabase cookie session, nothing in server memory |
| Page cache (ISR) | Per container. After an admin edit, other containers refresh within ≤ 5 min. The Cloudflare HTML rule respects origin TTL, so the edge never holds a stale copy longer than that. |
| Single points left | **Supabase** (managed, Pro) and **Razorpay**. Cached pages survive both. Checkout fails safely with a "try again" message, and payments made just before an outage are recovered by webhook redelivery, the order page, and the 10-minute reconciliation sweep. See `docs/viral-launch-plan.md` → Phase 9. |
