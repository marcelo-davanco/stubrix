.PHONY: build wiremock mockoon record record-stop convert-to-mockoon convert-to-wiremock clean help

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
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy down -v 2>/dev/null || true
	rm -f .mockoon-env.json

clean-mocks: ## Remove all mock files (careful!)
	rm -f mocks/mappings/*.json
	rm -f mocks/__files/*
	@echo "All mocks cleaned."

down: ## Stop all containers
	docker compose --profile wiremock --profile mockoon --profile wiremock-record --profile mockoon-proxy down
