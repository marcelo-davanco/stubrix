## ==========================================================================
## Stubrix — Dual-engine Mock Server
## Supports: WireMock (Java) and Mockoon CLI (Node.js)
## ==========================================================================

# ---------------------------------------------------------------------------
# Stage 1 – Download WireMock standalone JAR
# ---------------------------------------------------------------------------
FROM node:25-slim AS wiremock-download

ARG WIREMOCK_VERSION=3.9.1

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
  mkdir -p /opt/wiremock && \
  curl -sSL -o /opt/wiremock/wiremock.jar \
  "https://repo1.maven.org/maven2/org/wiremock/wiremock-standalone/${WIREMOCK_VERSION}/wiremock-standalone-${WIREMOCK_VERSION}.jar"

# ---------------------------------------------------------------------------
# Stage 2 – Combined image (Debian-based for ARM64 + x86 compat)
# ---------------------------------------------------------------------------
FROM node:25-slim AS combined

# Install Java (headless), bash, curl, jq
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  default-jre-headless bash curl jq ca-certificates && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Mockoon CLI
RUN npm install -g @mockoon/cli@latest

# Copy WireMock jar
COPY --from=wiremock-download /opt/wiremock/wiremock.jar /opt/wiremock/wiremock.jar

# Copy scripts
COPY scripts/ /opt/scripts/
RUN chmod +x /opt/scripts/*.sh

# Shared mocks volume
RUN mkdir -p /mocks/mappings /mocks/__files
VOLUME ["/mocks"]

# Default port
EXPOSE 8080

# Environment defaults
ENV MOCK_ENGINE=wiremock \
  MOCK_PORT=8080 \
  RECORD_MODE=false \
  PROXY_TARGET=""

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:${MOCK_PORT}/__admin/health 2>/dev/null || \
  bash -c "</dev/tcp/localhost/${MOCK_PORT}" 2>/dev/null || exit 1

ENTRYPOINT ["/opt/scripts/entrypoint.sh"]
