# Stubrix Version Management

This document describes the automated semantic versioning system for the Stubrix monorepo.

## Quick Start

```bash
# After making code changes, update versions automatically
npm run version

# Preview what would change
npm run version:dry

# Full release process (version + build)
npm run release
```

## How It Works

The versioning system analyzes your last Git commit to determine the appropriate version increment:

### Version Detection Rules

| Commit Pattern | Version Increment | Example |
|----------------|------------------|---------|
| `✨ feat` or `feat` | **Minor** | `✨ feat(api): add user authentication` |
| `🐛 fix` or `fix` | **Patch** | `🐛 fix(ui): resolve modal overflow` |
| `💥 BREAKING` or `breaking` | **Major** | `💥 BREAKING CHANGE: migrate to new API` |
| Other conventional commits | **Patch** | `📝 docs(readme): update installation guide` |

### Manual Override

```bash
npm run version:major  # Force major version
npm run version:minor  # Force minor version  
npm run version:patch  # Force patch version
```

## Package Dependencies

The system automatically:
- Updates all packages in the monorepo simultaneously
- Maintains `workspace:*` protocol for internal dependencies
- Follows build order: shared → api → db-ui → ui

## Workflow Example

1. **Make code changes**
   ```bash
   # Edit files in packages/api/src/
   ```

2. **Commit with conventional format**
   ```bash
   git add .
   git commit -m "✨ feat(api): add database connection pooling"
   ```

3. **Update versions**
   ```bash
   npm run version
   # Output: packages/api: 1.0.0 → 1.1.0
   ```

4. **Build packages**
   ```bash
   npm run build:shared && npm run build
   ```

5. **Commit version changes**
   ```bash
   git add .
   git commit -m "🔧 chore(version): update package versions"
   ```

## Conventional Commit Format

Follow this exact format:

```
<Gitmoji> <type>(<scope>): <imperative description>

<1-2 line summary of what changed and why>

Changes:
- <specific change 1>
- <specific change 2>

<Technical details if relevant>

Impact: <how this improves the project>
```

### Valid Types

- `feat` - New features
- `fix` - Bug fixes  
- `docs` - Documentation changes
- `style` - Code formatting (no functional change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `perf` - Performance improvements
- `chore` - Build process, dependency updates

### Gitmoji Reference

| Emoji | Type | When to Use |
|-------|------|-------------|
| ✨ | feat | New features |
| 🐛 | fix | Bug fixes |
| 📝 | docs | Documentation |
| 🎨 | style | Formatting |
| ♻️ | refactor | Refactoring |
| 🧪 | test | Testing |
| ⚡ | perf | Performance |
| 🔧 | chore | Maintenance |
| 💥 | BREAKING | Breaking changes |

## Git Hooks

A pre-commit hook reminds you to update versions when committing code changes:

```bash
⚠️  Code changes detected - remember to run 'npm run version' before committing
💡 Use 'npm run version:dry' to preview version changes
```

## Best Practices

1. **Always use conventional commits** - this enables automatic version detection
2. **Run `npm run version:dry` first** - preview changes before applying
3. **Commit version changes separately** - keep version bumps in their own commits
4. **Build shared package first** - other packages depend on it
5. **Use semantic versioning** - MAJOR.MINOR.PATCH format

## Troubleshooting

### Version not updating correctly
Check your last commit message format:
```bash
git log -1 --pretty=format:"%s"
```

### Build errors after version update
Ensure build order is followed:
```bash
npm run build:shared  # Always first
npm run build         # Then build all
```

### Need to rollback version changes
```bash
git reset --hard HEAD~1  # Remove last version update
```

---

## Release History

| Version | Date | Milestone | Key Deliverables |
|---------|------|-----------|-----------------|
| v1.3.1 | 2026-03 | Foundation | WireMock/Mockoon dual engine, recording, dashboard, DB snapshots, MCP servers |
| v1.4.0 | 2026-03 | Stateful Mocking & DB Viewer | Stateful mock scenarios, Adminer, CloudBeaver |
| v1.5.0 | 2026-03 | API Clients & Universal Import | HAR/Postman/OpenAPI import, Bruno, Hoppscotch |
| v1.6.0 | 2026-03 | Governance & Coverage | Spectral linting, mock coverage analysis |
| v1.7.0 | 2026-03 | Intelligence & Time Machine | AI/RAG (ChromaDB), Time Machine scenarios |
| v1.8.0 | 2026-03 | Contracts & Chaos | Pact Broker, fault injection, Toxiproxy |
| v1.9.0 | 2026-03 | CLI & Automation | @stubrix/cli standalone binary |
| v2.0.0 | 2026-03 | Multi-Protocol & Events | GraphQL, gRPC, Kafka, RabbitMQ, webhooks |
| v2.1.0 | 2026-03 | Enterprise & Auth | Auth/RBAC/multi-tenancy, VS Code extension, templates |
| v2.2.0 | 2026-03 | Observability & Performance | Prometheus, Grafana, k6, Jaeger/OTEL |
| **v2.3.0** | **2026-03** | **Cloud & Storage** | **LocalStack, MinIO, Keycloak, Zitadel** |

> Current latest: **v2.3.0** — see [GitHub Releases](https://github.com/marcelo-davanco/stubrix/releases) for full changelogs.
