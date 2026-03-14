# Versioning Checklist

## 🚨 CRITICAL: Version Management Rules

### ✅ WHEN TO VERSION (AFTER MERGE)
- [ ] PR is merged to main branch
- [ ] All tests are passing
- [ ] Build is successful
- [ ] Code review completed
- [ ] Ready for production release

### ❌ WHEN NOT TO VERSION (BEFORE MERGE)
- [ ] During feature development
- [ ] Before creating pull request
- [ ] Before code review
- [ ] In feature branches
- [ ] When working directory is dirty

## 🔄 Version Process

### 1. Pre-Version Validation
```bash
# Ensure on main branch
git checkout main
git pull origin main

# Check status
git status
npm run version:dry
```

### 2. Select Version Type
- **patch** (1.0.0 → 1.0.1): Bug fixes, completed features
- **minor** (1.0.0 → 1.1.0): New features, breaking internal changes
- **major** (1.0.0 → 2.0.0): Breaking public API changes

### 3. Apply Version
```bash
# Interactive (recommended)
npm run release

# Quick commands
npm run release:patch    # For completed features like F3
npm run release:minor    # For new features like F4
npm run release:major    # For breaking changes
```

### 4. Post-Version Verification
- [ ] All packages have same version
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Git tags created
- [ ] Changes pushed to remote

## 📋 Current Status

### Latest Version: 1.0.0
### Ready to Version: PR #27 (F3 Database Snapshots)

#### After PR #27 Merge:
```bash
# Switch to main
git checkout main
git pull

# Version (patch for completed feature)
npm run release:patch

# Or interactive:
npm run release
```

## 🎯 Version Types Guide

| Situation | Type | Example | Command |
|-----------|------|---------|---------|
| F3 Database Snapshots completed | patch | 1.0.0 → 1.0.1 | `npm run release:patch` |
| F4 Recording Features added | minor | 1.0.1 → 1.1.0 | `npm run release:minor` |
| API v2 breaking changes | major | 1.1.0 → 2.0.0 | `npm run release:major` |
| Bug fixes | patch | 1.0.1 → 1.0.2 | `npm run release:patch` |

## 🚨 Common Mistakes to Avoid

### ❌ DON'T:
- Version during development
- Version before merge
- Skip testing after version
- Forget to push tags
- Use arbitrary version numbers
- Version in feature branches

### ✅ DO:
- Always version after merge
- Use semantic versioning
- Test after versioning
- Create proper git tags
- Document changes
- Follow the checklist

## 🔧 Troubleshooting

### Version Conflicts:
```bash
# Clean and retry
rm -rf node_modules package-lock.json
npm install
npm run version:patch
```

### Git Issues:
```bash
# Reset if needed
git checkout main
git reset --hard origin/main
npm run release
```

### Build Failures:
```bash
# Clean build
npm run build
npm test
npm run release
```

## 📊 Version History

| Version | Date | Changes | Type |
|---------|------|---------|------|
| 1.0.0 | Initial | Base version | major |
| 1.0.1 | TBD | F3 Database Snapshots | patch |

## 🎯 Next Steps

1. **Wait for PR #27 merge**
2. **Switch to main branch**
3. **Run `npm run release:patch`**
4. **Verify all packages updated**
5. **Confirm tags pushed**

This ensures consistent, automated versioning across the entire Stubrix monorepo!
