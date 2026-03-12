---
description: Automated semantic versioning for Stubrix monorepo
---

# Automated Semantic Versioning Workflow

This workflow ensures consistent semantic versioning across all Stubrix packages following feature completion and merges.

## When to Use

Run this workflow **AFTER** a pull request is merged to main branch, **NEVER** during development.

## Version Types

### 🩹 Patch Version (1.0.0 → 1.0.1)
- **Use for**: Bug fixes, completed features, small improvements
- **Examples**: F3 Database Snapshots, bug fixes, documentation updates
- **Command**: `npm run version:patch`

### 🔹 Minor Version (1.0.0 → 1.1.0)
- **Use for**: New features, breaking internal changes
- **Examples**: F4 Recording Features, F5 MCP Ecosystem
- **Command**: `npm run version:minor`

### 🔺 Major Version (1.0.0 → 2.0.0)
- **Use for**: Breaking public API changes, major architectural shifts
- **Examples**: API v2, complete UI overhaul, database schema changes
- **Command**: `npm run version:major`

## Step-by-Step Process

### 1. Pre-Version Check
```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Check current status
git status
npm run version:dry  # Preview changes
```

### 2. Apply Version
```bash
# Apply appropriate version type
npm run version:patch    # or :minor or :major

# Verify all packages updated
grep -r "version.*" packages/*/package.json
```

### 3. Build and Validate
```bash
# Build all packages
npm run build

# Run tests
npm test

# Verify everything works
npm run dev  # Quick sanity check
```

### 4. Commit and Tag
```bash
# Commit version changes
git add .
git commit -m "🔖 chore: bump version to 1.0.1"

# Create and push tag
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags
```

## Quick Reference

| Situation | Command | Example |
|-----------|---------|---------|
| Bug fix completed | `npm run version:patch` | 1.0.0 → 1.0.1 |
| New feature added | `npm run version:minor` | 1.0.1 → 1.1.0 |
| Breaking change | `npm run version:major` | 1.0.1 → 2.0.0 |
| Preview changes | `npm run version:dry` | Shows what will change |
| Full release | `npm run release` | Version + build |

This workflow ensures consistent, automated versioning across the entire Stubrix monorepo.
