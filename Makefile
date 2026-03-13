.PHONY: build wiremock mockoon record record-stop convert-to-mockoon convert-to-wiremock clean help \
        adminer adminer-up adminer-down cloudbeaver cloudbeaver-up cloudbeaver-down db-viewer db-viewer-down

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

all-up: ## Start WireMock + PostgreSQL
	docker compose --profile wiremock --profile postgres up -d

all-down: ## Stop all services
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy --profile postgres --profile mysql --profile adminer --profile cloudbeaver down

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
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy --profile postgres --profile mysql --profile adminer --profile cloudbeaver down -v 2>/dev/null || true
	rm -f .mockoon-env.json

clean-mocks: ## Remove all mock files (careful!)
	rm -f mocks/mappings/*.json
	rm -f mocks/__files/*
	@echo "All mocks cleaned."

down: ## Stop all containers
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy --profile postgres --profile mysql down
