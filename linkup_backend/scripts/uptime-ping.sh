#!/usr/bin/env bash
# Ping LinkUp backend health — run every 1–5 minutes via cron or UptimeRobot.
# Example cron (every minute):
#   * * * * * /path/to/linkup_backend/scripts/uptime-ping.sh https://api.thelinkupzone.com
set -euo pipefail

API_URL="${1:-https://api.thelinkupzone.com}"
API_URL="${API_URL%/}"

for path in "/api/health" "/health"; do
  code=$(curl -sS -o /tmp/linkup-health.json -w "%{http_code}" --max-time 45 "${API_URL}${path}" || echo "000")
  if [ "$code" = "200" ]; then
    echo "OK ${API_URL}${path} (${code})"
    cat /tmp/linkup-health.json
    exit 0
  fi
done

echo "FAIL ${API_URL} (last code: ${code:-000})" >&2
cat /tmp/linkup-health.json 2>/dev/null || true
exit 1
