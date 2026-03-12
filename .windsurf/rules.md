# Stubrix — Global Rules for Windsurf

## Project Overview
Stubrix is a monorepo (npm workspaces) that provides a unified mock server platform with WireMock/Mockoon engines, a NestJS 11 control plane API, a React 19 dashboard, and a multi-database management system.

## Architecture
- **Monorepo**: npm workspaces at `packages/`
- **@stubrix/api**: NestJS 11 + Express, WebSockets (Socket.IO), class-validator
- **@stubrix/ui**: React 19 + Vite 7 + TailwindCSS + Lucide + React Router 7
- **@stubrix/db-ui**: Database microfrontend (React, consumed by @stubrix/ui)
- **@stubrix/shared**: TypeScript types shared across all packages
- **Docker**: Multi-profile compose (wiremock, mockoon, postgres, mysql)
- **Mocks**: Canonical WireMock format (mappings/*.json + __files/*)

## Tech Stack & Versions
- Node.js >= 24, npm >= 10
- TypeScript 5.x across all packages
- NestJS 11 (API)
- React 19, Vite 7, TailwindCSS 3 (UI)
- PostgreSQL 17, MySQL 8, SQLite (better-sqlite3)
- Docker Compose with profiles
- Jest 30 + Supertest (API tests)
- ESLint 9 + Prettier (formatting)

## Code Style Rules
- Use TypeScript strict mode in all packages
- Follow NestJS conventions for the API: modules, controllers, services, DTOs
- Use class-validator decorators for all DTOs in @stubrix/api
- React components: functional components with hooks only, no class components
- TailwindCSS for all styling in UI packages — no inline styles or CSS modules
- Use Lucide React for all icons
- Imports: always absolute paths within each package (e.g., `@/` or relative from src)
- No default exports except for React pages/components where idiomatic
- All shared types go in @stubrix/shared, never duplicate types across packages

## File Naming
- API: kebab-case for files (e.g., `mock-engine.service.ts`, `create-mock.dto.ts`)
- UI: PascalCase for components (e.g., `MockEditor.tsx`, `DatabasesPage.tsx`)
- Shared: kebab-case for type files (e.g., `mock.types.ts`)
- Tests: co-located as `*.spec.ts` (API) or `*.test.tsx` (UI)

## API Conventions
- All REST endpoints under `/api/` prefix
- WebSocket namespace: `/ws/logs`
- Project-scoped routes: `/api/projects/:projectId/...`
- Database routes: `/api/db/...`
- Use NestJS pipes for validation (ValidationPipe global)
- Return consistent error shapes with HttpException

## Database Operations
- PostgreSQL: real operations via pg_dump/psql
- MySQL/SQLite: real operations via mysqldump/mysql and file copy
- Snapshots stored in `dumps/{engine}/`
- Metadata in `dumps/.snapshot-metadata.json` and `dumps/.project-databases.json`

## Docker & Infrastructure
- All services use Docker Compose profiles — never start services without explicit profile
- Environment variables defined in `.env` (loaded by Makefile, docker-compose, NestJS config)
- Mock port default: 8081, API port default: 9090
- Always use `make` targets as the primary CLI interface

## MCP Integration
- **GitHub MCP**: Use for all git operations, PR management, issue tracking
- **PostgreSQL MCP**: Use for direct database queries and inspection
- **Playwright MCP**: Use for E2E testing of the dashboard UI
- **Memory MCP**: Use for persistent knowledge graph about project decisions
- **DeepWiki MCP**: Use for referencing NestJS, React, WireMock documentation
- **Sequential Thinking MCP**: Use for complex architectural decisions

## Feature Development
- Feature specs live in `/features/` directory as numbered markdown files
- Follow the integration plan in `features/integracao-db-docker.md`
- Each feature should be developed in a feature branch
- Always build shared package first: `npm run build:shared`

## Build Order (critical)
1. @stubrix/shared (no deps)
2. @stubrix/api (depends on shared)
3. @stubrix/db-ui (depends on shared)
4. @stubrix/ui (depends on shared + db-ui)

## Testing
- Unit tests required for all services in @stubrix/api
- E2E tests for critical API flows
- Use Playwright MCP for dashboard E2E when available
- Test database operations with real engines via Docker profile

## Security
- Never commit `.env` files — use `.env.example` as template
- CORS configured via environment variable
- No hardcoded credentials in source code
- API keys and secrets only via environment variables

## 🚨 CRITICAL: Version Management Rules

### 📋 Version Process (MANDATORY)
1. **DEVELOPMENT**: Never version during feature development
2. **MERGE**: Only version AFTER PR is merged to main
3. **RELEASE**: Always version before creating releases
4. **CONSISTENCY**: All packages must have same version

### 🔄 Version Commands
```bash
# Check what will change (dry run)
npm run version:dry

# Apply version changes
npm run version:patch    # Bug fixes, completed features
npm run version:minor     # New features, breaking internal changes
npm run version:major     # Breaking public changes

# Full release process
npm run release          # Version + build
```

### ⚠️ Version Triggers
- **Patch**: Completed features (F3 snapshots, bug fixes)
- **Minor**: New major features (F4 recording, F5 MCP)
- **Major**: Breaking API changes, architectural shifts

### 🚫 NEVER Version Before:
- Creating pull requests
- During feature development
- Before code review
- Before merge to main

### ✅ ALWAYS Version After:
- PR merged to main branch
- Code review completed
- All tests passing
- Ready for release

### 📝 Version Checklist
- [ ] PR is merged to main
- [ ] All tests are passing
- [ ] Build is successful
- [ ] Run `npm run version:dry` to preview
- [ ] Apply appropriate version type
- [ ] Build after versioning
- [ ] Push tags to remote

### 🔍 Version Validation
- All packages must have identical versions
- No conflicts in package-lock.json files
- Build succeeds after version change
- Tags are pushed correctly

## Git Workflow
- Feature branches: `feature/description`
- Atomic commits with conventional format
- PR descriptions with acceptance criteria
- Issues must be linked and closed
- Never force push to main
