.PHONY: build wiremock mockoon record record-stop convert-to-mockoon convert-to-wiremock clean help \
        stubrix-build stubrix-up stubrix-down stubrix-logs stubrix-restart \
        stack-up stack-down \
        vscode-build vscode-package vscode-install windsurf-install \
        adminer adminer-up adminer-down cloudbeaver cloudbeaver-up cloudbeaver-down db-viewer db-viewer-down \
        hoppscotch hoppscotch-down hoppscotch-logs \
        bruno-test bruno-test-collection \
        ai-up ai-down ai-logs \
        scenario-save scenario-restore scenario-list \
        pact-up pact-down pact-logs \
        toxiproxy-up toxiproxy-down toxiproxy-logs \
        kafka-up kafka-down kafka-logs \
        rabbitmq-up rabbitmq-down rabbitmq-logs \
        gripmock-up gripmock-down \
        monitoring-up monitoring-down \
        jaeger-up jaeger-down \
        localstack-up localstack-down \
        minio-up minio-down \
        keycloak-up keycloak-down \
        zitadel-up zitadel-down

# Load .env if it exists (values can still be overridden from CLI)
-include .env
export

PROXY_TARGET ?= https://api.example.com
MOCK_PORT    ?= 8081

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker compose build

# ---------------------------------------------------------------------------
# Run engines
# ---------------------------------------------------------------------------

wiremock: build ## Start WireMock (serve existing mocks)
	docker compose --profile wiremock up

mockoon: build ## Start Mockoon (serve existing mocks)
	docker compose --profile mockoon up

# ---------------------------------------------------------------------------
# Recording
# ---------------------------------------------------------------------------

wiremock-record: build ## Start WireMock in record mode (saves all proxied requests)
	PROXY_TARGET=$(PROXY_TARGET) docker compose --profile wiremock-record up

record-start: ## Start recording via WireMock Admin API (requires running wiremock)
	./scripts/record.sh start $(PROXY_TARGET)

record-stop: ## Stop recording and persist mappings
	./scripts/record.sh stop

record-snapshot: ## Take a snapshot of current recordings
	./scripts/record.sh snapshot

record-status: ## Check recording status
	./scripts/record.sh status

# ---------------------------------------------------------------------------
# Proxy (Mockoon)
# ---------------------------------------------------------------------------

mockoon-proxy: build ## Start Mockoon with proxy mode
	PROXY_TARGET=$(PROXY_TARGET) docker compose --profile mockoon-proxy up

# ---------------------------------------------------------------------------
# Databases
# ---------------------------------------------------------------------------

postgres: ## Start PostgreSQL
	docker compose --profile postgres up

postgres-up: ## Start PostgreSQL (detached)
	docker compose --profile postgres up -d

postgres-down: ## Stop PostgreSQL services
	docker compose --profile postgres down

postgres-psql: ## Open psql shell
	docker compose exec db-postgres psql -U $${PG_USER:-postgres}

mysql: ## Start MySQL
	docker compose --profile mysql up

mysql-up: ## Start MySQL (detached)
	docker compose --profile mysql up -d

mysql-down: ## Stop MySQL services
	docker compose --profile mysql down

mysql-shell: ## Open mysql shell
	docker compose exec db-mysql mysql -u $${MYSQL_USER:-stubrix} -p$${MYSQL_PASSWORD:-stubrix}

# ---------------------------------------------------------------------------
# Database Viewers (F29)
# ---------------------------------------------------------------------------

adminer: ## Start Adminer + PostgreSQL (lightweight DB web UI — http://localhost:8082)
	docker compose --profile postgres --profile adminer up

adminer-up: ## Start Adminer + PostgreSQL (detached)
	docker compose --profile postgres --profile adminer up -d

adminer-down: ## Stop Adminer
	docker compose --profile adminer down

cloudbeaver: ## Start CloudBeaver + PostgreSQL (full DB IDE — http://localhost:8083)
	docker compose --profile postgres --profile cloudbeaver up

cloudbeaver-up: ## Start CloudBeaver + PostgreSQL (detached)
	docker compose --profile postgres --profile cloudbeaver up -d

cloudbeaver-down: ## Stop CloudBeaver
	docker compose --profile cloudbeaver down

db-viewer: ## Start both Adminer + CloudBeaver + PostgreSQL (detached)
	docker compose --profile postgres --profile db-viewer up -d

db-viewer-down: ## Stop all DB viewers
	docker compose --profile db-viewer down

vscode-build: ## Build Stubrix VS Code extension (TypeScript compile)
	npm run build:vscode

