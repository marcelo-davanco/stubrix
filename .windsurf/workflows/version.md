---
description: Automated semantic versioning for Stubrix packages
---

# Version Management Workflow

## Overview

This workflow handles automated semantic versioning across all Stubrix packages based on conventional commits.

## Commands

### Automatic Version Detection
```bash
npm run version          # Auto-detect version from last commit and update all packages
npm run version:dry      # Preview what would be changed without updating
```

### Manual Version Control
```bash
npm run version:major    # Force major version increment (breaking changes)
npm run version:minor    # Force minor version increment (new features)
npm run version:patch    # Force patch version increment (bug fixes, docs, etc.)
```

### Full Release Process
```bash
npm run release          # Update versions + build all packages
```

## Version Detection Logic

The script analyzes the last commit message to determine version increment:

- **Major**: Breaking changes (`💥`, `BREAKING CHANGE`, `breaking`)
- **Minor**: New features (`✨`, `feat`)
- **Patch**: Bug fixes, docs, refactoring, tests (`🐛`, `📝`, `♻️`, `🧪`)

## Conventional Commit Format

Follow this format for proper version detection:

```
<Gitmoji> <type>(<scope>): <imperative description>

<1-2 line summary>

Changes:
- <item 1>
- <item 2>
```

Examples:
- `✨ feat(api): add database connection pooling`
- `🐛 fix(ui): resolve modal overflow issue`
- `💥 BREAKING CHANGE: migrate to new authentication system`

## Workflow Steps

1. **Make changes** to code
2. **Commit** with conventional format
3. **Run version command**: `npm run version`
4. **Build packages**: `npm run build:shared && npm run build`
5. **Commit version changes**: `git add . && git commit -m "🔧 chore(version): update package versions"`

## Dependencies

The script automatically:
- Updates all package.json files in the monorepo
- Maintains workspace protocol (`workspace:*`) for internal dependencies
- Follows build order: shared → api → db-ui → ui

## Best Practices

- Always use conventional commits
- Run `npm run version:dry` first to preview changes
- Build shared package first after version updates
- Commit version changes separately from feature changes
