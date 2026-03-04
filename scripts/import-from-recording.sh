#!/bin/bash
# ---------------------------------------------------------------------------
# Import recorded mocks from a running WireMock container
# Copies mapping files from the container to the local mocks directory
#
# Usage:
#   ./scripts/import-from-recording.sh [container-name]
# ---------------------------------------------------------------------------
set -e

CONTAINER="${1:-mock-server-wiremock-record}"
LOCAL_MOCKS="./mocks"

echo "[import] Importing mappings from container '$CONTAINER'..."

# Copy mappings
docker cp "$CONTAINER:/mocks/mappings/." "$LOCAL_MOCKS/mappings/"
echo "[import] Copied mappings to $LOCAL_MOCKS/mappings/"

# Copy response files
docker cp "$CONTAINER:/mocks/__files/." "$LOCAL_MOCKS/__files/" 2>/dev/null || true
echo "[import] Copied __files to $LOCAL_MOCKS/__files/"

# Count
COUNT=$(ls -1 "$LOCAL_MOCKS/mappings/"*.json 2>/dev/null | wc -l | tr -d ' ')
echo "[import] Done! $COUNT mapping(s) imported."
echo ""
echo "You can now:"
echo "  make wiremock         # serve with WireMock"
echo "  make mockoon          # serve with Mockoon"
echo "  make convert-to-mockoon  # export to Mockoon format"
