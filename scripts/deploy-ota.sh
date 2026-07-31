#!/usr/bin/env bash
# OTA Deploy: build frontend → zip → upload to VPS
# Usage: bash scripts/deploy-ota.sh [version]
#   version defaults to timestamp-based (e.g. v20260731-2055)
# Requires: OTA_UPLOAD_KEY env var (or reads from provision.env)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Load OTA_UPLOAD_KEY from provision.env if not set
if [ -z "${OTA_UPLOAD_KEY:-}" ]; then
  if [ -f "$ROOT_DIR/provision.env" ]; then
    OTA_UPLOAD_KEY=$(grep '^OTA_UPLOAD_KEY=' "$ROOT_DIR/provision.env" | cut -d= -f2-)
  fi
fi
if [ -z "${OTA_UPLOAD_KEY:-}" ]; then
  echo "ERROR: OTA_UPLOAD_KEY not set. Set it in provision.env or as env var."
  exit 1
fi

# Version
VERSION="${1:-v$(date +%Y%m%d-%H%M)}"
echo "=== OTA Deploy: $VERSION ==="

# 1. Build frontend (mobile mode)
echo "→ Building frontend..."
cd "$FRONTEND_DIR"
VITE_API_BASE="${VITE_API_BASE:-http://37.114.41.246/api}" npm run build:mobile

# 2. Zip the dist
ZIP_PATH="/tmp/ota-$VERSION.zip"
echo "→ Creating zip: $ZIP_PATH"
cd dist
zip -r "$ZIP_PATH" . > /dev/null
cd ..
ZIP_SIZE=$(stat -c%s "$ZIP_PATH" 2>/dev/null || stat -f%z "$ZIP_PATH")
echo "  Bundle size: $ZIP_SIZE bytes"

# 3. Upload
VPS_URL="${VPS_URL:-http://37.114.41.246}"
CHECKSUM=$(sha256sum "$ZIP_PATH" | cut -d' ' -f1)
echo "→ Uploading to $VPS_URL/api/app-version/upload ..."

HTTP_CODE=$(curl -s -o /tmp/ota-response.json -w "%{http_code}" \
  -X POST \
  -H "X-OTA-Key: $OTA_UPLOAD_KEY" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$ZIP_PATH" \
  "$VPS_URL/api/app-version/upload?version=$VERSION&checksum=$CHECKSUM")

RESPONSE=$(cat /tmp/ota-response.json)
echo "  HTTP $HTTP_CODE: $RESPONSE"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo ""
  echo "=== OTA $VERSION deployed successfully ==="
  echo "  Apps will pick it up on next start."
  rm -f "$ZIP_PATH"
else
  echo ""
  echo "=== DEPLOY FAILED ==="
  rm -f "$ZIP_PATH"
  exit 1
fi
