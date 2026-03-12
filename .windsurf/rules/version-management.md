---
trigger: on_code_changes
description: 'Version Management: Semantic versioning required for all code changes across packages'
---

# Version Management

## Hard Rules

1. **All code changes require version updates** - Update package versions after any meaningful code changes
2. **Use semantic versioning** - Follow MAJOR.MINOR.PATCH format with conventional commit detection
3. **Version updates are separate commits** - Never mix code changes with version bumps in the same commit
4. **Build order matters** - Always build shared package first after version updates
5. **Use workspace protocol** - Internal dependencies must use `"workspace:*"`

## Version Update Workflow

### Required Steps After Code Changes
1. **Commit code changes** with conventional format
2. **Run version command**: `npm run version` (auto-detects increment type)
3. **Build packages**: `npm run build:shared && npm run build`
4. **Commit version changes**: `git commit -m "🔧 chore(version): update package versions"`

### Version Detection Rules
- `✨ feat` → Minor version increment
- `🐛 fix` → Patch version increment  
- `💥 BREAKING` → Major version increment
- Other conventional commits → Patch version increment

## Package.json Requirements

### Root Package
```json
{
  "scripts": {
    "version": "node scripts/version.js",
    "version:major": "node scripts/version.js --major",
    "version:minor": "node scripts/version.js --minor",
    "version:patch": "node scripts/version.js --patch",
    "version:dry": "node scripts/version.js --dry-run",
    "release": "npm run version && npm run build:shared && npm run build"
  }
}
```

### Workspace Packages
- All internal dependencies use `"workspace:*"`
- Version numbers updated simultaneously across all packages
- No hardcoded version numbers for internal packages

## Build Order After Version Update

1. `npm run build:shared` - TypeScript types (must be first)
2. `npm run build:api` - NestJS backend
3. `npm run build:db-ui` - Database microfrontend
4. `npm run build:ui` - React dashboard (must be last)

## Git Integration

### Pre-commit Hook
- Detects code changes in staged files
- Warns about missing version updates
- Allows version update commits to proceed

### Commit Format for Version Updates
```bash
🔧 chore(version): update package versions
```

## Troubleshooting

### Version Not Updating
- Check last commit format: `git log -1 --pretty=format:"%s"`
- Use dry run to debug: `npm run version:dry`
- Verify script permissions: `chmod +x scripts/version.js`

### Build Errors After Version Update
- Rebuild in correct order: `npm run build:shared` first
- Clear TypeScript cache: `rm -rf packages/*/dist/`
- Verify workspace symlinks: `npm install`

### Dependency Conflicts
- Check package.json for version mismatches
- Ensure internal deps use `workspace:*`
- Reinstall workspace: `rm -rf node_modules && npm install`

## Anti-Patterns

- **Mixing code + version changes**: Separate commits required
- **Skipping version updates**: All meaningful changes need version bumps
- **Wrong build order**: Always build shared first
- **Hardcoded versions**: Use workspace protocol for internal deps
- **Manual version editing**: Use the automated script

## Quality Gates

- [ ] Code changes committed with conventional format
- [ ] Version command executed: `npm run version`
- [ ] All packages updated consistently
- [ ] Build order followed: shared first
- [ ] Version changes committed separately
- [ ] No hardcoded internal dependencies
