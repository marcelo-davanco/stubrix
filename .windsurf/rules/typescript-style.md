---
trigger: always
description: TypeScript style and naming conventions enforced across all Stubrix packages
---

# TypeScript Style Rules

## Strict Mode
- TypeScript strict mode is enabled in all packages — do not disable it
- No `any` type — use proper types from `@stubrix/shared` or define new ones
- No non-null assertions (`!`) unless absolutely necessary with an explanatory comment

## Types & Interfaces
- Use `interface` for object shapes, `type` for unions/intersections/mapped types
- All shared types go in `@stubrix/shared` — never duplicate types across packages
- Export types from their definition file, re-export from `src/index.ts`

## Naming
| Element | Convention | Example |
|---------|-----------|---------|
| Files (API) | kebab-case | `mock-engine.service.ts` |
| Files (UI components) | PascalCase | `MockEditor.tsx` |
| Files (UI hooks/utils) | camelCase | `useProjects.ts` |
| Files (Shared) | kebab-case | `mock.types.ts` |
| Classes/Interfaces | PascalCase | `MockEngineService` |
| Functions/Methods | camelCase | `createSnapshot()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Enums | PascalCase members | `MockEngine.WireMock` |
| React Components | PascalCase | `SnapshotList` |
| Hooks | `use` prefix | `useDatabase()` |

## Imports
- Absolute paths within each package (e.g., relative from `src/`)
- Group imports: external libs → internal packages → relative imports
- Never import from another package's `src/` — always from the package entry point

## Tests
- API tests: co-located as `*.spec.ts`
- UI tests: co-located as `*.test.tsx`
- Use descriptive `describe`/`it` blocks
