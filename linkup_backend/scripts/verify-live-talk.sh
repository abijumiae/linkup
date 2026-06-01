#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://localhost:3000}"
API_URL="${API_URL%/}"

echo "Checking LinkUp API at ${API_URL}"

health="$(curl -sf "${API_URL}/health" || true)"
if [ -z "$health" ]; then
  echo "FAIL: Cannot reach ${API_URL}/health"
  exit 1
fi

echo "health: ${health}"

if echo "$health" | grep -q '"liveTalk":true'; then
  echo "OK: features.liveTalk is true"
else
  echo "WARN: features.liveTalk missing — redeploy or restart linkup_backend (npm run build && npm run start:dev)"
fi

status="$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/groups/verify-live-talk-check/live-talk/start")"
if [ "$status" = "401" ]; then
  echo "OK: POST /groups/:id/live-talk/start → 401 (route exists, auth required)"
elif [ "$status" = "404" ]; then
  echo "FAIL: POST /groups/:id/live-talk/start → 404 (route not registered)"
  exit 1
else
  echo "INFO: POST /groups/:id/live-talk/start → ${status}"
fi

echo "Done."
