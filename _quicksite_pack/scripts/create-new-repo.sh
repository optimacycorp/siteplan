#!/usr/bin/env bash
set -euo pipefail
REPO_NAME="${1:-optimacy-quicksite}"
mkdir -p "$REPO_NAME"
cd "$REPO_NAME"
git init
pnpm create vite . --template react-ts
pnpm install
pnpm add maplibre-gl zustand @tanstack/react-query clsx zod
pnpm add -D vitest
printf '\nCreated %s. Copy scaffold files from this pack into the repo, then commit.\n' "$REPO_NAME"
