#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Locks an EC2 security group so HTTP/HTTPS is reachable ONLY from Cloudflare
# (origin protection) and SSH only from your own IP. GitHub's deploy opens SSH
# for itself only while it deploys (.github/workflows/deploy.yml).
# Run from your laptop with the AWS CLI configured (aws configure):
#
#   ./deploy/ec2-firewall.sh <security-group-id> <your-public-ip>/32 [region]
#
# It replaces ALL inbound rules of that group. Re-run when your IP changes or
# Cloudflare publishes new ranges (rare).
# ---------------------------------------------------------------------------
set -euo pipefail

SG="${1:?security group id, e.g. sg-0123456789abcdef0}"
SSH_CIDR="${2:?your IP in CIDR form, e.g. 203.0.113.7/32}"
REGION="${3:-ap-south-1}"

v4="$(curl -fsSL https://www.cloudflare.com/ips-v4)"
v6="$(curl -fsSL https://www.cloudflare.com/ips-v6)"
[ -n "$v4" ] && [ -n "$v6" ] || { echo "Could not download Cloudflare IP ranges" >&2; exit 1; }

ranges() { # $1 = CIDR list, $2 = JSON key (CidrIp | CidrIpv6)
  local out="" c
  for c in $1; do out="$out${out:+,}{\"$2\":\"$c\",\"Description\":\"Cloudflare\"}"; done
  printf '[%s]' "$out"
}
R4="$(ranges "$v4" CidrIp)"
R6="$(ranges "$v6" CidrIpv6)"
PERMS="[
 {\"IpProtocol\":\"tcp\",\"FromPort\":443,\"ToPort\":443,\"IpRanges\":$R4,\"Ipv6Ranges\":$R6},
 {\"IpProtocol\":\"tcp\",\"FromPort\":80,\"ToPort\":80,\"IpRanges\":$R4,\"Ipv6Ranges\":$R6},
 {\"IpProtocol\":\"tcp\",\"FromPort\":22,\"ToPort\":22,\"IpRanges\":[{\"CidrIp\":\"$SSH_CIDR\",\"Description\":\"admin SSH\"}]}
]"

echo "== Removing the group's current inbound rules"
current="$(aws ec2 describe-security-groups --region "$REGION" --group-ids "$SG" \
  --query 'SecurityGroups[0].IpPermissions' --output json)"
if [ "$(echo "$current" | tr -d ' \n\r')" != "[]" ]; then
  aws ec2 revoke-security-group-ingress --region "$REGION" --group-id "$SG" \
    --ip-permissions "$current" >/dev/null
fi

echo "== Adding: 80/443 from Cloudflare only, 22 from $SSH_CIDR"
aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG" \
  --ip-permissions "$PERMS" >/dev/null

echo "Done. Inbound rules of $SG:"
aws ec2 describe-security-groups --region "$REGION" --group-ids "$SG" \
  --query 'SecurityGroups[0].IpPermissions[].{port:FromPort,ipv4:length(IpRanges),ipv6:length(Ipv6Ranges)}' \
  --output table
