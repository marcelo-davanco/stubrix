---
description: Expert guidance for managing npm workspaces, build order, cross-package dependencies and monorepo operations in Stubrix
---

# Monorepo Management — Stubrix

## When to use
- Adding new packages to the monorepo
- Resolving cross-package dependency issues
- Debugging build order or workspace symlink problems
- Managing shared dependencies across packages
- Configuring TypeScript project references

## Package Dependency Graph
```
@stubrix/shared (no deps)
    ↓
@stubrix/api (depends on shared)
@stubrix/db-ui (depends on shared)
    ↓
@stubrix/ui (depends on shared + db-ui)
```

## Build Order (mandatory)
1. `npm run build:shared` — TypeScript types
2. `npm run build:api` — NestJS API (or parallel with db-ui)
3. `npm run build:db-ui` — Database microfrontend (or parallel with api)
4. `npm run build:ui` — React dashboard (must be last, depends on db-ui)

## Workspace Configuration
Root `package.json`:
```json
{
  "workspaces": ["packages/shared", "packages/api", "packages/ui", "packages/db-ui"]
}
```

## Key Commands
- `npm install` — installs all workspace deps, creates symlinks
- `npm run {script} -w @stubrix/{package}` — run script in specific package
- `npm run build` — builds all in correct order (defined in root scripts)

## Adding a New Package
1. Create directory: `packages/{name}/`
2. Create `package.json` with `"name": "@stubrix/{name}"`
3. Add to root `package.json` workspaces array
4. Add to root build script in correct order
5. Run `npm install` to create symlinks
6. If it exports types, add to other packages' dependencies as `"@stubrix/{name}": "*"`

## Cross-Package Types
- All shared types MUST go in `@stubrix/shared`
- Never duplicate type definitions across packages
- After changing shared types: `npm run build:shared` before building consumers
- db-ui exports from `src/index.ts` (source, not compiled) for dev convenience
- In production: db-ui should be compiled and export from `dist/`

## Troubleshooting
- **Module not found**: rebuild shared → `npm run build:shared`
- **Stale types**: delete `packages/shared/dist/` and rebuild
- **Symlink issues**: `rm -rf node_modules && npm install`
- **Version conflicts**: check that workspace deps use `"*"` for local packages
- **TypeScript errors across packages**: verify `tsconfig.json` paths and references

## MCP Tools to Use
- **Sequential Thinking**: for planning package restructuring
- **Memory MCP**: track cross-package dependency decisions
