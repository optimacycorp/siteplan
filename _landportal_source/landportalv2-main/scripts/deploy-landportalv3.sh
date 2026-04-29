#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./scripts/deploy-landportalv3.sh <ssh-user>@<ssh-host> <remote-web-root>"
  echo "Example: ./scripts/deploy-landportalv3.sh deploy@racknerd-812fde6 /var/www/landportalv3/current"
  exit 1
fi

REMOTE_TARGET="$1"
REMOTE_ROOT="$2"
LOCAL_DIST="apps/web/dist"

export PATH="${HOME}/.local/bin:${PATH}"
NODE_OPTIONS="--max-old-space-size=1024" pnpm --filter @landportal/web build
ssh "$REMOTE_TARGET" "mkdir -p '$REMOTE_ROOT'"
scp -r "$LOCAL_DIST"/* "$REMOTE_TARGET:$REMOTE_ROOT/"

echo "Deployment complete: https://landportalv3.frcell.com"
