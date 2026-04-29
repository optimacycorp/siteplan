#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./scripts/deploy-racknerd.sh <ssh-user>@<ssh-host> <remote-web-root>"
  echo "Example: ./scripts/deploy-racknerd.sh deploy@landportalv2.frcell.com /var/www/landportalv2/current"
  exit 1
fi

REMOTE_TARGET="$1"
REMOTE_ROOT="$2"
LOCAL_DIST="apps/web/dist"

npm run build --workspace @landportal/web
ssh "$REMOTE_TARGET" "mkdir -p '$REMOTE_ROOT'"
scp -r "$LOCAL_DIST"/* "$REMOTE_TARGET:$REMOTE_ROOT/"

echo "Deployment complete: https://landportalv2.frcell.com"