vscode-package: ## Package extension as .vsix (build + vsce package)
	npm run package:vscode

vscode-install: ## Package and install extension in VS Code
	npm run install:vscode

windsurf-install: ## Package and install extension in Windsurf
	npm run package:vscode
	windsurf --install-extension packages/vscode-extension/stubrix-vscode-$(shell node -p "require('./packages/vscode-extension/package.json').version").vsix 2>/dev/null || \
	/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf --install-extension packages/vscode-extension/stubrix-vscode-$(shell node -p "require('./packages/vscode-extension/package.json').version").vsix

# ---------------------------------------------------------------------------
# Local Development (API + UI outside Docker, infra in Docker)
# ---------------------------------------------------------------------------

dev: infra-up ## Start local dev: infra in Docker + API/UI with hot-reload
	@echo "⏳ Waiting for infrastructure services..."
	@sleep 3
	@echo "🚀 Starting API + UI locally (hot-reload)..."
	npm run dev

infra-up: ## Start infrastructure services in Docker (Redis + WireMock + PostgreSQL)
	docker compose --profile redis --profile wiremock --profile postgres up -d
	@echo "✅ Infrastructure ready: Redis :6379 | WireMock :8081 | PostgreSQL :5442"

infra-down: ## Stop infrastructure services
	docker compose --profile redis --profile wiremock --profile postgres down

infra-logs: ## Tail infrastructure logs
	docker compose --profile redis --profile wiremock --profile postgres logs -f

redis-up: ## Start Redis (queue & cache)
	docker compose --profile redis up -d

redis-down: ## Stop Redis
	docker compose --profile redis down

# ---------------------------------------------------------------------------
# Stubrix Control Plane (Docker mode)
# ---------------------------------------------------------------------------

stubrix-build: ## Build Stubrix control plane Docker image
	docker compose build stubrix

stubrix-up: ## Start Stubrix control plane (API + UI) in Docker — http://localhost:9090
	docker compose --profile control-plane up -d

stubrix-down: ## Stop Stubrix control plane
	docker compose --profile control-plane down

stubrix-logs: ## Tail Stubrix API logs
	docker compose --profile control-plane logs -f stubrix

stubrix-restart: ## Rebuild and restart Stubrix control plane
	docker compose --profile control-plane down && docker compose build stubrix && docker compose --profile control-plane up -d

stack-up: ## Start full stack: Stubrix + WireMock + PostgreSQL (detached)
	docker compose --profile control-plane --profile wiremock --profile postgres up -d

stack-down: ## Stop full stack (Stubrix + WireMock + PostgreSQL)
	docker compose --profile control-plane --profile wiremock --profile postgres down

all-up: ## Start WireMock + PostgreSQL (legacy — use stack-up for full stack)
	docker compose --profile wiremock --profile postgres up -d

ai-up: ## Start ChromaDB + OpenRAG AI layer (F9.01 — detached)
	docker compose --profile ai up -d

ai-down: ## Stop AI/RAG services
	docker compose --profile ai down

ai-logs: ## Tail OpenRAG logs
	docker compose --profile ai logs -f openrag

scenario-save: ## Capture current state as a scenario (F11.06) — NAME=<name> required
	@[ "$(NAME)" ] || (echo "ERROR: NAME is required. Usage: make scenario-save NAME=my-scenario" && exit 1)
	curl -s -X POST http://localhost:9090/api/scenarios/capture \
	  -H 'Content-Type: application/json' \
	  -d '{"name":"$(NAME)"}' | jq .

scenario-restore: ## Restore environment from a scenario (F11.06) — ID=<uuid> required
	@[ "$(ID)" ] || (echo "ERROR: ID is required. Usage: make scenario-restore ID=<uuid>" && exit 1)
	curl -s -X POST http://localhost:9090/api/scenarios/$(ID)/restore | jq .

scenario-list: ## List all captured scenarios (F11.06)
	curl -s http://localhost:9090/api/scenarios | jq .

pact-up: ## Start Pact Broker + PostgreSQL (F13.01 — detached)
	docker compose --profile postgres --profile pact up -d

pact-down: ## Stop Pact Broker
	docker compose --profile pact down

pact-logs: ## Tail Pact Broker logs
	docker compose --profile pact logs -f pact-broker

toxiproxy-up: ## Start Toxiproxy network chaos (F26.01 — detached)
	docker compose --profile toxiproxy up -d

toxiproxy-down: ## Stop Toxiproxy
	docker compose --profile toxiproxy down

toxiproxy-logs: ## Tail Toxiproxy logs
	docker compose --profile toxiproxy logs -f toxiproxy

