---
description: Expert guidance for semantic versioning, package.json management, and automated version updates across Stubrix monorepo
---

# Semantic Versioning — Stubrix

## When to use
- Updating package versions after code changes
- Managing version increments across the monorepo
- Setting up automated versioning workflows
- Troubleshooting version conflicts or dependency issues
- Preparing releases with proper versioning

## Version Detection Logic

The system analyzes the last Git commit to determine version increment:

| Commit Pattern | Version Increment | Example |
|----------------|------------------|---------|
| `✨ feat` or `feat` | **Minor** | `✨ feat(api): add user authentication` |
| `🐛 fix` or `fix` | **Patch** | `🐛 fix(ui): resolve modal overflow` |
| `💥 BREAKING` or `breaking` | **Major** | `💥 BREAKING CHANGE: migrate to new API` |
| Other conventional commits | **Patch** | `📝 docs(readme): update installation guide` |

## Key Commands

### Automatic Version Detection
```bash
npm run version          # Auto-detect from last commit and update all packages
npm run version:dry      # Preview what would change without updating
```

### Manual Version Control
```bash
npm run version:major    # Force major version increment
npm run version:minor    # Force minor version increment  
npm run version:patch    # Force patch version increment
```

### Full Release Process
```bash
npm run release          # Update versions + build all packages
```

## Package Update Process

1. **All packages updated simultaneously** - maintains version consistency
2. **Workspace protocol maintained** - internal deps use `workspace:*`
3. **Build order respected** - shared → api → db-ui → ui
4. **Git hook reminders** - pre-commit hook warns about version updates

## Workflow Integration

### Standard Development Workflow
1. Make code changes
2. Commit with conventional format: `✨ feat(scope): description`
3. Run: `npm run version`
4. Build: `npm run build:shared && npm run build`
5. Commit version changes: `git commit -m "🔧 chore(version): update package versions"`

### Pre-commit Integration
The Git pre-commit hook automatically:
- Detects code changes in staged files
- Reminds to run version updates
- Allows version update commits to proceed without warnings

## Troubleshooting

### Version Not Updating
- Check commit format: `git log -1 --pretty=format:"%s"`
- Ensure conventional commit structure
- Verify script permissions: `chmod +x scripts/version.js`

### Build Errors After Version Update
- Rebuild in correct order: `npm run build:shared` first
- Clear TypeScript cache: `rm -rf packages/*/dist/`
- Verify workspace symlinks: `npm install`

### Dependency Conflicts
- Check for version mismatches in package.json files
- Ensure internal deps use `workspace:*` protocol
- Reinstall workspace: `rm -rf node_modules && npm install`

### Rollback Version Changes
```bash
git reset --hard HEAD~1  # Remove last version update
```

## Best Practices

1. **Always use conventional commits** - enables automatic detection
2. **Preview before applying** - use `npm run version:dry`
3. **Separate version commits** - keep version bumps in dedicated commits
4. **Build shared first** - other packages depend on shared types
5. **Document breaking changes** - use BREAKING CHANGE format

## MCP Tools to Use
- **Memory MCP**: track version decisions and breaking changes
- **GitHub MCP**: create releases and tags after version updates
- **Sequential Thinking**: plan complex version increments

## Integration with Other Skills

- **Monorepo Management**: coordinates build order with version updates
- **Code Quality**: ensures version updates don't introduce issues
- **Docker Infrastructure**: version tags for container releases
