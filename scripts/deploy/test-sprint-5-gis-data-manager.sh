#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://siteplan.gomil.com}"

echo "Testing Sprint 5 GIS Data Manager against: $BASE_URL"
echo

check_url() {
  local url="$1"
  local label="$2"
  echo "Checking $label"
  curl -fsSIL "$url" >/dev/null
  echo "  OK: $url"
}

check_url "$BASE_URL/" "site root"
check_url "$BASE_URL/test-data/sample-site-layer.geojson" "sample GeoJSON fixture"
check_url "$BASE_URL/test-data/sample-points.csv" "sample CSV fixture"

echo
echo "RackNerd browser smoke test"
echo "1. Open $BASE_URL in a browser."
echo "2. Download these two fixtures locally from the same server:"
echo "   - $BASE_URL/test-data/sample-site-layer.geojson"
echo "   - $BASE_URL/test-data/sample-points.csv"
echo "3. In the app, open 'GIS data manager'."
echo "4. Upload sample-site-layer.geojson and confirm polygon, line, and point render on the map."
echo "5. Upload sample-points.csv and confirm the point layer renders."
echo "6. Use the layer cards to Hide, Show, Zoom, and Export."
echo "7. Click 'Export project GeoJSON' and confirm the downloaded file includes imported GIS features."
echo
echo "If the page loads and both fixture URLs return 200, the RackNerd deployment is ready for the manual GIS smoke test."
