#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-siteplan.gomil.com}"
WEB_ROOT="${WEB_ROOT:-/var/www/$DOMAIN}"
NGINX_AVAILABLE="/etc/nginx/sites-available/$DOMAIN.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN.conf"
BOOTSTRAP_CONF_SOURCE="${BOOTSTRAP_CONF_SOURCE:-$(pwd)/deploy/nginx/siteplan.gomil.com.bootstrap.conf}"

sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx rsync

sudo mkdir -p "$WEB_ROOT/current" "$WEB_ROOT/releases"
sudo chown -R "$USER:$USER" "$WEB_ROOT"

sudo cp "$BOOTSTRAP_CONF_SOURCE" "$NGINX_AVAILABLE"
sudo ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

echo "Bootstrap complete for $DOMAIN"
echo "Next: issue the cert, then swap to the TLS config."
