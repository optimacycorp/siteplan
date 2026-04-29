#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <archive-path> <user>@<host> [remote-dir]"
  exit 1
fi

ARCHIVE_PATH="$1"
REMOTE_HOST="$2"
REMOTE_DIR="${3:-/tmp/siteplan-release}"

ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"
scp "$ARCHIVE_PATH" "$REMOTE_HOST:$REMOTE_DIR/"

echo "Uploaded $(basename "$ARCHIVE_PATH") to $REMOTE_HOST:$REMOTE_DIR"
