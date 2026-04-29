#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/siteplan.gomil.com/app}"
SERVICE_NAME="${SERVICE_NAME:-siteplan-regrid-proxy.service}"
ENV_FILE="${ENV_FILE:-/etc/siteplan-regrid-proxy.env}"
SYSTEMD_SOURCE="${SYSTEMD_SOURCE:-$(pwd)/deploy/systemd/siteplan-regrid-proxy.service}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Create it first with:"
  echo "  PORT=8787"
  echo "  REGRID_API_TOKEN=..."
  echo "  REGRID_API_BASE_URL=https://app.regrid.com/api/v2"
  exit 1
fi

sudo install -d "$APP_DIR"
sudo rsync -av --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  "$(pwd)/" "$APP_DIR/"

sudo chown -R www-data:www-data "$APP_DIR"
sudo cp "$SYSTEMD_SOURCE" "/etc/systemd/system/$SERVICE_NAME"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager
