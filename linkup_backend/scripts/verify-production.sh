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
# NestJS registers POST only — empty body should return 400 (validation), not 404.
code=$(curl -sS -o /tmp/linkup_verify_body.json -w "%{http_code}" -m 25 -X POST \
  -H "Content-Type: application/json" -d '{}' "$API_URL/auth/login" || echo "000")
if [ "$code" = "400" ] || [ "$code" = "401" ]; then
  echo "OK   Auth login route ($code)"
else
  echo "FAIL Auth login route (expected 400, got $code)"
  cat /tmp/linkup_verify_body.json 2>/dev/null || true
  echo
  failed=1
fi
check "Hub admins /groups/:id/admins (auth required)" "$API_URL/groups/health-check/admins" "401" || failed=1
check "Hub admins /hubs/:id/admins (auth required)" "$API_URL/hubs/health-check/admins" "401" || failed=1

echo
echo "Email / SMTP status:"
if curl -sS -m 25 "$API_URL/api/health" -o /tmp/linkup_health.json 2>/dev/null || curl -sS -m 25 "$API_URL/health" -o /tmp/linkup_health.json; then
  python3 - <<'PY' || failed=1
import json, sys
with open("/tmp/linkup_health.json") as f:
    data = json.load(f)
email = data.get("email", {})
configured = email.get("configured")
ready = email.get("ready")
from_addr = email.get("from")
if configured:
    print(f"OK   SMTP configured (from: {from_addr or 'unknown'})")
else:
    print("FAIL SMTP not configured — set SMTP_* env vars on Render")
    sys.exit(1)
if ready:
    print("OK   SMTP connection ready")
else:
    print("WARN SMTP not ready — verify SMTP_PASS in Render dashboard")
PY
else
  echo "FAIL Could not read health endpoint for SMTP status"
  failed=1
fi

echo
if [ "$failed" -eq 0 ]; then
  echo "All checks passed."
  echo "Set Vercel NEXT_PUBLIC_API_URL=$API_URL"
  echo "Set Vercel NEXT_PUBLIC_SOCKET_URL=$API_URL"
  echo ""
  echo "Always-on checklist:"
  echo "  1. Render plan = Starter or higher (NOT free — free sleeps after 15 min)"
  echo "  2. UptimeRobot monitor: GET $API_URL/api/health every 1 minute"
  echo "  3. GitHub Actions: .github/workflows/backend-uptime.yml (every 5 min)"
  echo "  4. Local/cron: bash scripts/uptime-ping.sh $API_URL"
  exit 0
fi

echo "Some checks failed. Review Render logs and env vars (DATABASE_URL, JWT_SECRET, CORS_ORIGINS)."
echo "If hub admins returns 404, redeploy latest backend from main."
echo "If health fails, upgrade Render from free → Starter (always-on)."
exit 1
