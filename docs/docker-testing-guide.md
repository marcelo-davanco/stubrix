# Docker Testing Guide — Stubrix

## 1. Subir o controle plane (API + UI)

```bash
docker-compose --profile stubrix up -d
```

Acesse: **http://localhost:9090**

---

## 2. Subir serviços pelo Settings panel

Acesse **http://localhost:9090/settings** → aba **Services** → clique **Enable** no serviço desejado.

Ou via curl:

```bash
curl -X POST http://localhost:9090/api/settings/services/hoppscotch/enable
```

---

## 3. Subir serviços manualmente por perfil

```bash
# WireMock (mock engine padrão)
docker-compose --profile wiremock up -d

# PostgreSQL
docker-compose --profile postgres up -d

# Hoppscotch
docker-compose --profile hoppscotch up -d   # http://localhost:3100

# Prometheus + Grafana
docker-compose --profile monitoring up -d

# Múltiplos de uma vez
docker-compose --profile stubrix --profile wiremock --profile postgres up -d
```

---

## 4. Verificar saúde

```bash
# API status
curl http://localhost:9090/api/status

# Serviços cadastrados no Settings
curl http://localhost:9090/api/settings/services
```

---

## 5. Rebuild após mudanças de código

```bash
docker-compose --profile stubrix build && docker-compose --profile stubrix up -d
```

---

## 6. Parar tudo

```bash
# Apenas o controle plane
docker-compose --profile stubrix down

# Tudo de uma vez
docker-compose down
```
