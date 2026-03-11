---
description: Structured bug debugging — reproduce, isolate, root cause, fix, regression test
---

# Bug Debugging

User must provide: **bug description** (error message, expected vs actual behavior, logs if available).

## Steps

### 1. Understand the bug

- Confirm: **what happens**, **what should happen**, **when it happens** (always? intermittent?).
- Identify the affected **component/flow**.
- If the user provided logs, extract: stack trace, status code, error message.

### 2. Locate the flow in the codebase

- Map the complete flow from entry point to the failing component.
- Identify all involved dependencies.
- Use `code_search` or `grep` to locate relevant files.
- Read each file in the impacted flow to understand current behavior.

### 3. Reproduce the bug

- Identify **prerequisites** (state, required data, configuration).
- If possible, write a **failing test** reproducing the bug (RED).
- If not possible with an automated test, document manual reproduction steps.

### 4. Isolate the root cause

- **Never treat symptoms** — find the real origin of the problem.
- Isolation strategies:
  - **Binary search:** comment out/mock half the flow to identify where it fails.
  - **Temporary logging:** add log statements with context at suspect points.
  - **State inspection:** check data/config state at the point of failure.

- Classify the cause type:
  - **Runtime** — runtime error, null reference, incorrect type
  - **Logic** — wrong condition, unhandled edge case, race condition
  - **Data** — inconsistent data, unexpected format, missing values
  - **Integration** — timeout, incorrect payload, unexpected response
  - **Config** — wrong env var, missing dependency, incorrect setup

### 5. Implement the fix

- **Minimal fix** — resolve only the root cause, no opportunistic refactoring.
- Ensure the regression test from step 3 now **passes** (GREEN).
- Verify no existing tests broke.

### 6. Validate

- Confirm the fix resolves the bug without side effects.
- No stack traces or sensitive data exposed in outputs.

### 7. Document

- Summarize for the user:
  - **Root cause** (1-2 sentences)
  - **Fix applied** (file, line, change)
  - **Regression test** added
  - **Residual risk** (if any)

## Rules

- **Root cause first** — never apply a workaround without understanding the cause.
- **Regression test required** — a bug without a test will return.
- **Minimal fix** — one change, one commit, one problem solved.
- **No opportunistic refactoring** — if you find bad code along the way, note it for later.
- **Temporary logging** must be removed before the final commit.
