#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/apps/landportalv3"
WEB_ROOT="/var/www/landportalv3/current"
NGINX_SITE="/etc/nginx/sites-enabled/landportalv3.frcell.com.conf"

export PATH="/home/deploy/.local/bin:${PATH}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not available for deploy. Install it first for /home/deploy/.local/bin."
  exit 1
fi

cd "$APP_DIR"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Building frontend"
NODE_OPTIONS="--max-old-space-size=1024" pnpm --filter @landportal/web build

echo "==> Ensuring web root exists"
sudo mkdir -p "$WEB_ROOT"
sudo chown -R deploy:deploy /var/www/landportalv3

echo "==> Replacing deployed files"
find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -r "$APP_DIR/apps/web/dist/"* "$WEB_ROOT/"

echo "==> Verifying nginx site exists"
if [[ ! -L "$NGINX_SITE" && ! -f "$NGINX_SITE" ]]; then
  echo "Missing nginx site: $NGINX_SITE"
  exit 1
fi

echo "==> Testing nginx config"
sudo nginx -t

echo "==> Reloading nginx"
sudo systemctl reload nginx

echo "==> Done"
echo "URL: https://landportalv3.frcell.com"
