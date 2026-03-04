<div align="center">

<img src="assets/logo.png" alt="Stubrix Logo" width="280" />

# Stubrix

### One mock structure, two engines, one control panel

[![GitHub](https://img.shields.io/github/stars/marcelo-davanco/stubrix?style=social)](https://github.com/marcelo-davanco/stubrix)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](#-quick-start)
[![WireMock](https://img.shields.io/badge/WireMock-3.9.1-6DB33F?logo=java&logoColor=white)](#-mock-engines)
[![Mockoon](https://img.shields.io/badge/Mockoon-CLI-FF6B35?logo=node.js&logoColor=white)](#-mock-engines)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](#-control-panel)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](#-control-panel)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Unified container for running **WireMock** or **Mockoon CLI**, both sharing the same mock structure.
Includes a **control panel** (API + Dashboard) for managing mocks, projects, recordings, and logs visually.

</div>

---

## 🏗️ Architecture Overview

```mermaid
graph LR
    subgraph "📦 Monorepo (npm workspaces)"
        Shared["@stubrix/shared\n(TypeScript types)"]
        API["@stubrix/api\n(NestJS 11)"]
        UI["@stubrix/ui\n(React 19 + Vite)"]
    end

    subgraph "🐳 Docker Container"
        EP["Entrypoint"]
        EP -->|"MOCK_ENGINE=wiremock"| WM["WireMock\n(Java)"]
        EP -->|"MOCK_ENGINE=mockoon"| MK["Mockoon CLI\n(Node.js)"]
        CV["Converter"] -.->|"auto-converts\non startup"| MK
    end

    subgraph "💾 Shared Mock Structure"
        MP["mappings/*.json"]
        FF["__files/*"]
    end

    UI -->|"fetch /api/*"| API
    UI -->|"WebSocket /ws/logs"| API
    API -->|"HTTP /__admin/*"| WM
    Shared -->|"types"| API
    Shared -->|"types"| UI
    API -->|"fs read/write"| MP
    WM <-->|"reads/writes"| MP
    CV <-->|"reads"| MP

    style Shared fill:#6366f1,color:#fff,stroke:#4f46e5
    style API fill:#e0234e,color:#fff,stroke:#be123c
    style UI fill:#61dafb,color:#1a1a2e,stroke:#38bdf8
    style WM fill:#2d6a4f,color:#fff,stroke:#40916c
    style MK fill:#e76f51,color:#fff,stroke:#f4a261
    style CV fill:#457b9d,color:#fff,stroke:#1d3557
    style EP fill:#6c757d,color:#fff,stroke:#495057
    style MP fill:#264653,color:#e6e6e6,stroke:#2a9d8f
    style FF fill:#264653,color:#e6e6e6,stroke:#2a9d8f
```

> **Canonical format** is WireMock (`mappings/` + `__files/`) — the simplest and most universal.
> When Mockoon is activated, the converter automatically generates the native format from mappings.

---

## 📂 Project Structure

```
stubrix/
├── packages/
│   ├── shared/                    Shared TypeScript types (@stubrix/shared)
│   │   └── src/types/               Project, Mock, Log, Recording, Status
│   ├── api/                       NestJS control plane backend (@stubrix/api)
│   │   └── src/
│   │       ├── projects/            Project CRUD + JSON persistence
│   │       ├── mocks/               Mock CRUD + WireMock integration
│   │       ├── recording/           Start/stop/snapshot recording
│   │       ├── logs/                REST + WebSocket (Socket.IO)
│   │       ├── status/              Engine health + mock counts
│   │       └── engine/              WireMock reset + status
│   └── ui/                        React dashboard (@stubrix/ui)
│       └── src/
│           ├── pages/               Dashboard, Projects, Mocks, Recording, Logs
│           ├── components/          Layout, Badge, shared UI
│           └── lib/                 API client, WebSocket client, utils
│
├── mocks/                         Canonical mock structure
│   ├── mappings/                    Route definitions (JSON)
│   └── __files/                     Response body files
│
├── scripts/
│   ├── converter.js               WireMock <-> Mockoon converter
│   ├── entrypoint.sh              Smart Docker entrypoint
│   ├── record.sh                  Recording helper (Admin API)
│   └── import-from-recording.sh   Import mocks from container
│
├── Dockerfile                     Multi-engine Docker image
├── docker-compose.yml             4 profiles available
├── Makefile                       CLI shortcuts for everything
└── .env.example                   Environment variable reference
```

---

## 🖥️ Control Panel

The control panel provides a **visual interface** for managing the entire mock lifecycle — no manual JSON editing or curl commands required.

```mermaid
graph TD
    subgraph "🖥️ Dashboard UI"
        PP["📁 Projects\n(list + create)"]
        DP["📊 Dashboard\n(stats + quick actions)"]
        MP["📄 Mocks\n(list + search + delete)"]
        ME["✏️ Mock Editor\n(create/edit form)"]
        RP["🎥 Recording\n(start/stop controls)"]
        LP["📜 Logs\n(real-time table)"]
    end

    subgraph "⚙️ API Endpoints"
        P["/api/projects"]
        M["/api/projects/:id/mocks"]
        R["/api/projects/:id/recording"]
        L["/api/logs"]
        S["/api/status"]
        E["/api/engine"]
        WS["/ws/logs (WebSocket)"]
    end

    PP -->|"click project"| DP
    DP -->|"View Mocks"| MP
    DP -->|"Record"| RP
    MP -->|"New/Edit"| ME
    LP -.->|"Socket.IO"| WS

    PP --> P
    MP --> M
    ME --> M
    RP --> R
    LP --> L
    DP --> S

    style PP fill:#6366f1,color:#fff,stroke:#4f46e5
    style DP fill:#6366f1,color:#fff,stroke:#4f46e5
    style MP fill:#6366f1,color:#fff,stroke:#4f46e5
    style ME fill:#6366f1,color:#fff,stroke:#4f46e5
    style RP fill:#6366f1,color:#fff,stroke:#4f46e5
    style LP fill:#6366f1,color:#fff,stroke:#4f46e5
```

### Tech Stack

| Layer | Technology |
|:------|:-----------|
| **API** | NestJS 11 + Express, WebSockets (Socket.IO) |
| **UI** | React 19 + Vite, TailwindCSS, Lucide icons, React Router |
| **Shared** | TypeScript lib consumed by both API and UI |
| **Validation** | class-validator + class-transformer with nested DTOs |

### Running the Control Panel

```bash
# Install dependencies (from project root)
npm install

# Build shared types
npm run build --workspace=@stubrix/shared

# Start API (port 9090)
npm run start:dev --workspace=@stubrix/api

# Start UI dev server (port 5173, proxies to API)
npm run dev --workspace=@stubrix/ui
```

> The UI dev server proxies `/api/*` and `/ws/*` to the API at `localhost:9090`.
> In production, the UI builds directly into `packages/api/public/` for single-container serving.

---

## 🚀 Quick Start

### 1. Configure `.env`

```bash
cp .env.example .env
```

Edit as needed:

```dotenv
# Mock server port (host + container)
MOCK_PORT=8081

# Real API URL (for recording/proxy)
PROXY_TARGET=https://api.example.com

# CORS allowed origins (comma-separated, or * for all)
CORS_ORIGIN=*
```

> The `.env` file is automatically loaded by `Makefile`, `docker-compose`, and scripts.

### 2. Build the image

```bash
make build
```

### 3. Choose an engine and start

```bash
make wiremock     # or
make mockoon
```

### 4. Test

```bash
curl http://localhost:8081/api/health
# → {"status": "ok", "engine": "mock-server"}
```

> To change the port without editing `.env`: `MOCK_PORT=9090 make wiremock`

---

## 🎥 Mock Recording

The most important feature. Allows **creating mocks automatically** from a real API.

### How recording works

```mermaid
sequenceDiagram
    participant App as Your App / Browser
    participant WM as Mock Server<br/>(localhost:8081)
    participant API as Real API<br/>(api.example.com)

    Note over WM: RECORD mode active

    App->>WM: GET /api/users
    WM->>API: GET /api/users (proxy)
    API-->>WM: 200 OK [{...}]
    WM-->>App: 200 OK [{...}]

    Note over WM: Auto-saves:<br/>mappings/api_users_get.json<br/>__files/body-api_users.json

    App->>WM: POST /api/orders
    WM->>API: POST /api/orders (proxy)
    API-->>WM: 201 Created {...}
    WM-->>App: 201 Created {...}

    Note over WM: Auto-saves:<br/>mappings/api_orders_post.json

    Note over App,API: After stopping recording,<br/>mocks work fully offline
```

---

### Option A — Automatic Recording (simplest)

Everything passing through the proxy is recorded automatically.

```bash
# 1. Start in recording mode pointing to the real API
make wiremock-record PROXY_TARGET=https://api.example.com

# 2. Make requests normally
curl http://localhost:8081/api/users
curl http://localhost:8081/api/products/42
curl -X POST http://localhost:8081/api/orders -d '{"item":"abc"}'

# 3. Stop the container
make down

# 4. Done! Mocks saved in mocks/mappings/
make list-mappings
```

### Option B — Recording via API (more control)

Start/stop recording on demand without restarting the container.

```bash
# 1. Start WireMock normally
make wiremock

# 2. In another terminal, start recording
./scripts/record.sh start https://api.example.com

# 3. Make your calls
curl http://localhost:8081/api/users
curl http://localhost:8081/api/config

# 4. Stop recording (mocks are persisted)
./scripts/record.sh stop

# 5. Check recorded mocks
make list-mappings
```

### Option C — Snapshot (point-in-time capture)

Captures the current state of all responses without continuous recording.

```bash
./scripts/record.sh snapshot
```

### Option D — Via Control Panel

Use the dashboard UI to manage recordings visually:

1. Open `http://localhost:5173` (dev) or `http://localhost:9090` (production)
2. Navigate to a project → **Recording**
3. Enter the proxy target URL and click **Start Recording**
4. Make requests against `localhost:8081`
5. Click **Stop** or **Snapshot** to persist mocks

---

## 🔄 Complete Workflow

```mermaid
graph TD
    A["1 - Start recording"] --> B["2 - Make requests<br/>against real API"]
    B --> C["3 - Stop recording"]
    C --> D["4 - Mocks saved<br/>in mappings/"]
    D --> E{"Edit mocks?"}
    E -->|"Yes"| F["5a - Edit via Dashboard"]
    E -->|"Yes"| F2["5b - Edit JSON manually"]
    E -->|"No"| G["6 - Use offline"]
    F --> G
    F2 --> G

    G --> H{"Which engine?"}
    H -->|"WireMock"| I["make wiremock"]
    H -->|"Mockoon"| J["make mockoon"]

    I --> K["Mocks served<br/>on localhost:8081"]
    J --> K

    style A fill:#e76f51,color:#fff,stroke:#f4a261
    style B fill:#e9c46a,color:#1a1a2e,stroke:#f4a261
    style C fill:#2a9d8f,color:#fff,stroke:#264653
    style D fill:#264653,color:#e6e6e6,stroke:#2a9d8f
    style F fill:#6366f1,color:#fff,stroke:#4f46e5
    style F2 fill:#457b9d,color:#fff,stroke:#1d3557
    style G fill:#6c757d,color:#fff,stroke:#495057
    style I fill:#2d6a4f,color:#fff,stroke:#40916c
    style J fill:#e76f51,color:#fff,stroke:#f4a261
    style K fill:#1a1a2e,color:#e6e6e6,stroke:#16213e
```

---

## 🔀 Proxy Mode (Mockoon)

Mockoon can work in **hybrid proxy mode**: routes with a defined mock return the mock, routes without one are forwarded to the real API.

```mermaid
graph LR
    App["App / Browser"] --> MK["Mockoon<br/>localhost:8081"]

    MK -->|"Route with mock"| Mock["Mock<br/>Response"]
    MK -->|"Route without mock"| API["Real API<br/>(proxy)"]
    API --> MK

    style App fill:#264653,color:#e6e6e6,stroke:#2a9d8f
    style MK fill:#e76f51,color:#fff,stroke:#f4a261
    style Mock fill:#2d6a4f,color:#fff,stroke:#40916c
    style API fill:#457b9d,color:#fff,stroke:#1d3557
```

```bash
make mockoon-proxy PROXY_TARGET=https://api.example.com
```

---

## 📋 Mock Anatomy

### Inline body

```json
{
  "request": {
    "method": "GET",
    "url": "/api/health"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"status\": \"ok\"}"
  }
}
```

> Saved at `mocks/mappings/api_health_get.json`

### External body file

```json
{
  "request": {
    "method": "GET",
    "url": "/api/users"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "bodyFileName": "users.json"
  }
}
```

> Mapping at `mocks/mappings/api_users_get.json`
> Body at `mocks/__files/users.json`

---

## 🔄 Format Conversion

```mermaid
graph LR
    WM["WireMock<br/>mappings/*.json<br/>+ __files/*"] -->|"converter.js<br/>to-mockoon"| MK["Mockoon<br/>.mockoon-env.json"]
    MK -->|"converter.js<br/>to-wiremock"| WM

    style WM fill:#2d6a4f,color:#fff,stroke:#40916c
    style MK fill:#e76f51,color:#fff,stroke:#f4a261
```

```bash
# WireMock → Mockoon
make convert-to-mockoon

# Mockoon → WireMock
make convert-to-wiremock
```

> Conversion to Mockoon format happens **automatically** when the Mockoon engine starts. You only need to run it manually if you want to inspect or edit the generated file.

---

## 📖 Command Reference

### Serving Mocks

| Command | Engine | Description |
|:--------|:------:|:------------|
| `make wiremock` | WireMock | Serve existing mocks |
| `make mockoon` | Mockoon | Serve existing mocks (auto-converts) |

### Recording

| Command | Description |
|:--------|:------------|
| `make wiremock-record PROXY_TARGET=<url>` | Start WireMock recording all proxied requests |
| `./scripts/record.sh start <url>` | Start recording via Admin API |
| `./scripts/record.sh stop` | Stop recording and persist mocks |
| `./scripts/record.sh snapshot` | Point-in-time capture of current state |
| `./scripts/record.sh status` | Check if recording is active |

### Proxy

| Command | Description |
|:--------|:------------|
| `make mockoon-proxy PROXY_TARGET=<url>` | Mockoon hybrid: mock + proxy |

### Conversion

| Command | Description |
|:--------|:------------|
| `make convert-to-mockoon` | Generate `.mockoon-env.json` from mappings |
| `make convert-to-wiremock` | Generate mappings from `.mockoon-env.json` |

### Utilities

| Command | Description |
|:--------|:------------|
| `make build` | Build Docker image |
| `make down` | Stop all containers |
| `make list-mappings` | List mocks and body files |
| `make clean` | Remove containers and generated files |
| `make clean-mocks` | Remove **all** mocks (careful!) |
| `make help` | List all available commands |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|:---------|:-------:|:------------|
| `MOCK_PORT` | `8081` | Port on host and inside container |
| `PROXY_TARGET` | — | Real API URL for proxy/recording |
| `MOCK_ENGINE` | `wiremock` | Engine: `wiremock` or `mockoon` |
| `RECORD_MODE` | `false` | Enable automatic recording (WireMock) |
| `CONTROL_PORT` | `9090` | Control panel API port |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (comma-separated) |

> All variables can be set in `.env` (auto-loaded) or passed inline: `MOCK_PORT=9090 make wiremock`

---

## 🐳 Docker Compose — Profiles

```mermaid
graph TD
    DC["docker-compose.yml"] --> P1["wiremock"]
    DC --> P2["wiremock-record"]
    DC --> P3["mockoon"]
    DC --> P4["mockoon-proxy"]

    P1 --> S1["Serve mocks offline"]
    P2 --> S2["Proxy + record mocks"]
    P3 --> S3["Serve mocks offline"]
    P4 --> S4["Mock + hybrid proxy"]

    style DC fill:#1a1a2e,color:#e6e6e6,stroke:#16213e
    style P1 fill:#2d6a4f,color:#fff,stroke:#40916c
    style P2 fill:#e76f51,color:#fff,stroke:#f4a261
    style P3 fill:#2d6a4f,color:#fff,stroke:#40916c
    style P4 fill:#e76f51,color:#fff,stroke:#f4a261
    style S1 fill:#264653,color:#e6e6e6,stroke:#2a9d8f
    style S2 fill:#264653,color:#e6e6e6,stroke:#2a9d8f
    style S3 fill:#264653,color:#e6e6e6,stroke:#2a9d8f
    style S4 fill:#264653,color:#e6e6e6,stroke:#2a9d8f
```

```bash
# Direct usage (without Makefile)
docker compose --profile wiremock up
docker compose --profile mockoon up
PROXY_TARGET=https://api.example.com docker compose --profile wiremock-record up
PROXY_TARGET=https://api.example.com docker compose --profile mockoon-proxy up
```

---

## 💡 Use Cases

### Offline Development

> I need to work without internet but my app depends on 3 external APIs.

```bash
# 1. With internet, record mocks for each API
make wiremock-record PROXY_TARGET=https://api-users.example.com
# use your app... then stop
make down

# 2. Repeat for other APIs or use the Recording page in the dashboard

# 3. Without internet, serve the mocks
make wiremock
```

### Integration Tests in CI

> I need stable mocks in my CI pipeline.

```bash
# Record once locally, commit the mocks
make wiremock-record PROXY_TARGET=https://staging.api.com
make down
git add mocks/ && git commit -m "add API mocks"

# In CI
docker compose --profile wiremock up -d
npm test
docker compose --profile wiremock down
```

### Switch Engines Without Rework

> The team decided to migrate from WireMock to Mockoon (or vice-versa).

```bash
# Same mocks, different engine
make wiremock   # before
make mockoon    # after — zero changes to mocks
```

---

## 📚 Guides

| Guide | Description |
|:------|:------------|
| [Recording with PokéAPI + Postman](docs/guide-pokeapi-recording.md) | Full walkthrough: record PokéAPI mocks, serve offline, and use via Postman Collection |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Stubrix** — made with ☕ by [Marcelo Davanço](https://github.com/marcelo-davanco)

</div>
