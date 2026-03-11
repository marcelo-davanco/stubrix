---
description: Automated code quality checks including TypeScript strict mode, ESLint, Prettier, naming conventions and best practices enforcement
---

# Code Quality — Stubrix

## When to use
- Reviewing code before committing
- Fixing lint or type errors
- Ensuring consistent code style across packages
- Validating that new code follows project conventions

## TypeScript Rules
- Strict mode enabled in all packages
- No `any` type — use proper types from @stubrix/shared or define new ones
- No non-null assertions (`!`) unless absolutely necessary with a comment
- Use `interface` for object shapes, `type` for unions/intersections
- Export types from their definition file, re-export from index.ts

## ESLint Configuration
- ESLint 9 flat config (`eslint.config.mjs`)
- Extends: `@eslint/js`, `typescript-eslint`, `prettier`
- API: uses `eslint-plugin-prettier` for format-on-lint
- UI: uses `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Prettier Configuration
- Tab width: 2 spaces
- Single quotes: true (API), default (UI)
- Trailing commas: `all`
- Semi: true

## Naming Conventions

### Files
| Package | Convention | Example |
|---------|-----------|---------|
| API | kebab-case | `mock-engine.service.ts` |
| UI | PascalCase (components) | `MockEditor.tsx` |
| UI | camelCase (utils/hooks) | `useProjects.ts` |
| Shared | kebab-case | `mock.types.ts` |
| Tests (API) | kebab-case + .spec | `mock.service.spec.ts` |
| Tests (UI) | PascalCase + .test | `MockEditor.test.tsx` |

### Code
| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `MockEngineService` |
| Interfaces | PascalCase (no I prefix) | `MockMapping` |
| Functions | camelCase | `createSnapshot()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Enums | PascalCase | `MockEngine.WireMock` |
| React Components | PascalCase | `SnapshotList` |
| Hooks | camelCase with `use` prefix | `useDatabase()` |

## Pre-Commit Checks
1. TypeScript compiles: `npm run build`
2. Lint passes: `npm run lint -w @stubrix/api`
3. Tests pass: `npm run test -w @stubrix/api`
4. No console.log in production code (use NestJS Logger in API)
5. No hardcoded URLs, ports, or credentials

## Code Review Criteria
- [ ] Types defined in @stubrix/shared if cross-package
- [ ] DTOs use class-validator decorators
- [ ] Services use dependency injection (never `new Service()`)
- [ ] Components use TailwindCSS (no inline styles)
- [ ] Icons from Lucide React only
- [ ] No default exports (except React page components)
- [ ] Error handling with proper HTTP status codes
- [ ] Unit tests for new services/utils
