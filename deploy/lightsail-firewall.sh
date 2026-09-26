#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Locks a Lightsail instance so HTTP/HTTPS is reachable ONLY from Cloudflare
# (origin protection) and SSH only from your own IP. Run from your laptop
# with the AWS CLI configured:
#
#   ./deploy/lightsail-firewall.sh <instance-name> <your-public-ip>/32 [region]
#
# Re-run whenever Cloudflare publishes new ranges (rare).
# ---------------------------------------------------------------------------
set -euo pipefail

INSTANCE="${1:?instance name}"
SSH_CIDR="${2:?your IP in CIDR form, e.g. 203.0.113.7/32}"
REGION="${3:-ap-south-1}"

v4="$(curl -fsSL https://www.cloudflare.com/ips-v4 | paste -sd, -)"
v6="$(curl -fsSL https://www.cloudflare.com/ips-v6 | paste -sd, -)"

aws lightsail put-instance-public-ports \
  --region "$REGION" \
  --instance-name "$INSTANCE" \
  --port-infos \
    "fromPort=443,toPort=443,protocol=tcp,cidrs=[$v4],ipv6Cidrs=[$v6]" \
    "fromPort=80,toPort=80,protocol=tcp,cidrs=[$v4],ipv6Cidrs=[$v6]" \
    "fromPort=22,toPort=22,protocol=tcp,cidrs=[$SSH_CIDR]"

echo "Firewall updated for $INSTANCE: 80/443 Cloudflare only, 22 from $SSH_CIDR"
