#!/bin/bash
# ---------------------------------------------------------------------------
# Quick helper to start/stop recording via WireMock Admin API
# Works when the container is running with WireMock engine
#
# Usage:
#   ./scripts/record.sh start <target-url>
#   ./scripts/record.sh stop
#   ./scripts/record.sh snapshot
#   ./scripts/record.sh status
# ---------------------------------------------------------------------------
set -e

# Load .env if available
if [ -f "$(dirname "$0")/../.env" ]; then
  set -a
  source "$(dirname "$0")/../.env"
  set +a
fi

MOCK_PORT="${MOCK_PORT:-8081}"
HOST="${MOCK_HOST:-http://localhost:${MOCK_PORT}}"

case "${1:-help}" in
  start)
    TARGET="${2:?Usage: record.sh start <target-url>}"
    echo "[record] Starting recording -> $TARGET"
    curl -s -X POST "$HOST/__admin/recordings/start" \
      -H "Content-Type: application/json" \
      -d "{
        \"targetBaseUrl\": \"$TARGET\",
        \"captureHeaders\": {
          \"Content-Type\": {},
          \"Accept\": {}
        },
        \"requestBodyPattern\": {
          \"matcher\": \"equalToJson\",
          \"ignoreArrayOrder\": true,
          \"ignoreExtraElements\": true
        },
        \"persist\": true,
        \"repeatsAsScenarios\": false,
        \"transformers\": [],
        \"transformerParameters\": {}
      }" | jq . 2>/dev/null || cat
    echo ""
    ;;

  stop)
    echo "[record] Stopping recording..."
    curl -s -X POST "$HOST/__admin/recordings/stop" | jq . 2>/dev/null || cat
    echo ""
    ;;

  snapshot)
    echo "[record] Taking snapshot of current stubs..."
    curl -s -X POST "$HOST/__admin/recordings/snapshot" \
      -H "Content-Type: application/json" \
      -d '{
        "persist": true,
        "repeatsAsScenarios": false
      }' | jq . 2>/dev/null || cat
    echo ""
    ;;

  status)
    echo "[record] Recording status:"
    curl -s "$HOST/__admin/recordings/status" | jq . 2>/dev/null || cat
    echo ""
    ;;

  *)
    echo "Usage: record.sh {start <target-url>|stop|snapshot|status}"
    echo ""
    echo "Examples:"
    echo "  ./scripts/record.sh start https://api.example.com"
    echo "  # ... make requests through http://localhost:8080 ..."
    echo "  ./scripts/record.sh stop"
    exit 1
    ;;
esac
