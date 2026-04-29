#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-}"
APP_DIR="/home/deploy/apps/landportalv3"
WEB_ROOT="/var/www/landportalv3/current"
SITE_NAME="landportalv3.frcell.com.conf"

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: bash scripts/install-landportalv3.sh <git-repo-url>"
  exit 1
fi

mkdir -p /home/deploy/apps

if ! command -v pnpm >/dev/null 2>&1; then
  mkdir -p /home/deploy/.local/bin
  npm install -g pnpm@9.15.0 --prefix /home/deploy/.local
fi
export PATH="/home/deploy/.local/bin:${PATH}"

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
pnpm install

echo "Create apps/web/.env.production and .env before building if they are not already present."

NODE_OPTIONS="--max-old-space-size=1024" pnpm --filter @landportal/web build

sudo mkdir -p "$WEB_ROOT"
sudo chown -R deploy:deploy /var/www/landportalv3
find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
cp -r apps/web/dist/* "$WEB_ROOT/"

sudo cp "$APP_DIR/ops/nginx/$SITE_NAME" "/etc/nginx/sites-available/$SITE_NAME"
sudo ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
sudo nginx -t
sudo systemctl reload nginx

echo "Install complete. Next step: sudo certbot --nginx -d landportalv3.frcell.com"
