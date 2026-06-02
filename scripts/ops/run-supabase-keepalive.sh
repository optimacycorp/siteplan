#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/siteplan-regrid-proxy.env}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

JITTER_MAX="${OPEN_PARCEL_KEEPALIVE_JITTER_SECONDS_MAX:-0}"
if [[ "${JITTER_MAX}" =~ ^[0-9]+$ ]] && [[ "${JITTER_MAX}" -gt 0 ]]; then
  sleep "$(( RANDOM % (JITTER_MAX + 1) ))"
fi

cd "${ROOT_DIR}"
exec node "${SCRIPT_DIR}/supabase-keepalive.mjs" "$@"
