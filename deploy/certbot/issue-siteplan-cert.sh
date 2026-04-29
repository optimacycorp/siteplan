#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-siteplan.gomil.com}"
WEBROOT="${WEBROOT:-/var/www/siteplan.gomil.com/current}"
EMAIL="${EMAIL:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Set EMAIL before running this script."
  echo "Example: EMAIL=ops@gomil.com bash deploy/certbot/issue-siteplan-cert.sh"
  exit 1
fi

sudo certbot certonly \
  --webroot \
  --webroot-path "$WEBROOT" \
  --domain "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --keep-until-expiring

echo "Certificate request completed for $DOMAIN"
