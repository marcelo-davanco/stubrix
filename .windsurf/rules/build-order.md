---
trigger: always
description: Critical build order for the Stubrix monorepo — shared must always be built first
---

# Build Order (Critical)

The monorepo has strict build dependencies. Violating the order causes type errors and missing modules.

## Dependency Graph
```
@stubrix/shared  (no deps)
       ↓
@stubrix/api     (depends on shared)
@stubrix/db-ui   (depends on shared)
       ↓
@stubrix/ui      (depends on shared + db-ui)
```

## Correct Build Sequence
1. `npm run build:shared` — must always be first
2. `npm run build:api` — can be parallel with db-ui
3. `npm run build:db-ui` — can be parallel with api
4. `npm run build:ui` — must be last (depends on db-ui)

Or use `npm run build` which runs them in the correct sequence.

## After Changing Shared Types
Always rebuild shared before building any consumer:
```bash
npm run build:shared
```

## Common Errors When Order is Wrong
- `Cannot find module '@stubrix/shared'` → rebuild shared
- `Type 'X' is not assignable to type 'Y'` in UI → rebuild shared + db-ui
- `Module not found: @stubrix/db-ui` in UI → rebuild db-ui first
