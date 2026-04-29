#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$ROOT_DIR/releases"
ARTIFACT_DIR="$RELEASE_DIR/siteplan-$TIMESTAMP"
ARCHIVE_PATH="$RELEASE_DIR/siteplan-$TIMESTAMP.tar.gz"

mkdir -p "$ARTIFACT_DIR"

cd "$ROOT_DIR"
pnpm build

cp -R dist "$ARTIFACT_DIR/dist"
cp .env.production.example "$ARTIFACT_DIR/.env.production.example"
cp -R deploy "$ARTIFACT_DIR/deploy"
cp README.md "$ARTIFACT_DIR/README.md"

tar -C "$RELEASE_DIR" -czf "$ARCHIVE_PATH" "siteplan-$TIMESTAMP"
rm -rf "$ARTIFACT_DIR"

echo "Created release archive:"
echo "  $ARCHIVE_PATH"
