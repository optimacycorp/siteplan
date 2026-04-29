#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required"
  exit 1
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-gnvdiklymbsbtcdbrybj}"
ACCESS_TOKEN="${SUPABASE_MANAGEMENT_TOKEN:-${SUPABASE_ACCESS_TOKEN:-}}"
SITE_URL="${1:-https://landportalv3.frcell.com}"
RESET_URL="${2:-${SITE_URL%/}/auth/reset-password}"
UPDATE_URL="${3:-${SITE_URL%/}/auth/update-password}"
API_BASE="https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth"

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Set SUPABASE_MANAGEMENT_TOKEN (or SUPABASE_ACCESS_TOKEN) to a Supabase personal access token first."
  echo "Create one at: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

CURRENT_JSON="$(curl -fsS "$API_BASE" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")"

MERGED_ALLOW_LIST="$(CURRENT_JSON="$CURRENT_JSON" SITE_URL="$SITE_URL" RESET_URL="$RESET_URL" UPDATE_URL="$UPDATE_URL" python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["CURRENT_JSON"])
raw = payload.get("uri_allow_list") or ""
existing = [item.strip() for item in raw.split(",") if item.strip()]
for url in [os.environ["SITE_URL"], os.environ["RESET_URL"], os.environ["UPDATE_URL"]]:
    if url not in existing:
        existing.append(url)
print(",".join(existing))
PY
)"

PATCH_BODY="$(SITE_URL="$SITE_URL" MERGED_ALLOW_LIST="$MERGED_ALLOW_LIST" python3 - <<'PY'
import json
import os

print(json.dumps({
    "site_url": os.environ["SITE_URL"],
    "uri_allow_list": os.environ["MERGED_ALLOW_LIST"],
}))
PY
)"

curl -fsS -X PATCH "$API_BASE" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PATCH_BODY" >/dev/null

echo "Updated Supabase Auth URL configuration for project: $PROJECT_REF"
echo "Site URL: $SITE_URL"
echo "Redirect URLs:"
echo "- $SITE_URL"
echo "- $RESET_URL"
echo "- $UPDATE_URL"
