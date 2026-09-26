#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-time setup of a fresh Lightsail Ubuntu 24.04 instance. Run as the
# default `ubuntu` user:
#
#   curl -fsSL https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy/setup-server.sh | bash
#   (or scp the deploy/ folder and run ./setup-server.sh)
#
# Afterwards (see docs/deploy-lightsail.md):
#   1. put the Cloudflare Origin CA cert/key in /opt/kaf/certs/origin.{pem,key}
#   2. fill /opt/kaf/app.env from app.env.example
#   3. docker login ghcr.io (read:packages token)
# ---------------------------------------------------------------------------
set -euo pipefail

echo "== Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "== 1 GB swap (keeps a 2 GB box alive during memory spikes)"
if ! sudo swapon --show | grep -q /swapfile; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== Automatic security updates"
sudo apt-get update -y
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== App directory"
sudo mkdir -p /opt/kaf/certs
sudo chown -R "$USER":"$USER" /opt/kaf
chmod 700 /opt/kaf/certs

REPO_RAW="https://raw.githubusercontent.com/3n881/kaidaanifiads/main/deploy"
for f in docker-compose.yml Caddyfile deploy.sh app.env.example; do
  [ -f "/opt/kaf/$f" ] || curl -fsSL "$REPO_RAW/$f" -o "/opt/kaf/$f" || true
done
chmod +x /opt/kaf/deploy.sh 2>/dev/null || true
[ -f /opt/kaf/app.env ] || { cp /opt/kaf/app.env.example /opt/kaf/app.env 2>/dev/null || true; }
chmod 600 /opt/kaf/app.env 2>/dev/null || true

echo
echo "Done. Log out and back in (docker group), then follow docs/deploy-lightsail.md step 4."
