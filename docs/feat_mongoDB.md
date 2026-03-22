# Feature: Suporte ao MongoDB — Plano de Implementação

> **Objetivo:** Adicionar suporte completo ao MongoDB no Stubrix, usando `mongodump` e `mongorestore` com as flags `--archive` e `--gzip`, mantendo a arquitetura limpa, baseada em arquivos estáticos e alinhada com os drivers existentes (PostgreSQL, MySQL, SQLite).

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Atual (Referência)](#2-arquitetura-atual-referência)
3. [Decisões de Design](#3-decisões-de-design)
4. [Etapa 1 — Infraestrutura Docker](#etapa-1--infraestrutura-docker)
5. [Etapa 2 — Variáveis de Ambiente](#etapa-2--variáveis-de-ambiente)
6. [Etapa 3 — MongoDB Driver (`mongodb.driver.ts`)](#etapa-3--mongodb-driver-mongodbdriverts)
7. [Etapa 4 — Registrar no Driver Registry](#etapa-4--registrar-no-driver-registry)
8. [Etapa 5 — Integrar no `DbSnapshotsService`](#etapa-5--integrar-no-dbsnapshotsservice)
9. [Etapa 6 — Dockerfile.api (Ferramentas CLI)](#etapa-6--dockerfileapi-ferramentas-cli)
10. [Etapa 7 — Atualizar DTOs e Tipos Compartilhados](#etapa-7--atualizar-dtos-e-tipos-compartilhados)
11. [Etapa 8 — Makefile](#etapa-8--makefile)
12. [Etapa 9 — Testes Unitários](#etapa-9--testes-unitários)
13. [Etapa 10 — MCP Tools](#etapa-10--mcp-tools)
14. [Etapa 11 — Documentação (README / Guides)](#etapa-11--documentação-readme--guides)
15. [Etapa 12 — UI Updates](#etapa-12--ui-updates)
16. [Limitações Conhecidas](#limitações-conhecidas)
17. [Ordem de Implementação (dependências)](#ordem-de-implementação-dependências)
18. [Checklist Final](#checklist-final)
19. [Referências de Comandos](#referências-de-comandos)

---

## 1. Visão Geral

O Stubrix já suporta snapshots de banco de dados para **PostgreSQL** (via `pg_dump`/`psql`), **MySQL** (via `mysqldump`/`mysql`) e **SQLite** (via cópia de arquivo). O MongoDB será o **4º engine** suportado, utilizando as ferramentas nativas `mongodump` e `mongorestore` do pacote `mongodb-database-tools`.

### O "pulo do gato" — `--archive` + `--gzip`

Diferente do comportamento padrão do `mongodump` (que gera uma pasta com múltiplos arquivos `.bson` e `.json` por coleção), as flags `--archive` e `--gzip` forçam a saída para **um único arquivo binário compactado**. Isso:

- ✅ Encaixa perfeitamente na pasta `dumps/mongodb/`
- ✅ Facilita o upload para o MinIO (um arquivo só)
- ✅ Mantém a mesma arquitetura de "um snapshot = um arquivo" dos outros drivers
- ✅ Reduz significativamente o tamanho do arquivo de dump

### Formato do arquivo

```
dumps/mongodb/<label>-<database>-<timestamp>.archive.gz
```

Exemplo: `snapshot-mydb-20260314-171700.archive.gz`

---

## 2. Arquitetura Atual (Referência)

### Padrão de Driver

Cada banco de dados implementa a interface `DatabaseDriverInterface`:

```typescript
// packages/api/src/databases/drivers/database-driver.interface.ts

export interface DatabaseDriverInterface {
  readonly engine: string;
  isConfigured(): boolean;
  healthCheck(): Promise<boolean>;
  listDatabases(overrides?: ConnectionOverrides): Promise<Array<string>>;
  getDatabaseInfo(
    dbName: string,
    overrides?: ConnectionOverrides,
  ): Promise<{
    database: string;
    totalSize: string;
    tables: Array<{ name: string; size: string }>;
  }>;
  createSnapshot?(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void>;
  restoreSnapshot?(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void>;
  executeQuery?(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]>;
}
```

### Registry Pattern

O `DriverRegistryService` agrega todos os drivers:

```typescript
// packages/api/src/databases/drivers/driver-registry.service.ts

@Injectable()
export class DriverRegistryService {
  constructor(
    private readonly postgres: PostgresDriver,
    private readonly mysql: MysqlDriver,
    private readonly sqlite: SqliteDriver,
    // → adicionar: private readonly mongodb: MongodbDriver,
  ) {
    this.drivers = [this.postgres, this.mysql, this.sqlite /*, this.mongodb */];
  }
}
```

### Snapshot File Listing

O `DbSnapshotsService` varre subpastas de `dumps/` para listar snapshots:

```typescript
// Filtro atual (db-snapshots.service.ts)
private listSnapshotFiles(): SnapshotFile[] {
  for (const engine of ['postgres', 'mysql', 'sqlite']) { // → adicionar 'mongodb'
    const engineFiles = fs.readdirSync(engineDir)
      .filter((f) => f.endsWith('.sql') || f.endsWith('.db'));
      // → adicionar: || f.endsWith('.archive.gz')
  }
}
```

### Estrutura de Diretórios

```
dumps/
├── postgres/           ← snapshots PostgreSQL (.sql)
├── mysql/              ← snapshots MySQL (.sql)
├── sqlite/             ← snapshots SQLite (.db)
├── mongodb/            ← NOVO: snapshots MongoDB (.archive.gz)
└── project-databases.sqlite  ← metadata de conexões
```

---

## 3. Decisões de Design

| Decisão                                      | Justificativa                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Usar `mongodump --archive --gzip`            | Um único arquivo binário compactado, compatível com a arquitetura de `dumps/`                                                  |
| Usar `mongorestore --archive --gzip --drop`  | A flag `--drop` garante que as coleções existentes sejam apagadas antes da restauração (equivalente ao `--clean` do `pg_dump`) |
| Extensão `.archive.gz`                       | Facilita a identificação visual do tipo de arquivo e diferencia dos `.sql` e `.db`                                             |
| URI de conexão (`--uri`)                     | Mais seguro e flexível. Evita passar senha via argumentos de linha de comando                                                  |
| Driver via `mongodb` npm package             | Para `healthCheck()`, `listDatabases()`, `getDatabaseInfo()` e `executeQuery()`                                                |
| Ferramentas CLI via `mongodb-database-tools` | Instaladas no `Dockerfile.api` para `createSnapshot()` e `restoreSnapshot()`                                                   |

---

## Etapa 1 — Infraestrutura Docker

### 1.1 Adicionar serviço MongoDB ao `docker-compose.yml`

```yaml
# ─── MongoDB ─────────────────────────────────────────────────
db-mongodb:
  image: mongo:7
  profiles: [mongodb, databases]
  container_name: stubrix-mongodb
  restart: unless-stopped
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER:-stubrix}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-stubrix}
  ports:
    - "${MONGO_EXTERNAL_PORT:-27017}:27017"
  volumes:
    - mongodb-data:/data/db
    - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### 1.2 Adicionar volume

```yaml
volumes:
  # ... volumes existentes ...
  mongodb-data:
```

### 1.3 Criar script de inicialização

Arquivo: `scripts/mongo-init.js`

```javascript
// scripts/mongo-init.js
// Inicializa o banco stubrix com coleções de exemplo

db = db.getSiblingDB("stubrix");

db.createCollection("USERS");
db.createCollection("MOCKVALUES");

db.USERS.insertMany([
  {
    name: "Alice",
    email: "alice@example.com",
    role: "admin",
    createdAt: new Date(),
  },
  {
    name: "Bob",
    email: "bob@example.com",
    role: "user",
    createdAt: new Date(),
  },
]);

db.MOCKVALUES.insertMany([
  { key: "api_timeout", value: 5000, environment: "development" },
  { key: "max_retries", value: 3, environment: "production" },
]);

print(
  "✅ MongoDB initialized: stubrix database with USERS and MOCKVALUES collections",
);
```

### 1.4 Adicionar dependência no serviço Stubrix

No serviço `stubrix` do `docker-compose.yml`, adicionar variáveis de ambiente **e** dependência condicional (mesmo padrão do PostgreSQL):

```yaml
stubrix:
  environment:
    # ... variáveis existentes ...
    # MongoDB
    MONGO_HOST: ${MONGO_HOST:-db-mongodb}
    MONGO_PORT: ${MONGO_PORT:-27017}
    MONGO_USER: ${MONGO_USER:-stubrix}
    MONGO_PASSWORD: ${MONGO_PASSWORD:-stubrix}
    MONGO_DATABASE: ${MONGO_DATABASE:-stubrix}
  depends_on:
    # ... depends_on existentes ...
    db-mongodb:
      condition: service_healthy
      required: false
```

> **Nota:** O `required: false` permite que o Stubrix suba sem MongoDB (quando o profile `mongodb` não está ativo), seguindo o mesmo padrão usado para `db-postgres` e `db-mysql`.

---

## Etapa 2 — Variáveis de Ambiente

### 2.1 Adicionar ao `.env.example`

```dotenv
# ─── MongoDB ──────────────────────────────────────────────────
# Local dev: connect to host-mapped port 27017
MONGO_HOST=localhost
MONGO_PORT=27017
# Docker: MONGO_HOST=db-mongodb  /  MONGO_PORT=27017

MONGO_USER=stubrix
MONGO_PASSWORD=stubrix
MONGO_DATABASE=stubrix
MONGO_EXTERNAL_PORT=27017                   # Host-mapped port for docker-compose
```

### 2.2 Adicionar ao `.env`

Mesmas variáveis com valores de desenvolvimento local.

---

## Etapa 3 — MongoDB Driver (`mongodb.driver.ts`)

### Arquivo: `packages/api/src/databases/drivers/mongodb.driver.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFileSync } from "child_process";
import { MongoClient } from "mongodb";
import type {
  ConnectionOverrides,
  DatabaseDriverInterface,
} from "./database-driver.interface";

@Injectable()
export class MongodbDriver implements DatabaseDriverInterface {
  readonly engine = "mongodb";
  private readonly logger = new Logger(MongodbDriver.name);

  private readonly host: string | undefined;
  private readonly port: string;
  private readonly user: string;
  private readonly password: string;
  private readonly database: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>("MONGO_HOST");
    this.port = this.config.get<string>("MONGO_PORT") ?? "27017";
    this.user = this.config.get<string>("MONGO_USER") ?? "stubrix";
    this.password = this.config.get<string>("MONGO_PASSWORD") ?? "stubrix";
    this.database = this.config.get<string>("MONGO_DATABASE") ?? "stubrix";
  }

  /**
   * Constrói a URI de conexão MongoDB.
   * Formato: mongodb://user:pass@host:port/database?authSource=admin
   */
  private buildUri(database?: string, overrides?: ConnectionOverrides): string {
    const h = overrides?.host ?? this.host;
    const p = overrides?.port ?? this.port;
    const u = encodeURIComponent(overrides?.username ?? this.user);
    const pw = encodeURIComponent(overrides?.password ?? this.password);
    const db = database ?? this.database;
    return `mongodb://${u}:${pw}@${h}:${p}/${db}?authSource=admin`;
  }

  isConfigured(): boolean {
    return Boolean(this.host);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const client = new MongoClient(this.buildUri());
    try {
      await client.connect();
      await client.db().admin().ping();
      return true;
    } catch {
      return false;
    } finally {
      await client.close();
    }
  }

  async listDatabases(overrides?: ConnectionOverrides): Promise<string[]> {
    const client = new MongoClient(this.buildUri(undefined, overrides));
    try {
      await client.connect();
      const result = await client.db().admin().listDatabases();
      return result.databases
        .map((db) => db.name)
        .filter((name) => !["admin", "config", "local"].includes(name));
    } finally {
      await client.close();
    }
  }

  async getDatabaseInfo(
    dbName: string,
    overrides?: ConnectionOverrides,
  ): Promise<{
    database: string;
    totalSize: string;
    tables: Array<{ name: string; size: string }>;
  }> {
    const client = new MongoClient(this.buildUri(dbName, overrides));
    try {
      await client.connect();
      const db = client.db(dbName);
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();

      const tables: Array<{ name: string; size: string }> = [];
      for (const col of collections) {
        try {
          const colStats = await db.collection(col.name).stats();
          const sizeMb = (colStats.size / (1024 * 1024)).toFixed(2);
          tables.push({ name: col.name, size: `${sizeMb} MB` });
        } catch {
          tables.push({ name: col.name, size: "n/a" });
        }
      }

      const totalSizeMb = (stats.dataSize / (1024 * 1024)).toFixed(2);
      return {
        database: dbName,
        totalSize: `${totalSizeMb} MB`,
        tables,
      };
    } finally {
      await client.close();
    }
  }

  async executeQuery(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const client = new MongoClient(this.buildUri());
    try {
      await client.connect();
      const db = client.db(this.database);

      // Tenta parsear como JSON (find query simplificado)
      // Formato esperado: { "collection": "USERS", "filter": { "name": "Alice" } }
      const parsed = JSON.parse(query) as {
        collection: string;
        filter?: Record<string, unknown>;
      };
      const collection = db.collection(parsed.collection);
      const filter = parsed.filter ?? params ?? {};
      const result = await collection.find(filter).limit(100).toArray();
      return result as Record<string, unknown>[];
    } finally {
      await client.close();
    }
  }

  /**
   * Cria um snapshot usando mongodump --archive --gzip
   *
   * O comando gera um ÚNICO arquivo binário compactado,
   * encaixando perfeitamente na estrutura dumps/mongodb/.
   */
  async createSnapshot(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("MongoDB driver is not configured");
    }

    try {
      const uri = this.buildUri(database, overrides);
      const args = [`--uri=${uri}`, `--archive=${filepath}`, "--gzip"];

      this.logger.log(`Creating MongoDB snapshot: ${database} -> ${filepath}`);
      execFileSync("mongodump", args, { stdio: "pipe" });
      this.logger.log(`MongoDB snapshot created successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to create MongoDB snapshot: ${error.message}`);
      throw new Error(`MongoDB snapshot failed: ${error.message}`);
    }
  }

  /**
   * Restaura um snapshot usando mongorestore --archive --gzip --drop
   *
   * A flag --drop é OBRIGATÓRIA (Harness Engineering).
   * Garante que antes de restaurar o BSON, o MongoDB apague
   * as coleções existentes, evitando dados duplicados.
   */
  async restoreSnapshot(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("MongoDB driver is not configured");
    }

    try {
      const uri = this.buildUri(database, overrides);
      const args = [
        `--uri=${uri}`,
        `--archive=${filepath}`,
        "--gzip",
        "--drop",
      ];

      this.logger.log(`Restoring MongoDB snapshot: ${filepath} -> ${database}`);
      execFileSync("mongorestore", args, { stdio: "pipe" });
      this.logger.log(`MongoDB snapshot restored successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to restore MongoDB snapshot: ${error.message}`);
      throw new Error(`MongoDB restore failed: ${error.message}`);
    }
  }
}
```

### Destaques do Driver

| Aspecto                | Detalhe                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Conexão**            | Usa `MongoClient` do pacote `mongodb` para health check, listDatabases, getDatabaseInfo e executeQuery |
| **Snapshot**           | Usa `mongodump` CLI com `--archive` + `--gzip` → arquivo único                                         |
| **Restore**            | Usa `mongorestore` CLI com `--archive` + `--gzip` + `--drop` → limpa antes de restaurar                |
| **URI**                | Senha embutida na URI (evita passar via argumento de CLI) com `authSource=admin`                       |
| **Tables/Collections** | O campo `tables[]` retorna as **coleções** do MongoDB (mapeamento semântico)                           |

---

## Etapa 4 — Registrar no Driver Registry

### Arquivo: `packages/api/src/databases/drivers/driver-registry.service.ts`

```diff
 import { Injectable } from '@nestjs/common';
 import { PostgresDriver } from './postgres.driver';
 import { MysqlDriver } from './mysql.driver';
 import { SqliteDriver } from './sqlite.driver';
+import { MongodbDriver } from './mongodb.driver';
 import type { DatabaseDriverInterface } from './database-driver.interface';

 @Injectable()
 export class DriverRegistryService {
   private readonly drivers: DatabaseDriverInterface[];

   constructor(
     private readonly postgres: PostgresDriver,
     private readonly mysql: MysqlDriver,
     private readonly sqlite: SqliteDriver,
+    private readonly mongodb: MongodbDriver,
   ) {
-    this.drivers = [this.postgres, this.mysql, this.sqlite];
+    this.drivers = [this.postgres, this.mysql, this.sqlite, this.mongodb];
   }
```

---

## Etapa 5 — Integrar no `DbSnapshotsService`

### 5.1 Constructor — Adicionar diretório MongoDB

> **Decisão de design:** NÃO duplicar variáveis de ambiente do MongoDB no constructor do `DbSnapshotsService`. O `MongodbDriver` já gerencia suas próprias credenciais internamente via `ConfigService`. Os drivers PostgreSQL e MySQL têm credenciais duplicadas no service por razões históricas — evitamos repetir esse anti-pattern.

```diff
 constructor(...) {
   // ... PostgreSQL e MySQL config existente ...

   this.ensureDir(path.join(this.dumpsDir, 'postgres'));
   this.ensureDir(path.join(this.dumpsDir, 'mysql'));
   this.ensureDir(path.join(this.dumpsDir, 'sqlite'));
+  this.ensureDir(path.join(this.dumpsDir, 'mongodb'));
 }
```

### 5.1.1 Fix: `resolveConnectionOverrides()` — campo `user` vs `username`

> **Bug potencial:** O método `resolveConnectionOverrides()` retorna `{ user: string }`, mas o `ConnectionOverrides` da interface usa `username`. Isso causa um bug silencioso onde overrides de conexão nunca são aplicados ao MongoDB. Ao implementar, verificar e corrigir este mapeamento:

```typescript
// Código atual retorna:
return { host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password };
//                                        ^^^^
// O driver MongoDB lê overrides?.username — este campo nunca será preenchido.
// Fix: usar 'username' ao invés de 'user', ou ajustar o driver para ler 'user'.
```

### 5.2 `listSnapshotFiles()` — Incluir engine `mongodb` e extensão `.archive.gz`

```diff
 private listSnapshotFiles(): SnapshotFile[] {
-  for (const engine of ['postgres', 'mysql', 'sqlite']) {
+  for (const engine of ['postgres', 'mysql', 'sqlite', 'mongodb']) {
     const engineFiles = fs.readdirSync(engineDir)
-      .filter((f: string) => f.endsWith('.sql') || f.endsWith('.db'));
+      .filter((f: string) =>
+        f.endsWith('.sql') || f.endsWith('.db') || f.endsWith('.archive.gz')
+      );
   }
 }
```

### 5.3 `create()` — Adicionar branch para MongoDB

```diff
 async create(dto, engineParam?): Promise<CreateSnapshotResponse> {
   // ...
-  const extension = driver.engine === 'sqlite' ? 'db' : 'sql';
+  const extension =
+    driver.engine === 'sqlite' ? 'db' :
+    driver.engine === 'mongodb' ? 'archive.gz' : 'sql';

   // ... após o bloco de sqlite ...

+  } else if (driver.engine === 'mongodb') {
+    const envOverrides = this.resolveConnectionOverrides(
+      projectId, dto.connectionId, driver.engine,
+    );
+    if (driver.createSnapshot) {
+      await driver.createSnapshot(database, filepath, envOverrides);
+    } else {
+      throw new Error('MongoDB driver does not support snapshots');
+    }
   }
 }
```

### 5.3.1 Fix: `update()` — `path.extname()` e `.archive.gz`

> **Bug potencial:** O método `update()` do `DbSnapshotsService` usa `path.extname(name)` para obter a extensão ao renomear snapshots. Para arquivos `.archive.gz`, `path.extname()` retorna apenas `.gz`, não `.archive.gz`. Isso quebrará a lógica de renomeação. Ao implementar, corrigir com uma helper function:

```typescript
// Helper sugerida:
function getSnapshotExtension(filename: string): string {
  if (filename.endsWith('.archive.gz')) return '.archive.gz';
  return path.extname(filename); // .sql ou .db
}
```

### 5.4 `restore()` — Adicionar branch para MongoDB

```diff
 async restore(name, dto, engineParam?): Promise<RestoreSnapshotResponse> {
   // ... após o bloco de sqlite ...

+  } else if (engine === 'mongodb') {
+    const overrides = this.resolveConnectionOverrides(
+      dto.projectId ?? null, dto.connectionId, engine,
+    );
+    const mongodbDriver = this.registry.get('mongodb');
+    if (mongodbDriver?.restoreSnapshot) {
+      await mongodbDriver.restoreSnapshot(database, snapshot.filepath, overrides);
+      return {
+        message: `Snapshot "${name}" restored to database "${database}"`,
+        engine,
+      };
+    } else {
+      throw new Error('MongoDB driver does not support restore');
+    }
   }
 }
```

---

## Etapa 6 — Dockerfile.api (Ferramentas CLI)

### Instalar `mongodb-database-tools` no Stage 4 (production)

O pacote `mongodb-database-tools` contém `mongodump` e `mongorestore`.

```diff
 FROM node:25-slim AS production

 WORKDIR /app

 ENV NODE_ENV=production \
   CONTROL_PORT=9090

 RUN apt-get update && apt-get install -y --no-install-recommends \
   curl ca-certificates gnupg lsb-release && \
+  # MongoDB Database Tools (mongodump, mongorestore)
+  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
+    gpg --dearmor -o /etc/apt/keyrings/mongodb-server-7.0.gpg && \
+  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
+    > /etc/apt/sources.list.d/mongodb-org-7.0.list && \
+  apt-get update && \
+  apt-get install -y --no-install-recommends mongodb-database-tools && \
   # Docker CLI
   install -m 0755 -d /etc/apt/keyrings && \
   curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
   # ... restante permanece igual ...
```

> **Nota:** O pacote `mongodb-database-tools` é independente do `mongod` server. Ele instala apenas as ferramentas CLI: `mongodump`, `mongorestore`, `mongoexport`, `mongoimport`, `mongotop`, `mongostat`, etc.

### Verificação pós-build

```bash
docker exec stubrix mongodump --version
docker exec stubrix mongorestore --version
```

---

## Etapa 7 — Atualizar DTOs e Tipos Compartilhados

### 7.1 `UpsertProjectDatabaseDto` — Adicionar `'mongodb'` como engine válido

```diff
 // packages/api/src/databases/dto/upsert-project-database.dto.ts
 export class UpsertProjectDatabaseDto {
   @IsString()
-  @IsIn(['postgres', 'mysql', 'sqlite'])
-  engine!: 'mysql' | 'postgres' | 'sqlite';
+  @IsIn(['postgres', 'mysql', 'sqlite', 'mongodb'])
+  engine!: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';
 }
```

### 7.2 `ProjectDatabaseConfig` — Atualizar tipo de engine

```diff
 // packages/api/src/databases/project-database-config.service.ts
 export interface ProjectDatabaseConfig {
   // ...
-  engine: 'postgres' | 'mysql' | 'sqlite';
+  engine: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
 }
```

### 7.3 `StateEngine` — Adicionar `'mongodb'` ao tipo de stateful mocks

> **Item faltante no plano original.** O tipo `StateEngine` em `create-stateful-mock.dto.ts` precisa incluir `'mongodb'` se quisermos suportar stateful mocks com MongoDB como state engine.

```diff
 // packages/api/src/stateful-mocks/dto/create-stateful-mock.dto.ts
-export type StateEngine = 'postgres' | 'mysql' | 'sqlite';
+export type StateEngine = 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
```

E atualizar o validador `@IsEnum` do `StateConfigDto`:

```diff
 @IsString()
-@IsEnum(['postgres', 'mysql', 'sqlite'])
+@IsEnum(['postgres', 'mysql', 'sqlite', 'mongodb'])
 engine!: StateEngine;
```

> **Decisão:** Se o MongoDB NÃO for suportado como state engine inicialmente, documentar essa limitação explicitamente e não alterar este tipo. A decisão deve ser tomada antes da implementação.

### 7.4 `@stubrix/shared` — Não requer mudanças

A interface `Engine` em `packages/shared/src/types/database.ts` já usa `name: string`, então aceita `'mongodb'` automaticamente.

---

## Etapa 8 — Makefile

### 8.1 Adicionar targets MongoDB

```makefile
# ─── MongoDB ────────────────────────────────────────────────
mongodb: ## Start MongoDB
	docker compose --profile mongodb up

mongodb-up: ## Start MongoDB (detached)
	docker compose --profile mongodb up -d

mongodb-down: ## Stop MongoDB
	docker compose --profile mongodb down

mongodb-shell: ## Open mongosh shell
	docker compose exec db-mongodb mongosh -u $${MONGO_USER:-stubrix} -p$${MONGO_PASSWORD:-stubrix}
```

### 8.2 Atualizar `.PHONY`

```diff
 .PHONY: ... \
+        mongodb mongodb-up mongodb-down mongodb-shell
```

### 8.3 Atualizar `all-down` e `clean`

Adicionar `--profile mongodb` nas linhas de `all-down`, `clean` e `down`.

---

## Etapa 9 — Testes Unitários

### Arquivo: `packages/api/src/databases/drivers/mongodb.driver.spec.ts`

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { MongodbDriver } from "./mongodb.driver";
import { execFileSync } from "child_process";

// Mock dependencies
jest.mock("child_process", () => ({
  execFileSync: jest.fn().mockReturnValue(Buffer.from("")),
}));

jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue({
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({ ok: 1 }),
        listDatabases: jest.fn().mockResolvedValue({
          databases: [
            { name: "stubrix" },
            { name: "admin" },
            { name: "local" },
          ],
        }),
      }),
      stats: jest.fn().mockResolvedValue({ dataSize: 1048576 }),
      listCollections: jest.fn().mockReturnValue({
        toArray: jest
          .fn()
          .mockResolvedValue([{ name: "USERS" }, { name: "MOCKVALUES" }]),
      }),
      collection: jest.fn().mockReturnValue({
        stats: jest.fn().mockResolvedValue({ size: 524288 }),
        find: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  })),
}));

describe("MongodbDriver", () => {
  let driver: MongodbDriver;
  let mockExecFileSync: jest.MockedFunction<typeof execFileSync>;

  beforeEach(async () => {
    mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongodbDriver,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const env: Record<string, string> = {
                MONGO_HOST: "localhost",
                MONGO_PORT: "27017",
                MONGO_USER: "testuser",
                MONGO_PASSWORD: "testpass",
                MONGO_DATABASE: "testdb",
              };
              return env[key];
            }),
          },
        },
      ],
    }).compile();

    driver = module.get<MongodbDriver>(MongodbDriver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(driver).toBeDefined();
  });

  describe("engine", () => {
    it("should return mongodb as engine", () => {
      expect(driver.engine).toBe("mongodb");
    });
  });

  describe("isConfigured", () => {
    it("should return true when MONGO_HOST is set", () => {
      expect(driver.isConfigured()).toBe(true);
    });
  });

  describe("healthCheck", () => {
    it("should return true when connection succeeds", async () => {
      const result = await driver.healthCheck();
      expect(result).toBe(true);
    });

    it("should return false when not configured", async () => {
      const noConfigDriver = new MongodbDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      const result = await noConfigDriver.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe("listDatabases", () => {
    it("should return user databases excluding admin, config, local", async () => {
      const result = await driver.listDatabases();
      expect(result).toEqual(["stubrix"]);
    });
  });

  describe("createSnapshot", () => {
    it("should create snapshot using mongodump --archive --gzip", async () => {
      mockExecFileSync.mockReturnValue(Buffer.from(""));

      await driver.createSnapshot("testdb", "/path/to/snapshot.archive.gz");

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "mongodump",
        [
          "--uri=mongodb://testuser:testpass@localhost:27017/testdb?authSource=admin",
          "--archive=/path/to/snapshot.archive.gz",
          "--gzip",
        ],
        { stdio: "pipe" },
      );
    });

    it("should throw error when not configured", async () => {
      const noConfigDriver = new MongodbDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      await expect(
        noConfigDriver.createSnapshot("testdb", "/path/to/snapshot.archive.gz"),
      ).rejects.toThrow("MongoDB driver is not configured");
    });

    it("should throw error when mongodump fails", async () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error("mongodump failed");
      });
      await expect(
        driver.createSnapshot("testdb", "/path/to/snapshot.archive.gz"),
      ).rejects.toThrow("MongoDB snapshot failed: mongodump failed");
    });
  });

  describe("restoreSnapshot", () => {
    it("should restore using mongorestore --archive --gzip --drop", async () => {
      mockExecFileSync.mockReturnValue(Buffer.from(""));

      await driver.restoreSnapshot("testdb", "/path/to/snapshot.archive.gz");

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "mongorestore",
        [
          "--uri=mongodb://testuser:testpass@localhost:27017/testdb?authSource=admin",
          "--archive=/path/to/snapshot.archive.gz",
          "--gzip",
          "--drop",
        ],
        { stdio: "pipe" },
      );
    });

    it("should throw error when not configured", async () => {
      const noConfigDriver = new MongodbDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      await expect(
        noConfigDriver.restoreSnapshot(
          "testdb",
          "/path/to/snapshot.archive.gz",
        ),
      ).rejects.toThrow("MongoDB driver is not configured");
    });

    it("should throw error when mongorestore fails", async () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error("mongorestore failed");
      });
      await expect(
        driver.restoreSnapshot("testdb", "/path/to/snapshot.archive.gz"),
      ).rejects.toThrow("MongoDB restore failed: mongorestore failed");
    });
  });
});
```

---

## Etapa 10 — MCP Tools

### Atualizar `packages/mcp/stubrix-mcp/src/index.js`

Os endpoints da API são genéricos (`/api/db/engines/:engine/snapshots`), mas **5 tools têm descrições hardcoded** que precisam de alteração real de código:

#### 10.1 Tools com descrições a atualizar

| Tool                         | Linha aprox. | Descrição atual                    | Alteração              |
| ---------------------------- | ------------ | ---------------------------------- | ---------------------- |
| `stubrix_list_databases`     | ~321         | `"postgres", "mysql", or "sqlite"` | Adicionar `"mongodb"`  |
| `stubrix_get_database_info`  | ~343         | `"postgres", "mysql", or "sqlite"` | Adicionar `"mongodb"`  |
| `stubrix_create_snapshot`    | ~384         | `"postgres", "mysql", or "sqlite"` | Adicionar `"mongodb"`  |
| `stubrix_restore_snapshot`   | ~415         | `"postgres", "mysql", or "sqlite"` | Adicionar `"mongodb"`  |
| `stubrix_list_db_engines`    | ~309         | `"PostgreSQL, MySQL, SQLite"`      | Adicionar `"MongoDB"`  |

#### 10.2 Prompt a atualizar

O prompt `database-snapshot-cycle` (linha ~634) também hardcoda os engines:

```diff
-  databaseEngine: z.string().optional().describe("Optional: Database engine (postgres, mysql, sqlite)"),
+  databaseEngine: z.string().optional().describe("Optional: Database engine (postgres, mysql, sqlite, mongodb)"),
```

#### 10.3 Diff por tool

```diff
 // stubrix_list_databases
 engine: z.string().optional()
-  .describe('Database engine: "postgres", "mysql", or "sqlite"'),
+  .describe('Database engine: "postgres", "mysql", "sqlite", or "mongodb"'),

 // stubrix_get_database_info
 engine: z.string().optional()
-  .describe('Database engine: "postgres", "mysql", or "sqlite"'),
+  .describe('Database engine: "postgres", "mysql", "sqlite", or "mongodb"'),

 // stubrix_create_snapshot
 engine: z.string().optional()
-  .describe('Database engine: "postgres", "mysql", or "sqlite"'),
+  .describe('Database engine: "postgres", "mysql", "sqlite", or "mongodb"'),

 // stubrix_restore_snapshot
 engine: z.string().optional()
-  .describe('Database engine: "postgres", "mysql", or "sqlite"'),
+  .describe('Database engine: "postgres", "mysql", "sqlite", or "mongodb"'),

 // stubrix_list_db_engines
-  "List all available database engines (PostgreSQL, MySQL, SQLite).",
+  "List all available database engines (PostgreSQL, MySQL, SQLite, MongoDB).",
```

---

## Etapa 11 — Documentação (README / Guides)

### 11.1 Atualizar tabela de Databases no `README.md`

```diff
 ### Databases

 | Profile | Service | Port | Command |
 |---------|---------|------|---------|
 | `postgres` | PostgreSQL 17 | :5442 | `make postgres` |
 | `mysql` | MySQL 8 | :3307 | `make mysql` |
+| `mongodb` | MongoDB 7 | :27017 | `make mongodb` |
 | `adminer` | Adminer UI | :8082 | `make adminer-up` |
 | `cloudbeaver` | CloudBeaver UI | :8083 | `make cloudbeaver-up` |
```

### 11.2 Atualizar seção Database Snapshots no `README.md`

````diff
 ### Database Snapshots (F3/F29)

 Snapshot and restore database state alongside mocks:

 ```bash
 make postgres
 # POST /api/db/engines/postgres/snapshots       — create snapshot (pg_dump)
 # POST /api/db/snapshots/:name/restore           — restore snapshot (psql)
 # GET  /api/db/snapshots?projectId=...           — list project snapshots
+
+make mongodb
+# POST /api/db/engines/mongodb/snapshots         — create snapshot (mongodump --archive --gzip)
+# POST /api/db/snapshots/:name/restore           — restore snapshot (mongorestore --archive --gzip --drop)
````

### 11.3 Atualizar Architecture Overview

```diff
 │  Databases: PostgreSQL · MySQL · SQLite                        │
+│  Databases: PostgreSQL · MySQL · SQLite · MongoDB               │
````

### 11.4 Atualizar referência na seção de requirements

```diff
 - `pg_dump` / `psql` (optional, for real PostgreSQL snapshot/restore)
+- `mongodump` / `mongorestore` (optional, for real MongoDB snapshot/restore — included in Docker image)
```

---

## Etapa 12 — UI Updates

### Atualizar `DatabasesModule` no NestJS

```diff
 // packages/api/src/databases/databases.module.ts
 import { PostgresDriver } from './drivers/postgres.driver';
 import { MysqlDriver } from './drivers/mysql.driver';
 import { SqliteDriver } from './drivers/sqlite.driver';
+import { MongodbDriver } from './drivers/mongodb.driver';

 @Module({
   providers: [
     PostgresDriver,
     MysqlDriver,
     SqliteDriver,
+    MongodbDriver,
     DriverRegistryService,
     // ...
   ],
 })
```

### Atualizar `@stubrix/db-ui` (microfrontend)

O engine `mongodb` retornará `collections` no campo `tables`, o que é semanticamente correto para a UI. Há **6 locais** com engines hardcoded que precisam de uma entrada para `mongodb`:

#### 12.1 `EngineSelector.tsx` — Ícone e cores

```diff
 // packages/db-ui/src/components/EngineSelector.tsx

 const ENGINE_ICON: Record<string, string> = {
   postgres: '🐘',
   mysql: '🐬',
   sqlite: '📁',
+  mongodb: '🍃',
 }

 const ENGINE_COLOR: Record<string, { ring: string; bg: string; text: string; glow: string }> = {
   // ... postgres, mysql, sqlite ...
+  mongodb: {
+    ring: 'ring-green-500/40',
+    bg: 'bg-green-500/10',
+    text: 'text-green-300',
+    glow: 'shadow-green-500/20',
+  },
 }
```

#### 12.2 `ProjectDatabaseConfigs.tsx` — Defaults, estilo e select options

```diff
 // packages/db-ui/src/components/ProjectDatabaseConfigs.tsx

 const ENGINE_DEFAULTS: Record<string, Partial<ConfigFormState>> = {
   postgres: { host: 'localhost', port: '5432' },
   mysql: { host: 'localhost', port: '3306' },
   sqlite: { host: '', port: '' },
+  mongodb: { host: 'localhost', port: '27017' },
 }

 const ENGINE_STYLE: Record<string, { badge: string; icon: string }> = {
   postgres: { badge: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30', icon: '🐘' },
   mysql: { badge: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30', icon: '🐬' },
   sqlite: { badge: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30', icon: '📁' },
+  mongodb: { badge: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/30', icon: '🍃' },
 }

 // No <select> do ConfigForm (linha ~98):
 <option value="postgres">PostgreSQL</option>
 <option value="mysql">MySQL</option>
 <option value="sqlite">SQLite</option>
+<option value="mongodb">MongoDB</option>
```

> **Nota:** O formulário do MongoDB deve exibir campos de Host/Port/User/Password (não é file-based como SQLite). Considerar adicionar `authSource` como campo opcional no futuro.

#### 12.3 `SnapshotForm.tsx` — Label do engine

```diff
 // packages/db-ui/src/components/SnapshotForm.tsx

 const ENGINE_LABEL: Record<string, string> = {
   postgres: '🐘 Postgres',
   mysql: '🐬 MySQL',
   sqlite: '📁 SQLite',
+  mongodb: '🍃 MongoDB',
 }
```

---

## Limitações Conhecidas

| Limitação | Detalhe | Mitigação futura |
| --------- | ------- | ---------------- |
| `executeQuery()` limitado | Só suporta `find` (JSON parse). Aggregation pipelines, `insertMany`, `updateMany` e outros comandos não são suportados inicialmente. | Implementar parser de comandos MongoDB ou aceitar shell syntax. |
| `collection.stats()` deprecated | O método `collection.stats()` usado em `getDatabaseInfo()` está deprecated a partir do MongoDB 6.3+. | Migrar para `$collStats` aggregation stage. |
| Sem suporte a `authSource` customizado | A URI sempre usa `authSource=admin`. Databases com autenticação em outro authSource não funcionarão. | Adicionar campo `authSource` ao `ConnectionOverrides` e UI. |
| `StateEngine` pendente de decisão | Ainda não definido se MongoDB será suportado como state engine para stateful mocks. | Definir na fase de implementação (ver Etapa 7.3). |

---

## Ordem de Implementação (dependências)

O plano lista 12 etapas linearmente, mas algumas podem ser executadas em paralelo. A ordem recomendada é:

```text
Fase 1 — Infraestrutura (paralelas entre si)
├── Etapa 1: Docker Compose (db-mongodb service)
├── Etapa 2: Variáveis de ambiente (.env.example)
└── Etapa 6: Dockerfile.api (mongodb-database-tools)

Fase 2 — Backend (sequencial)
├── Etapa 7: DTOs e tipos compartilhados (StateEngine, UpsertProjectDatabaseDto)
├── Etapa 3: MongoDB Driver (mongodb.driver.ts)
├── Etapa 4: Driver Registry (registrar no DriverRegistryService)
└── Etapa 5: DbSnapshotsService (directory, filter, create, restore, fixes)

Fase 3 — Periféricos (paralelas entre si)
├── Etapa 8: Makefile targets
├── Etapa 9: Testes unitários
├── Etapa 10: MCP Tools (5 descrições + 1 prompt)
└── Etapa 12: UI Updates (6 locais no db-ui)

Fase 4 — Final
└── Etapa 11: Documentação (README, guias)
```

> **Regra:** Sempre executar `npm run build:shared` após modificar tipos em `@stubrix/shared`, antes de compilar qualquer pacote consumidor.

---

## Checklist Final

### Infraestrutura

- [ ] Serviço `db-mongodb` adicionado ao `docker-compose.yml` (profiles: `mongodb`, `databases`)
- [ ] Volume `mongodb-data` criado
- [ ] Script `scripts/mongo-init.js` criado
- [ ] Variáveis de ambiente no `.env` e `.env.example` (incluindo `MONGO_EXTERNAL_PORT`)
- [ ] Variáveis passadas ao serviço `stubrix` no compose
- [ ] `depends_on` com `db-mongodb` (condition: service_healthy, required: false) no serviço `stubrix`

### Backend (API)

- [ ] `mongodb.driver.ts` criado em `packages/api/src/databases/drivers/`
- [ ] Driver registrado no `DriverRegistryService`
- [ ] Driver importado no `DatabasesModule`
- [ ] `DbSnapshotsService` atualizado (directory, filter, create, restore)
- [ ] Fix: `resolveConnectionOverrides()` — campo `user` vs `username` corrigido
- [ ] Fix: helper `getSnapshotExtension()` para `.archive.gz` no `update()`
- [ ] DTOs atualizados (`UpsertProjectDatabaseDto`, `ProjectDatabaseConfig`)
- [ ] `StateEngine` type — decisão tomada e tipo atualizado (ou limitação documentada)
- [ ] Pacote `mongodb` (npm) adicionado como dependência

### Docker

- [ ] `Dockerfile.api` atualizado com `mongodb-database-tools`
- [ ] Build testado: `docker exec stubrix mongodump --version`

### Makefile

- [ ] Targets `mongodb`, `mongodb-up`, `mongodb-down`, `mongodb-shell`
- [ ] `all-down`, `clean`, `down` atualizados com `--profile mongodb`

### Testes

- [ ] `mongodb.driver.spec.ts` criado com cobertura de:
  - `isConfigured()` / `healthCheck()`
  - `listDatabases()` — filtra admin, config, local
  - `createSnapshot()` — verifica flags `--archive` / `--gzip`
  - `restoreSnapshot()` — verifica flags `--archive` / `--gzip` / `--drop`
  - Cenários de erro

### MCP

- [ ] 5 tools com descrições atualizadas (`stubrix_list_databases`, `stubrix_get_database_info`, `stubrix_create_snapshot`, `stubrix_restore_snapshot`, `stubrix_list_db_engines`)
- [ ] Prompt `database-snapshot-cycle` atualizado

### UI (`@stubrix/db-ui`)

- [ ] `EngineSelector.tsx` — `ENGINE_ICON` e `ENGINE_COLOR` com entrada `mongodb`
- [ ] `ProjectDatabaseConfigs.tsx` — `ENGINE_DEFAULTS`, `ENGINE_STYLE`, `<select>` options
- [ ] `SnapshotForm.tsx` — `ENGINE_LABEL` com entrada `mongodb`

### Documentação

- [ ] `README.md` atualizado (tabelas, arquitetura, requirements)
- [ ] Guia de uso do MongoDB documentado

---

## Referências de Comandos

### Criar Snapshot (Backup)

```bash
mongodump --uri="mongodb://usuario:senha@localhost:27017/nome_do_banco" \
          --archive=/app/dumps/mongodb/meu_snapshot.archive.gz \
          --gzip
```

### Restaurar Snapshot (Time Machine / Reset)

```bash
mongorestore --uri="mongodb://usuario:senha@localhost:27017/nome_do_banco" \
             --archive=/app/dumps/mongodb/meu_snapshot.archive.gz \
             --gzip \
             --drop
```

> **Detalhe crucial de Harness Engineering:** A flag `--drop` é **obrigatória** neste caso. Ela garante que, antes de restaurar o BSON, o MongoDB apague as coleções existentes. Sem ela, dados antigos e novos seriam mesclados, causando inconsistências.

### Via API REST

```bash
# Criar snapshot
curl -X POST http://localhost:9090/api/db/engines/mongodb/snapshots \
  -H 'Content-Type: application/json' \
  -d '{"database": "stubrix", "label": "before-migration"}'

# Lista snapshots
curl http://localhost:9090/api/db/snapshots

# Restaurar snapshot
curl -X POST http://localhost:9090/api/db/snapshots/before-migration-stubrix-20260314-171700.archive.gz/restore \
  -H 'Content-Type: application/json' \
  -d '{"database": "stubrix"}'
```

### Via MCP (AI Assistant)

```
"Take a MongoDB snapshot before running migrations"
→ stubrix_create_snapshot({ engine: "mongodb", database: "stubrix", name: "pre-migration" })

"Restore the MongoDB database to its previous state"
→ stubrix_restore_snapshot({ engine: "mongodb", snapshotName: "pre-migration-...", database: "stubrix" })
```

---

## Dependências npm a instalar

```bash
# No workspace root ou em packages/api
npm install mongodb
```

O pacote `mongodb` é o driver oficial do MongoDB para Node.js. Ele será usado dentro do `MongodbDriver` para health check, listDatabases, getDatabaseInfo e executeQuery.

As ferramentas CLI (`mongodump`, `mongorestore`) são instaladas diretamente no `Dockerfile.api` via `mongodb-database-tools` apt package — não são dependências npm.

---

> **Autor:** Victor Fernandes.
> **Data:** 2026-03-14
> **Versão alvo:** v2.4.0
