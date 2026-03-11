---
description: Expert guidance for developing NestJS 11 modules, controllers, services, DTOs and tests in @stubrix/api
---

# NestJS API Development — @stubrix/api

## When to use
- Creating new API modules, controllers, services, or DTOs
- Adding new REST endpoints or WebSocket gateways
- Writing unit tests or E2E tests for the API
- Debugging NestJS dependency injection or middleware issues
- Integrating new database engines or external services

## Architecture Patterns

### Module Structure
Every feature follows the NestJS module pattern:
```
src/{feature}/
├── {feature}.module.ts        # Module declaration
├── {feature}.controller.ts    # HTTP routes
├── {feature}.service.ts       # Business logic
├── dto/
│   ├── create-{feature}.dto.ts
│   └── update-{feature}.dto.ts
└── {feature}.spec.ts          # Unit tests
```

### DTO Validation
Always use class-validator + class-transformer:
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateMockDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MockEngine)
  @IsOptional()
  engine?: MockEngine;
}
```

### Service Pattern
```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly configService: ConfigService,
  ) {}
}
```

### Controller Pattern
```typescript
@Controller('api/feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) { ... }

  @Post()
  create(@Body() dto: CreateFeatureDto) { ... }
}
```

## Key Conventions
- All routes prefixed with `/api/`
- Project-scoped routes: `/api/projects/:projectId/{feature}`
- Global ValidationPipe is registered in main.ts
- Use `@nestjs/config` ConfigService for env vars, never `process.env` directly in services
- WebSocket events via Socket.IO on namespace `/ws/logs`
- Error responses use NestJS HttpException with consistent shape

## Testing
- Unit tests: co-located as `*.spec.ts`, use `@nestjs/testing` Test.createTestingModule
- E2E tests: in `test/` directory, use supertest
- Run: `npm run test -w @stubrix/api` (unit), `npm run test:e2e -w @stubrix/api` (E2E)
- Mock external dependencies (axios, fs, child_process) in unit tests

## Database Module Specifics
- Driver pattern: each engine implements a common interface
- PostgreSQL: real ops via `pg_dump`/`psql` child processes
- MySQL/SQLite: driver pattern with placeholder implementations
- Snapshots persisted in `dumps/{engine}/`
- Metadata files: `dumps/.snapshot-metadata.json`, `dumps/.project-databases.json`

## MCP Tools to Use
- **DeepWiki**: `ask_question("nestjs/nest", ...)` for NestJS docs
- **PostgreSQL MCP**: `query()` to inspect database state
- **Sequential Thinking**: for complex module design decisions
- **Memory MCP**: store architectural decisions for future reference
