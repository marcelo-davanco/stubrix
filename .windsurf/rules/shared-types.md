---
trigger: always
description: All cross-package types must live in @stubrix/shared — never duplicate types
---

# Shared Types Rule

## Single Source of Truth
All TypeScript types that are used by more than one package **must** be defined in `@stubrix/shared`.

## Package Location
- Types: `packages/shared/src/types/`
- Entry point: `packages/shared/src/index.ts` (re-exports all types)
- Compiled output: `packages/shared/dist/`

## Usage in Consumers
```typescript
import { Project, MockMapping, DatabaseEngine } from '@stubrix/shared';
```

## When to Add Types to Shared
- Type is used in both API and UI
- Type is used in both db-ui and UI
- Type represents a domain entity (Project, Mock, Log, Recording, Snapshot)
- Type represents an API request/response shape used by the frontend

## When NOT to Use Shared
- Type is internal to a single package (e.g., NestJS-specific decorators, React component props)
- Type is a DTO with class-validator decorators (these stay in the API package)

## After Modifying Shared Types
```bash
npm run build:shared
```
Then rebuild any consuming package that uses the changed types.
