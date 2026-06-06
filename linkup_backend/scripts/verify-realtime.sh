#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-https://api.thelinkupzone.com}"

echo "=== LinkUp realtime verification ==="
echo "API: $API_URL"
echo

body=$(curl -sS -m 20 "${API_URL}/socket.io/?EIO=4&transport=polling" || echo "")
if echo "$body" | grep -q '"sid"'; then
  echo "OK   Socket.IO polling handshake"
else
  echo "FAIL Socket.IO polling handshake"
  echo "     Response: ${body:0:200}"
  exit 1
fi

health=$(curl -sS -m 15 "${API_URL}/health" || echo "")
if echo "$health" | grep -q '"database":"connected"'; then
  echo "OK   Database health"
else
  echo "WARN Database health check failed"
  echo "     $health"
fi

if echo "$health" | grep -q 'socket.io'; then
  echo "OK   Realtime service reported in health"
else
  echo "WARN Realtime not reported in /health (redeploy backend)"
fi

echo
echo "Vercel env (frontend):"
echo "  NEXT_PUBLIC_API_URL=$API_URL"
echo "  NEXT_PUBLIC_SOCKET_URL=$API_URL"
echo "Render: use Starter+ always-on plan for persistent WebSockets."
exit 0
