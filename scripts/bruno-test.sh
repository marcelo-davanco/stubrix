#!/bin/bash
set -e

COLLECTION="${COLLECTION:-api-client}"
ENV="${ENV:-local}"
API_URL="${API_URL:-http://localhost:9090}"

echo "Running Bruno tests..."
echo "  Collection: $COLLECTION"
echo "  Environment: $ENV"
echo "  API URL: $API_URL"

npx @usebruno/cli run "$COLLECTION" \
  --env "$ENV" \
  --env-var "api_url=$API_URL" \
  --reporter-json "reports/bruno-results.json" \
  --reporter-junit "reports/bruno-junit.xml" \
  "$@"
