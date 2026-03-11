---
trigger: always
description: NestJS API conventions for @stubrix/api — modules, DTOs, validation, error handling
---

# API Conventions

## Module Structure
- Every feature follows: `module.ts` → `controller.ts` → `service.ts` → `dto/`
- Register all modules in `src/app.module.ts`
- Use `@nestjs/config` ConfigService for environment variables — never `process.env` directly in services

## Routes
- All REST endpoints under `/api/` prefix
- Project-scoped: `/api/projects/:projectId/{resource}`
- Database routes: `/api/db/{resource}`
- WebSocket namespace: `/ws/logs`

## DTOs & Validation
- All DTOs use `class-validator` decorators (`@IsString`, `@IsNotEmpty`, `@IsOptional`, `@IsEnum`, etc.)
- Use `class-transformer` for nested DTOs (`@Type(() => NestedDto)`)
- Global `ValidationPipe` is registered in `main.ts` — do not add per-route pipes

## Error Handling
- Use NestJS `HttpException` or built-in exceptions (`NotFoundException`, `BadRequestException`)
- Never throw raw `Error` — always use typed HTTP exceptions
- Return consistent error shape: `{ statusCode, message, error }`

## Dependency Injection
- Always inject via constructor — never use `new Service()`
- Use `@Injectable()` decorator on all services
- Use `@Inject()` for custom providers or tokens
