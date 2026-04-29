#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-siteplan.gomil.com}"
NGINX_AVAILABLE="/etc/nginx/sites-available/$DOMAIN.conf"
TLS_CONF_SOURCE="${TLS_CONF_SOURCE:-$(pwd)/deploy/nginx/siteplan.gomil.com.conf}"

sudo cp "$TLS_CONF_SOURCE" "$NGINX_AVAILABLE"
sudo nginx -t
sudo systemctl reload nginx

echo "TLS config activated for $DOMAIN"
