#!/bin/bash
set -e

ENGINE="${MOCK_ENGINE:-wiremock}"
MOCKS_DIR="/mocks"
MAPPINGS_DIR="$MOCKS_DIR/mappings"
FILES_DIR="$MOCKS_DIR/__files"
PORT="${MOCK_PORT:-8080}"
RECORD_MODE="${RECORD_MODE:-false}"
PROXY_TARGET="${PROXY_TARGET:-}"

mkdir -p "$MAPPINGS_DIR" "$FILES_DIR"

echo "============================================"
echo "  Mock Server Container"
echo "  Engine:       $ENGINE"
echo "  Port:         $PORT"
echo "  Record Mode:  $RECORD_MODE"
echo "  Proxy Target: ${PROXY_TARGET:-none}"
echo "============================================"

# ---------------------------------------------------------------------------
# WireMock
# ---------------------------------------------------------------------------
start_wiremock() {
  local ARGS=("--port" "$PORT" "--root-dir" "$MOCKS_DIR" "--verbose")

  if [ "$RECORD_MODE" = "true" ] && [ -n "$PROXY_TARGET" ]; then
    echo "[wiremock] Starting in RECORD mode -> $PROXY_TARGET"
    ARGS+=("--proxy-all=$PROXY_TARGET" "--record-mappings")
    # Disable gzip when proxying so responses are recorded as plain text
    ARGS+=("--supported-proxy-encodings" "identity" "--disable-gzip")
  fi

  # Pass any extra args from CMD
  ARGS+=("$@")

  echo "[wiremock] java -jar /opt/wiremock/wiremock.jar ${ARGS[*]}"
  exec java -jar /opt/wiremock/wiremock.jar "${ARGS[@]}"
}

# ---------------------------------------------------------------------------
# Mockoon
# ---------------------------------------------------------------------------
start_mockoon() {
  local ENV_FILE="/tmp/mockoon-env.json"

  echo "[mockoon] Converting WireMock mappings -> Mockoon environment..."
  node /opt/scripts/converter.js to-mockoon \
    --mocks-dir "$MOCKS_DIR" \
    --output "$ENV_FILE" \
    --port "$PORT" \
    --name "Mock Server" \
    ${PROXY_TARGET:+--proxy-target "$PROXY_TARGET"}

  local ARGS=("--data" "$ENV_FILE" "--port" "$PORT")

  # Pass any extra args from CMD
  ARGS+=("$@")

  echo "[mockoon] mockoon-cli start ${ARGS[*]}"
  exec mockoon-cli start "${ARGS[@]}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "$ENGINE" in
  wiremock)
    start_wiremock "$@"
    ;;
  mockoon)
    start_mockoon "$@"
    ;;
  *)
    echo "ERROR: Unknown engine '$ENGINE'. Use 'wiremock' or 'mockoon'."
    exit 1
    ;;
esac
