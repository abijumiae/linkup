#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-https://api.thelinkupzone.com}"
FRONTEND_URL="${2:-https://www.thelinkupzone.com}"

echo "=== LinkUp production verification ==="
echo "API: $API_URL"
echo "Frontend: $FRONTEND_URL"
echo

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  code=$(curl -sS -o /tmp/linkup_verify_body.json -w "%{http_code}" -m 25 "$url" || echo "000")
  if [ "$code" = "$expected" ]; then
    echo "OK   $name ($code)"
    return 0
  fi

  echo "FAIL $name (expected $expected, got $code)"
  cat /tmp/linkup_verify_body.json 2>/dev/null || true
  echo
  return 1
}

failed=0

check "Root" "$API_URL/" || failed=1
check "Health /health" "$API_URL/health" || failed=1
check "Health /api/health" "$API_URL/api/health" || failed=1
check "Auth login route" "$API_URL/auth/login" "405" || failed=1

echo
if [ "$failed" -eq 0 ]; then
  echo "All checks passed."
  echo "Set Vercel NEXT_PUBLIC_API_URL=$API_URL"
  echo "Monitor uptime: UptimeRobot/Better Stack → $API_URL/api/health"
  exit 0
fi

echo "Some checks failed. Review Render logs and env vars (DATABASE_URL, JWT_SECRET, CORS_ORIGINS)."
exit 1
