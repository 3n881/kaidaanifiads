#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Zero-downtime deploy on ONE server. Run on the server (GitHub Actions does
# this over SSH for each server, one after another):
#
#   IMAGE=ghcr.io/3n881/kaidaanifiads:<sha> /opt/kaf/deploy.sh
#
# Restarts app1, waits until healthy, then app2 — Caddy keeps sending traffic
# to whichever container is up, so checkout never sees a gap.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")"
: "${IMAGE:?set IMAGE=ghcr.io/<owner>/<repo>:<tag>}"
export IMAGE

wait_healthy() {
  local svc="$1" id status
  id="$(docker compose ps -q "$svc")"
  for _ in $(seq 1 60); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo starting)"
    [ "$status" = "healthy" ] && { echo "  $svc healthy"; return 0; }
    [ "$status" = "unhealthy" ] && break
    sleep 2
  done
  echo "  $svc did not become healthy" >&2
  return 1
}

# Image that is live right now (written by the last successful deploy).
previous="$(cat .current-image 2>/dev/null || true)"

updated=()

# Put back only the containers this run replaced, one at a time, so the
# untouched container keeps serving throughout.
rollback() {
  if [ -n "$previous" ] && [ "$previous" != "$IMAGE" ]; then
    echo "Rolling back ${updated[*]} to $previous" >&2
    for svc in "${updated[@]}"; do
      IMAGE="$previous" docker compose up -d --no-deps --force-recreate "$svc"
      IMAGE="$previous" wait_healthy "$svc" || true
    done
  fi
  exit 1
}

echo "Pulling $IMAGE"
docker compose pull app1 app2

for svc in app1 app2; do
  echo "Updating $svc"
  updated+=("$svc")
  docker compose up -d --no-deps --force-recreate "$svc"
  wait_healthy "$svc" || rollback
done

# Caddy only needs a restart when the Caddyfile changed; reload is graceful.
docker compose up -d caddy
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || true

echo "$IMAGE" > .current-image

# Clear the PAGES from Cloudflare's cache so visitors get HTML from this release.
# Images (/media/…) and build files (/_next/static/…) are NOT cleared: their
# names change whenever their content does, so the cached copies stay correct —
# and an empty image cache made the first visitors (and PageSpeed) slow after
# every deploy (11 Oct). Old /_next/static files staying cached also helps
# browsers still running the previous release. Cloudflare Free allows prefix
# purge, max 30 entries per call.
env_val() { grep -m1 "^$1=" app.env | cut -d= -f2- | tr -d "\"'\r" || true; }
zone="$(env_val CLOUDFLARE_ZONE_ID)"
token="$(env_val CLOUDFLARE_API_TOKEN)"
site="$(env_val NEXT_PUBLIC_SITE_URL)"
host="${site#https://}"; host="${host#http://}"; host="${host%%/*}"
host="${host:-kaydyachaanifayddyacha.com}"
host="${host#www.}"

purge() { # $1 = JSON body
  curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/$zone/purge_cache" \
    -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    --data "$1" >/dev/null
}

if [ -n "$zone" ] && [ -n "$token" ]; then
  # Every HTML route (and its ?_rsc= variants) except the home page, on both hosts.
  pages="ebooks combos about contact terms privacy-policy refund-policy shipping-policy cancellation-policy data-deletion site-index my-books sitemap.xml robots.txt manifest.webmanifest"
  prefixes=""
  for h in "$host" "www.$host"; do
    for p in $pages; do prefixes="$prefixes\"$h/$p\","; done
  done
  # The home page alone (a prefix on "/" would clear everything).
  files="\"https://$host/\",\"https://www.$host/\""
  if purge "{\"prefixes\":[${prefixes%,}]}" && purge "{\"files\":[$files]}"; then
    echo "Cloudflare: pages cleared (images and build files kept)"
  else
    echo "WARNING: Cloudflare page purge failed - pages refresh within 5 min, /about etc. may stay old" >&2
  fi
fi

# Warm Cloudflare with this release: ask once for the main pages, every build
# file they use (CSS, JS, and the fonts inside the CSS) and the book pages.
# Each release has new build-file URLs, so otherwise the first visitor after a
# deploy (often PageSpeed) waited 1-2 s for the CSS and font (11 Oct, score 90).
# With Smart Tiered Cache on (11 Oct) the warm copies sit in Cloudflare's
# Mumbai/Singapore tier, which every other Cloudflare location asks before us.
warm() { curl -s -m 15 -o /dev/null --compressed "https://$host$1" || true; }
warm_pages="/ /ebooks /combos"
assets=""
for p in $warm_pages; do
  html="$(curl -s -m 15 --compressed "https://$host$p" || true)"
  assets="$assets $(printf '%s' "$html" | grep -oE '/_next/static/[^"'"'"' )\\]+' || true)"
  warm_pages="$warm_pages $(printf '%s' "$html" | grep -oE 'href="/ebooks/[a-z0-9-]+"' | cut -d'"' -f2 || true)"
done
for css in $(printf '%s\n' $assets | grep '\.css' | sort -u); do
  dir="${css%/*}"
  fonts="$(curl -s -m 15 --compressed "https://$host$css" | grep -oE 'url\([^)]+\)' | sed -E 's/^url\(["'"'"']?//; s/["'"'"']?\)$//' || true)"
  for f in $fonts; do
    case "$f" in
      ../*) assets="$assets ${dir%/*}/${f#../}" ;;
      /*) assets="$assets $f" ;;
    esac
  done
done
n=0
for u in $(printf '%s\n' $assets $warm_pages | sort -u); do warm "$u"; n=$((n + 1)); done
echo "Cloudflare: warmed $n pages and build files"

docker image prune -f >/dev/null
echo "Deployed $IMAGE"
