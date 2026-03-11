---
description: Emergency production hotfix — branch from main, minimal fix, regression test, expedited PR
---

# Hotfix

User must provide: **production bug description** and **severity** (critical/high).

## Steps

### 1. Create hotfix branch

```bash
git fetch origin main
git checkout -b hotfix/<short-description> origin/main
```

### 2. Reproduce and diagnose

- Follow steps 1-4 of the `/debug` workflow to locate the root cause.
- **Difference:** focus on speed — minimal logging, fast isolation.

### 3. Implement minimal fix

- **Golden rule:** fix resolves ONLY the bug. Zero refactoring, zero improvement, zero features.
- Write regression test **before** the fix (RED → GREEN) when applicable.
- Keep the fix in the fewest files possible.

### 4. Validate

- Run existing tests to ensure nothing broke.
- Manually verify the affected flow if possible.

### 5. Commit and expedited PR

- Commit with `hotfix` prefix:

```text
🚑 fix(<scope>): <short bug description>

<Root cause in 1-2 sentences>

Changes:
- <file>: <what changed>

Regression test: <test name>
```

```bash
git add .
git commit -m '<message>'
git push origin hotfix/<short-description>
```

- Create PR via GitHub MCP (if available) — follow `pull-requests.md` rules:
  - Base: `main`
  - Title: `🚑 hotfix: <description>` (Portuguese)
  - Body: root cause, applied fix, regression test, residual risk
  - **Do NOT create as draft** — hotfix needs immediate review

### 6. Post-merge

- Check if `develop` (or development branch) needs the cherry-pick:

```bash
git checkout develop
git cherry-pick <commit-hash>
```

- Monitor after deploy to confirm the fix resolved the issue.

## Rules

- **Urgency doesn't justify carelessness** — regression test is required even in hotfixes.
- **Minimum scope** — any change beyond the fix goes in a separate PR.
- **Communicate** — inform the team about the hotfix (what, why, when).
- **Post-mortem** — after stabilizing, document root cause and preventive action.
