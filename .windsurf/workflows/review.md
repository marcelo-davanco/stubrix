---
description: Structured code review of branch or PR with Markdown output
---

# Code Review

User must provide: **branch name** or **PR number** to review.

## Steps

### 1. Get the diff

```bash
git fetch origin
git diff --name-only origin/main...HEAD
```

If the user specified a branch:

```bash
git diff --name-only origin/main...<branch>
```

### 2. Goal Alignment

Before analyzing code, answer:

- **What does the PR/branch aim to do?** (read title, commits, PR body if available)
- **Does the PR solve what was requested?** Missing requirements?
- **Is there scope creep?** Changes beyond the original scope?

If GitHub MCP is available, read the PR body and comments via MCP.

### 3. Analyze each modified file

// turbo

```bash
git diff origin/main...HEAD
```

Read each file **in full** (not just the diff) to understand context.

Analysis priority order:

1. **Security** — hardcoded secrets, data exposure, unsafe operations
2. **Type Safety** — `any`, `as any`, unhandled `null`/`undefined`, missing return types
3. **Architecture** — SRP, DRY, naming, boundary violations
4. **Performance** — unnecessary operations, blocking calls, resource leaks
5. **Tests** — coverage, determinism, meaningful assertions

### 4. Classify findings

For each finding, record:

- **Severity:** Critical | High | Medium | Low | Info
- **File and line**
- **Technical reason** (the why, not just the violated pattern)
- **Current code** vs **proposed solution**
- **Impact** if not fixed

### 5. Verify tests

- Run existing tests to check if they pass.
- Is there coverage for new/changed code?
- Do tests follow good practices (clear assertions, no flakiness)?

### 6. Generate output

Save to: `analysis/code-review/<DATE_DD-MM-YYYY>/<BRANCH_NAME>-review.md`

````markdown
# Code Review — <branch/PR>

**Date:** <date>
**Reviewer:** Cascade
**Status:** ✅ Approved | ⚠️ With Caveats | ❌ Requires Fixes

## Executive Summary

| Severity | Count |
| -------- | ----- |
| Critical | X     |
| High     | X     |
| Medium   | X     |
| Low      | X     |
| Info     | X     |

## Goal Alignment

<Does the PR solve what was requested? Scope creep?>

## Review by File

### `<path/to/file.ts>`

#### [<Severity>] <Finding title>

**Line:** <number>
**Reason:** <technical explanation>

```typescript
// ❌ Current
<problematic code>

// ✅ Solution
<fixed code>
```
````

**Impact:** <consequence if not fixed>

---

## Quick Wins

<High-impact, low-effort fixes — resolve first>

## Strengths

<Positive aspects: good practices, sound decisions>

## Checklist

- [ ] Type Safety (no `any`, explicit types)
- [ ] Security (no secrets, safe operations)
- [ ] Performance (no unnecessary overhead)
- [ ] Clean Code (naming, DRY, SRP)
- [ ] Tests (adequate coverage)
- [ ] Architecture (respects project conventions)
- [ ] Error Handling (no leaks, consistent format)

## General Recommendations

<Final observations>
```

### 7. Present to the user

- Quick summary: status, finding count, quick wins
- Ask if they want to auto-apply any fix
- If status = ❌, list blockers that must be resolved before merge

## Rules

- **Anti-noise:** if nothing significant found, say so explicitly — never invent issues.
- **Full code:** always read the entire file, not just the diff.
- **Pragmatism:** suggestions must be implementable, not theoretical.
- **Strengths:** always recognize what's well done.
