#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <release-archive.tar.gz> [domain-root]"
  exit 1
fi

ARCHIVE_PATH="$1"
DOMAIN_ROOT="${2:-/var/www/siteplan.gomil.com}"
RELEASES_DIR="$DOMAIN_ROOT/releases"
CURRENT_LINK="$DOMAIN_ROOT/current"
TMP_DIR="$(mktemp -d)"

mkdir -p "$RELEASES_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

EXTRACTED_DIR="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ -z "$EXTRACTED_DIR" ]]; then
  echo "Could not locate extracted release directory."
  exit 1
fi

RELEASE_NAME="$(basename "$EXTRACTED_DIR")"
TARGET_DIR="$RELEASES_DIR/$RELEASE_NAME"

rm -rf "$TARGET_DIR"
mv "$EXTRACTED_DIR" "$TARGET_DIR"
ln -sfn "$TARGET_DIR/dist" "$CURRENT_LINK"

rm -rf "$TMP_DIR"

nginx -t
systemctl reload nginx

echo "Published release to $CURRENT_LINK"
