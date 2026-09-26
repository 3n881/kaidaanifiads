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
docker image prune -f >/dev/null
echo "Deployed $IMAGE"
