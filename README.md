<div align="center">

# 🧪 Stubrix

### WireMock + Mockoon — Uma estrutura, dois engines

[![GitHub](https://img.shields.io/github/stars/marcelo-davanco/stubrix?style=social)](https://github.com/marcelo-davanco/stubrix)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](#-quick-start)
[![WireMock](https://img.shields.io/badge/WireMock-3.9.1-6DB33F?logo=java&logoColor=white)](#engines)
[![Mockoon](https://img.shields.io/badge/Mockoon-CLI-FF6B35?logo=node.js&logoColor=white)](#engines)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Container unificado para rodar **WireMock** ou **Mockoon CLI**, ambos compartilhando a mesma estrutura de mocks.  
**Foco principal: gravação rápida de mocks para uso offline.**

</div>

---

## Visão Geral

```mermaid
graph LR
    subgraph Container["Container Docker"]
        direction TB
        EP["Entrypoint"]
        EP -->|"MOCK_ENGINE=wiremock"| WM["WireMock\n(Java)"]
        EP -->|"MOCK_ENGINE=mockoon"| MK["Mockoon CLI\n(Node.js)"]
        CV["Converter"] -.->|"auto-converte\nno startup"| MK
    end

    subgraph Mocks["Estrutura Compartilhada"]
        direction TB
        MP["mappings/*.json"]
        FF["__files/*"]
    end

    WM <-->|"lê/grava"| Mocks
    CV <-->|"lê"| Mocks

    style Container fill:#1a1a2e,stroke:#16213e,color:#e6e6e6
    style Mocks fill:#0f3460,stroke:#533483,color:#e6e6e6
    style WM fill:#2d6a4f,stroke:#40916c,color:#fff
    style MK fill:#e76f51,stroke:#f4a261,color:#fff
    style CV fill:#457b9d,stroke:#1d3557,color:#fff
    style EP fill:#6c757d,stroke:#495057,color:#fff
    style MP fill:#264653,stroke:#2a9d8f,color:#e6e6e6
    style FF fill:#264653,stroke:#2a9d8f,color:#e6e6e6
```

> **Conceito**: O formato canônico é o WireMock (`mappings/` + `__files/`) por ser o mais simples e universal.  
> Quando o Mockoon é ativado, o conversor gera automaticamente o formato nativo a partir dos mappings.

---

## Estrutura do Projeto

```
stubrix/
│
├── mocks/                            Estrutura canônica de mocks
│   ├── mappings/                       Definições de rotas (JSON)
│   │   └── example_health_get.json
│   └── __files/                        Body files referenciados
│       └── users.json
│
├── scripts/
│   ├── converter.js                  Conversor WireMock <-> Mockoon
│   ├── entrypoint.sh                 Entrypoint inteligente
│   ├── record.sh                     Helper de gravação (Admin API)
│   └── import-from-recording.sh      Importar mocks do container
│
├── Dockerfile                        Imagem multi-engine
├── docker-compose.yml                4 profiles disponíveis
├── Makefile                          Atalhos para tudo
└── .env.example                      Variáveis de exemplo
```

---

## Quick Start

### 1. Configure o `.env`

```bash
cp .env.example .env
```

Edite o `.env` conforme necessário:

```dotenv
# Porta do mock server (host + container)
MOCK_PORT=8081

# URL da API real (para gravação/proxy)
PROXY_TARGET=https://api.example.com
```

> O `.env` é carregado automaticamente pelo `Makefile`, `docker-compose` e scripts.

### 2. Build da imagem

```bash
make build
```

### 3. Escolha o engine e inicie

```bash
make wiremock     # ou
make mockoon
```

### 4. Teste

```bash
curl http://localhost:8081/api/health
# → {"status": "ok", "engine": "mock-server"}
```

> Para mudar a porta sem editar `.env`: `MOCK_PORT=9090 make wiremock`

---

## Gravação de Mocks

A funcionalidade mais importante deste projeto. Permite **criar mocks automaticamente** a partir de uma API real.

### Como a gravação funciona

```mermaid
sequenceDiagram
    participant App as Sua App / Browser
    participant WM as Mock Server<br/>(localhost:8081)
    participant API as API Real<br/>(api.example.com)

    Note over WM: Modo RECORD ativado

    App->>WM: GET /api/users
    WM->>API: GET /api/users (proxy)
    API-->>WM: 200 OK [{...}]
    WM-->>App: 200 OK [{...}]

    Note over WM: Salva automaticamente:<br/>mappings/api_users_get.json<br/>__files/body-api_users.json

    App->>WM: POST /api/orders
    WM->>API: POST /api/orders (proxy)
    API-->>WM: 201 Created {...}
    WM-->>App: 201 Created {...}

    Note over WM: Salva automaticamente:<br/>mappings/api_orders_post.json

    Note over App,API: Depois de parar a gravação,<br/>os mocks funcionam offline
```

---

### Opção A — Gravação Automática (mais simples)

Tudo que passar pelo proxy é gravado automaticamente.

```bash
# 1. Inicie em modo gravação apontando para a API real
make wiremock-record PROXY_TARGET=https://api.example.com

# 2. Faça requisições normalmente
curl http://localhost:8081/api/users
curl http://localhost:8081/api/products/42
curl -X POST http://localhost:8081/api/orders -d '{"item":"abc"}'

# 3. Pare o container
make down

# 4. Pronto! Mocks gravados em mocks/mappings/
make list-mappings
```

### Opção B — Gravação via API (mais controle)

Permite iniciar/parar a gravação sob demanda, sem reiniciar o container.

```bash
# 1. Inicie o WireMock normalmente
make wiremock

# 2. Em outro terminal, inicie a gravação
./scripts/record.sh start https://api.example.com

# 3. Faça suas chamadas
curl http://localhost:8081/api/users
curl http://localhost:8081/api/config

# 4. Pare a gravação (mocks são persistidos)
./scripts/record.sh stop

# 5. Verifique os mocks gravados
make list-mappings
```

### Opção C — Snapshot (captura pontual)

Captura o estado atual de todas as respostas sem modo de gravação contínua.

```bash
./scripts/record.sh snapshot
```

---

## Fluxo de Trabalho Completo

```mermaid
graph TD
    A["1 - Inicia gravação"] --> B["2 - Faz requisições<br/>contra a API real"]
    B --> C["3 - Para a gravação"]
    C --> D["4 - Mocks salvos<br/>em mappings/"]
    D --> E{"Editar mocks?"}
    E -->|"Sim"| F["5 - Edita JSONs<br/>manualmente"]
    E -->|"Não"| G["6 - Usa offline"]
    F --> G

    G --> H{"Qual engine?"}
    H -->|"WireMock"| I["make wiremock"]
    H -->|"Mockoon"| J["make mockoon"]

    I --> K["Mocks servidos<br/>em localhost:8081"]
    J --> K

    style A fill:#e76f51,color:#fff,stroke:#f4a261
    style B fill:#e9c46a,color:#1a1a2e,stroke:#f4a261
    style C fill:#2a9d8f,color:#fff,stroke:#264653
    style D fill:#264653,color:#e6e6e6,stroke:#2a9d8f
    style F fill:#457b9d,color:#fff,stroke:#1d3557
    style G fill:#6c757d,color:#fff,stroke:#495057
    style I fill:#2d6a4f,color:#fff,stroke:#40916c
    style J fill:#e76f51,color:#fff,stroke:#f4a261
    style K fill:#1a1a2e,color:#e6e6e6,stroke:#16213e
```

---

## Proxy Mode (Mockoon)

O Mockoon pode funcionar em modo **proxy híbrido**: rotas com mock definido retornam o mock, rotas sem mock são encaminhadas para a API real.

```mermaid
graph LR
    App["App / Browser"] --> MK["Mockoon<br/>localhost:8081"]

    MK -->|"Rota com mock"| Mock["Resposta<br/>do mock"]
    MK -->|"Rota sem mock"| API["API Real<br/>(proxy)"]
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

## Anatomia de um Mock

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

> Salvo em `mocks/mappings/api_health_get.json`

### Body em arquivo externo

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

> Mapping em `mocks/mappings/api_users_get.json`  
> Body em `mocks/__files/users.json`

---

## Conversão entre Formatos

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

> A conversão para Mockoon acontece **automaticamente** quando o engine Mockoon é iniciado. Você só precisa rodar manualmente se quiser inspecionar ou editar o arquivo gerado.

---

## Referência de Comandos

### Servir Mocks

| Comando | Engine | Descrição |
|:--------|:------:|:----------|
| `make wiremock` | WireMock | Serve mocks existentes |
| `make mockoon` | Mockoon | Serve mocks existentes (auto-converte) |

### Gravação

| Comando | Descrição |
|:--------|:----------|
| `make wiremock-record PROXY_TARGET=<url>` | Inicia WireMock gravando tudo via proxy |
| `./scripts/record.sh start <url>` | Inicia gravação via Admin API |
| `./scripts/record.sh stop` | Para gravação e persiste mocks |
| `./scripts/record.sh snapshot` | Captura pontual do estado atual |
| `./scripts/record.sh status` | Verifica se está gravando |

### Proxy

| Comando | Descrição |
|:--------|:----------|
| `make mockoon-proxy PROXY_TARGET=<url>` | Mockoon híbrido: mock + proxy |

### Conversão

| Comando | Descrição |
|:--------|:----------|
| `make convert-to-mockoon` | Gera `.mockoon-env.json` a partir dos mappings |
| `make convert-to-wiremock` | Gera mappings a partir de `.mockoon-env.json` |

### Utilitários

| Comando | Descrição |
|:--------|:----------|
| `make build` | Build da imagem Docker |
| `make down` | Para todos os containers |
| `make list-mappings` | Lista mocks e body files existentes |
| `make clean` | Remove containers e arquivos gerados |
| `make clean-mocks` | Remove **todos** os mocks (cuidado!) |
| `make help` | Lista todos os comandos disponíveis |

---

## Variáveis de Ambiente

| Variável | Default | Descrição |
|:---------|:-------:|:----------|
| `MOCK_PORT` | `8081` | Porta no host e dentro do container |
| `PROXY_TARGET` | — | URL da API real para proxy/gravação |
| `MOCK_ENGINE` | `wiremock` | Engine: `wiremock` ou `mockoon` |
| `RECORD_MODE` | `false` | Ativa gravação automática (WireMock) |

> Todas as variáveis podem ser definidas no `.env` (carregado automaticamente) ou passadas inline: `MOCK_PORT=9090 make wiremock`

---

## Docker Compose — Profiles

```mermaid
graph TD
    DC["docker-compose.yml"] --> P1["wiremock"]
    DC --> P2["wiremock-record"]
    DC --> P3["mockoon"]
    DC --> P4["mockoon-proxy"]

    P1 --> S1["Serve mocks offline"]
    P2 --> S2["Proxy + grava mocks"]
    P3 --> S3["Serve mocks offline"]
    P4 --> S4["Mock + proxy híbrido"]

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
# Uso direto (sem Makefile)
docker compose --profile wiremock up
docker compose --profile mockoon up
PROXY_TARGET=https://api.example.com docker compose --profile wiremock-record up
PROXY_TARGET=https://api.example.com docker compose --profile mockoon-proxy up
```

---

## Cenários de Uso

### Desenvolvimento Offline

> Preciso trabalhar sem internet mas minha app depende de 3 APIs externas.

```bash
# 1. Com internet, grave os mocks de cada API
make wiremock-record PROXY_TARGET=https://api-users.example.com
# use a app... depois pare
make down

# 2. Repita para outras APIs ou use record via API para múltiplas

# 3. Sem internet, sirva os mocks
make wiremock
```

### Testes de Integração em CI

> Preciso de mocks estáveis no pipeline de CI.

```bash
# Grave uma vez localmente, commite os mocks
make wiremock-record PROXY_TARGET=https://staging.api.com
make down
git add mocks/ && git commit -m "add API mocks"

# No CI
docker compose --profile wiremock up -d
npm test
docker compose --profile wiremock down
```

### Trocar de Engine sem Retrabalho

> O time decidiu migrar de WireMock para Mockoon (ou vice-versa).

```bash
# Mesmos mocks, engine diferente
make wiremock   # antes
make mockoon    # depois — zero mudanças nos mocks
```

---

## Guias Práticos

| Guia | Descrição |
|:-----|:----------|
| [Gravação com PokéAPI + Postman](docs/guide-pokeapi-recording.md) | Passo a passo completo: gravar mocks da PokéAPI, servir offline e usar via Postman Collection |

---

## Licença

MIT — veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">

**Stubrix** — feito com ☕ por [Marcelo Davanço](https://github.com/marcelo-davanco)

</div>
