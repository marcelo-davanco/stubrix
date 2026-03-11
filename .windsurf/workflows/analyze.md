---
description: Structured architectural analysis for complex technical decisions with step-by-step reasoning
---

# Architectural Analysis

User must provide: **problem or decision** to be analyzed.

## When to Use

- Architectural decisions with trade-offs (e.g. "should we use event sourcing here?").
- Impact assessment of cross-cutting changes (e.g. "migrate from Fastify to Express").
- Complex problems with multiple possible causes.
- Choosing between competing technical approaches.
- **Do not use** for simple tasks or direct factual questions.

## Reasoning Process

### Phase 1 — Context

1. Read the files relevant to the problem.
2. Map dependencies and affected components.
3. List known constraints (performance, compatibility, deadline, team).

### Phase 2 — Options

4. Enumerate possible approaches (minimum 2, maximum 4).
5. For each option:
   - **Description** in 1-2 lines.
   - **Pros** (concrete benefits).
   - **Cons** (risks and costs).
   - **Impact** on existing code (affected files, migrations, breaking changes).
   - **Effort** estimate (low/medium/high).

### Phase 3 — Decision

6. Compare options against constraints.
7. Reconsider assumptions — was any option dismissed too early?
8. Choose the recommendation with clear justification.
9. Document residual risks and mitigations.

### Phase 4 — Pre-Mortem

Before executing, validate the plan through 4 lenses:

10. **Missing Requirements** — what's not in the plan that should be? What questions weren't asked?
11. **Feasibility** — what's technically difficult? What will take 3× longer than estimated?
12. **Scope** — what's unnecessary? Where will scope creep happen? What's missing?
13. **Verifiability** — are success criteria mechanically verifiable (tests, queries, commands)? If not, rewrite them.

**Decision Gate:**

- **PROCEED** — plan passed all 4 lenses, execute.
- **ADDRESS** — addressable concerns exist, fix plan before executing.
- **RETHINK** — fundamental problems, go back to Phase 2.

### Phase 5 — Execution Plan

14. List ordered steps to implement the decision.
15. Identify which existing workflows to apply if applicable.
16. Define success criteria and how to validate.

## Output Template

```markdown
# Analysis: <Decision Title>

**Date:** DD/MM/YYYY
**Context:** <problem summary in 2-3 lines>

## Constraints

- <constraint 1>
- <constraint 2>

## Options

### Option A: <name>

- **Description:** ...
- **Pros:** ...
- **Cons:** ...
- **Impact:** <affected files>
- **Effort:** low | medium | high

### Option B: <name>

(same format)

## Recommendation

**Chosen option:** <A or B>
**Justification:** <why this is the best option given the constraints>

## Residual Risks

- <risk 1> → mitigation: ...

## Pre-Mortem

| Lens                 | Finding |
| -------------------- | ------- |
| Missing Requirements | ...     |
| Feasibility          | ...     |
| Scope                | ...     |
| Verifiability        | ...     |

**Decision Gate:** PROCEED / ADDRESS / RETHINK

## Execution Plan

1. <step 1>
2. <step 2>
3. ...

## Success Criteria

- <criterion 1>
- <criterion 2>
```

## Execution Discipline

### Complexity Control

- **Revert-First** — when something breaks during execution: (1) STOP, (2) revert?, (3) delete?, (4) 1-line fix?, (5) none → go back to Phase 1.
- **10-Line Rule** — fix needs >10 new lines? It's not a fix — rethink the approach.
- **3-Strike Rule** — same area breaks 3× → replan with a fundamentally different approach.
- **Complexity Budget** — track during execution: files added (max 3), new abstractions (max 2), line balance (target: net-zero). If exceeded, STOP and revalidate.

### Autonomy Leash

- Maximum **2 fix attempts** per step. Both fail → **full STOP**.
- Revert uncommitted changes. Present to the user: what should have happened, what happened, the 2 attempts, likely root cause.
- Never chain fixes silently — correction spirals derail projects.

### Decision Anchoring

- For each decision made, record: **what was chosen**, **what was discarded**, and **why**.
- Frame trade-offs as: "X at the cost of Y" — never recommend without stating the cost.
- If an approach fails, document it as an anti-pattern to prevent repetition.

## Rules

- Never recommend without exploring at least 2 options.
- Make trade-offs explicit — no perfect solutions exist.
- Anchor decisions in project principles and existing conventions.
- If analysis reveals scope is larger than expected, communicate before proceeding.
- Simplifying is the default response to failure — don't add layers.