kafka-up: ## Start Redpanda (Kafka) + console (F16.01 — detached)
	docker compose --profile kafka up -d

kafka-down: ## Stop Redpanda/Kafka
	docker compose --profile kafka down

kafka-logs: ## Tail Redpanda logs
	docker compose --profile kafka logs -f redpanda

rabbitmq-up: ## Start RabbitMQ (F16.02 — detached)
	docker compose --profile rabbitmq up -d

rabbitmq-down: ## Stop RabbitMQ
	docker compose --profile rabbitmq down

rabbitmq-logs: ## Tail RabbitMQ logs
	docker compose --profile rabbitmq logs -f rabbitmq

gripmock-up: ## Start GripMock gRPC mock engine (F15.06 — detached)
	docker compose --profile gripmock up -d

gripmock-down: ## Stop GripMock
	docker compose --profile gripmock down

monitoring-up: ## Start Prometheus + Grafana (F21.03/04 — detached)
	docker compose --profile monitoring up -d

monitoring-down: ## Stop Prometheus + Grafana
	docker compose --profile monitoring down

jaeger-up: ## Start Jaeger distributed tracing (F28.01 — detached)
	docker compose --profile jaeger up -d

jaeger-down: ## Stop Jaeger
	docker compose --profile jaeger down

localstack-up: ## Start LocalStack AWS cloud mocking (F27.01 — detached)
	docker compose --profile localstack up -d

localstack-down: ## Stop LocalStack
	docker compose --profile localstack down

minio-up: ## Start MinIO object storage (F32.01 — detached)
	docker compose --profile minio up -d

minio-down: ## Stop MinIO
	docker compose --profile minio down

keycloak-up: ## Start Keycloak IAM (F33.01 — detached)
	docker compose --profile keycloak up -d

keycloak-down: ## Stop Keycloak
	docker compose --profile keycloak down

zitadel-up: ## Start Zitadel IAM (F33.02 — detached)
	docker compose --profile zitadel up -d

zitadel-down: ## Stop Zitadel
	docker compose --profile zitadel down

hoppscotch: ## Start Hoppscotch self-hosted API client (F8.01 — http://localhost:3100)
	docker compose --profile hoppscotch up

hoppscotch-down: ## Stop Hoppscotch
	docker compose --profile hoppscotch down

hoppscotch-logs: ## Tail Hoppscotch logs
	docker compose --profile hoppscotch logs -f hoppscotch

bruno-test: ## Run Bruno API tests (all collections)
	@mkdir -p reports
	COLLECTION=api-client bash scripts/bruno-test.sh

bruno-test-collection: ## Run Bruno tests for a specific collection (e.g. make bruno-test-collection COLLECTION=control-plane)
	@mkdir -p reports
	COLLECTION=$(COLLECTION) bash scripts/bruno-test.sh

all-down: ## Stop all services
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy --profile postgres --profile mysql --profile adminer --profile cloudbeaver --profile hoppscotch --profile ai --profile pact --profile toxiproxy --profile kafka --profile rabbitmq --profile gripmock --profile monitoring --profile jaeger --profile localstack --profile minio --profile keycloak --profile zitadel down

# ---------------------------------------------------------------------------
# Conversion
# ---------------------------------------------------------------------------

convert-to-mockoon: ## Convert WireMock mappings to Mockoon env file
	node scripts/converter.js to-mockoon --mocks-dir ./mocks --output .mockoon-env.json

convert-to-wiremock: ## Convert Mockoon env file to WireMock mappings
	node scripts/converter.js to-wiremock --input .mockoon-env.json --mocks-dir ./mocks

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

list-mappings: ## List current WireMock mappings
	@echo "=== WireMock Mappings ==="
	@ls -la mocks/mappings/*.json 2>/dev/null || echo "No mappings found"
	@echo ""
	@echo "=== Response Files ==="
	@ls -la mocks/__files/ 2>/dev/null || echo "No response files found"

clean: ## Remove all generated mocks and stop containers
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy --profile postgres --profile mysql --profile adminer --profile cloudbeaver --profile hoppscotch --profile ai --profile pact --profile toxiproxy --profile kafka --profile rabbitmq --profile gripmock --profile monitoring --profile jaeger --profile localstack --profile minio --profile keycloak --profile zitadel down -v 2>/dev/null || true
	rm -f .mockoon-env.json

clean-mocks: ## Remove all mock files (careful!)
	rm -f mocks/mappings/*.json
	rm -f mocks/__files/*
	@echo "All mocks cleaned."

down: ## Stop all containers
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy --profile postgres --profile mysql down
