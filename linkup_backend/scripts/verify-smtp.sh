#!/usr/bin/env bash
# Verify SMTP is configured and reachable on the LinkUp API host.
# Usage:
#   bash scripts/verify-smtp.sh
#   bash scripts/verify-smtp.sh https://api.thelinkupzone.com
set -euo pipefail

API_URL="${1:-https://api.thelinkupzone.com}"
API_URL="${API_URL%/}"

echo "=== LinkUp SMTP / email verification check ==="
echo "API: $API_URL"
echo

body=$(curl -sS -m 30 "${API_URL}/api/health" || curl -sS -m 30 "${API_URL}/health")
echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
echo

configured=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email',{}).get('configured', False))" 2>/dev/null || echo "false")
ready=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email',{}).get('ready', False))" 2>/dev/null || echo "false")

if [ "$configured" = "True" ] || [ "$configured" = "true" ]; then
  echo "OK   SMTP env vars present"
else
  echo "FAIL SMTP env vars missing on production"
  echo "     Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in Render"
  exit 1
fi

if [ "$ready" = "True" ] || [ "$ready" = "true" ]; then
  echo "OK   SMTP connection verified at startup"
else
  echo "WARN SMTP configured but not ready — check Render logs for authentication errors"
  echo "     Ensure SMTP_PASS is the Microsoft 365 app password for admin@thelinkupzone.com"
fi

echo
echo "After signup, check Render logs for: [email:sent] Verification email delivered"
echo "Test link format: https://www.thelinkupzone.com/verify-email?token=TOKEN"
