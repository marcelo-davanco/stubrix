# Docker Guide — Stubrix

## Pré-requisitos

- Docker + Docker Compose plugin (`docker compose` — sem hífen)
- Arquivo `.env` configurado a partir do `.env.example`

```bash
cp .env.example .env
```

---

## 1. Stack completo (recomendado)

Sobe o control plane (API + UI), engine de mock e PostgreSQL de uma vez:

```bash
# Via Makefile (atalho)
make stack-up

# Equivalente direto
docker compose --profile control-plane --profile wiremock --profile postgres up -d
```

| URL | Serviço |
|-----|---------|
| http://localhost:9090 | Stubrix — Dashboard + API |
| http://localhost:9090/api/docs | Swagger UI |
| http://localhost:8081 | Mock engine (WireMock ou Mockoon) |
| http://localhost:5442 | PostgreSQL |

---

## 2. Escolha do mock engine

Defina `MOCK_ENGINE` no `.env` antes de subir:

```bash
# WireMock (Java) — padrão, tem admin API completa
MOCK_ENGINE=wiremock

# Mockoon (Node.js) — leve, converte mocks automaticamente
MOCK_ENGINE=mockoon
```

Suba o engine correspondente:

```bash
# WireMock
docker compose --profile control-plane --profile wiremock up -d
make stack-up   # atalho — usa MOCK_ENGINE=wiremock

# Mockoon
docker compose --profile control-plane --profile mockoon up -d
```

> **Importante:** Os dois engines **não rodam simultaneamente** — ambos usam a porta `8081`.

---

## 3. Control plane isolado

Sobe apenas a API + UI sem mock engine:

```bash
make stubrix-up
# ou
docker compose --profile control-plane up -d
```

---

## 4. Profiles disponíveis

### Mock engines

| Profile | Serviço | Porta | Comando Make |
|---------|---------|-------|--------------|
| `wiremock` | WireMock | :8081 | `make wiremock` |
| `mockoon` | Mockoon CLI | :8081 | `make mockoon` |
| `wiremock-record` | WireMock em modo gravação | :8081 | `make wiremock-record PROXY_TARGET=<url>` |
| `mockoon-proxy` | Mockoon em modo proxy | :8081 | `make mockoon-proxy PROXY_TARGET=<url>` |

### Bancos de dados

| Profile | Serviço | Porta | Comando Make |
|---------|---------|-------|--------------|
| `postgres` | PostgreSQL 17 | :5442 | `make postgres` |
| `mysql` | MySQL 8 | :3307 | `make mysql` |
| `adminer` | Adminer UI | :8084 | `make adminer-up` |
| `cloudbeaver` | CloudBeaver UI | :8083 | `make cloudbeaver-up` |

### Observabilidade

| Profile | Serviço | Porta | Comando Make |
|---------|---------|-------|--------------|
| `monitoring` | Prometheus + Grafana | :9091 / :3000 | `make monitoring-up` |
| `jaeger` | Jaeger UI + OTLP | :16686 / :4318 | `make jaeger-up` |

### Cloud, IAM, Testes

| Profile | Serviço | Porta | Comando Make |
|---------|---------|-------|--------------|
| `localstack` | LocalStack (AWS) | :4566 | `make localstack-up` |
| `minio` | MinIO + Console | :9000 / :9001 | `make minio-up` |
| `keycloak` | Keycloak | :8180 | `make keycloak-up` |
| `zitadel` | Zitadel | :8085 | `make zitadel-up` |
| `pact` | Pact Broker | :9292 | `make pact-up` |
| `toxiproxy` | Toxiproxy | :8474 | `make toxiproxy-up` |
| `kafka` | Redpanda (Kafka) | :9092 | `make kafka-up` |
| `rabbitmq` | RabbitMQ + UI | :5672 / :15672 | `make rabbitmq-up` |
| `hoppscotch` | Hoppscotch | :3100 | `make hoppscotch` |

---

## 5. Gerenciar serviços pelo Settings Panel

O Settings Panel controla os serviços via Docker sem precisar digitar `docker compose` manualmente.

**Via dashboard:** http://localhost:9090/settings → **Services** → Enable / Disable

**Via API:**

```bash
# Habilitar um serviço (sobe o container automaticamente)
curl -X POST http://localhost:9090/api/settings/services/postgres/enable

# Desabilitar (para o container)
curl -X POST http://localhost:9090/api/settings/services/postgres/disable

# Habilitar com auto-start na reinicialização
curl -X PATCH http://localhost:9090/api/settings/services/postgres \
  -H "Content-Type: application/json" \
  -d '{"autoStart": true}'

# Listar todos os serviços e status
curl http://localhost:9090/api/settings/services
```

---

## 6. Verificar saúde

```bash
# Status geral da API + engine de mock
curl http://localhost:9090/api/status

# Estado de um serviço específico
curl http://localhost:9090/api/settings/services/mockoon

# Containers em execução
docker compose ps
```

Resposta esperada de `/api/status` com mockoon rodando:

```json
{
  "engine": "mockoon",
  "engineStatus": "running",
  "port": 8081,
  "controlPort": 9090,
  "projects": 1,
  "uptime": 42
}
```

---

## 7. Rebuild após mudanças de código

```bash
# Rebuild + restart do control plane
make stubrix-restart

# Rebuild manual
docker compose build stubrix
docker compose --profile control-plane up -d --force-recreate stubrix

# Rebuild do mock engine (ex: alterou o Dockerfile)
docker compose build mockoon
docker compose --profile mockoon up -d --force-recreate
```

---

## 8. Parar serviços

```bash
# Apenas o control plane
make stubrix-down

# Stack completo (control plane + wiremock + postgres)
make stack-down

# Tudo (todos os profiles ativos)
docker compose down

# Tudo + remover volumes (CUIDADO: apaga dados)
docker compose down -v
```

---

## 9. Variáveis de ambiente relevantes para Docker

Definidas em `.env` e usadas pelos containers:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `MOCK_ENGINE` | `wiremock` | Engine de mock: `wiremock` ou `mockoon` |
| `MOCK_PORT` | `8081` | Porta do mock engine |
| `CONTROL_PORT` | `9090` | Porta da API Stubrix |
| `MOCKS_DIR` | `/app/mocks` | Caminho dos mocks dentro do container (não alterar) |
| `PG_EXTERNAL_PORT` | `5442` | Porta do PostgreSQL mapeada no host |
| `CORS_ORIGIN` | `*` | Origens permitidas na API |

> **Nota:** `WIREMOCK_URL` e `MOCKOON_URL` são gerenciados pelo `docker-compose.yml` automaticamente (`http://wiremock:8081` e `http://mockoon:8081`). Não sobrescrever no `.env` para uso containerizado.

---

## 10. Volumes e dados persistentes

| Volume / Bind | Conteúdo | Path no host |
|---------------|----------|--------------|
| `./mocks` | Mocks (mappings + __files) | `mocks/` |
| `./data` | Config SQLite + histórico | `data/` |
| `./dumps` | Snapshots de banco | `dumps/` |
| `./docker-compose.yml` | Compose file (lido pela API) | raiz do projeto |
| `pg_data` | Dados PostgreSQL | volume Docker gerenciado |

> O arquivo `docker-compose.yml` é montado dentro do container `stubrix-api` em `/app/docker-compose.yml` para que a API consiga orquestrar os outros serviços via `docker compose`.
