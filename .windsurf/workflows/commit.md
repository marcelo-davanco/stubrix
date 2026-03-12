---
description: Generate atomic commits following Conventional Commits + Gitmoji
---

# Generate Commit

## ⛔ INVIOLABLE RULES — Read before ANY action

These rules override ALL other instructions. Violating any of them is a critical failure.

1. **Commit content always in English** — title, body, bullet points. **PR body always in Portuguese.** Chat messages follow the conversation language (respond in the same language the user is using).
2. **NEVER run `git add` or `git commit` without explicit user approval.** No exceptions.
3. **NEVER auto-include files.** Always ask the user which files to include and WAIT.
4. **ALWAYS show a full preview** of every commit message and WAIT for approval before executing.
5. **One logical change = one commit.** Always check atomicity and propose grouping.
6. **Follow the commit message template exactly.** No shortcuts.

### Violation Detection — If you catch yourself doing any of these, STOP immediately:

- Running `git add` before the user selected files → **VIOLATION**
- Running `git commit` before showing preview and getting approval → **VIOLATION**
- Writing commit content in Portuguese (title, body, Changes, Impact) → **VIOLATION**
- Writing PR body in English instead of Portuguese → **VIOLATION**
- Combining unrelated changes in one commit without asking → **VIOLATION**
- Generating a commit message without the full template (Gitmoji, type, scope, body, Changes, Impact) → **VIOLATION**

---

## Commit Message Template (required — no exceptions)

Format: `<Gitmoji> <type>(<scope>): <imperative description>`

| Emoji | Type       | When to use                      |
| ----- | ---------- | -------------------------------- |
| ✨    | `feat`     | New feature                      |
| 🐛    | `fix`      | Bug fix                          |
| 📝    | `docs`     | Documentation                    |
| ♻️    | `refactor` | Refactoring (no behavior change) |
| 🧪    | `test`     | New or improved tests            |
| ⚡    | `perf`     | Performance optimization         |
| 🔒    | `security` | Security fix                     |
| 🔧    | `chore`    | Dependencies, build, CI/CD       |
| 🎨    | `style`    | Formatting, no logic impact      |
| 💥    | `BREAKING` | Breaking API change              |

```text
<Gitmoji> <type>(<scope>): <short imperative title>

<1-2 line summary: what changed and why>

Changes:
- <item 1>
- <item 2>

<Technical details if relevant>

Impact: <how this improves the project>
```

---

## Steps

### GATE 0 — Branch Check (MANDATORY before anything else)

Verify you are NOT on `main` before proceeding. If you are, STOP and create a branch first.

// turbo
```bash
git branch --show-current
```

If the output is `main` → **STOP**. Run the branch setup sequence:

```bash
git checkout main && git pull origin main && git checkout -b <type>/<short-description>
```

Branch naming convention:

| Type | Pattern |
| ---- | ------- |
| Feature | `feature/<name>` |
| Bug fix | `fix/<name>` |
| Docs | `docs/<name>` |
| Chore | `chore/<name>` |
| Refactor | `refactor/<name>` |
| Hotfix | `hotfix/<name>` |

⛔ **Never commit directly to `main`. If on `main`, branch first — always.**

---

### GATE 1 — File Selection (no git add allowed yet)

1. **List modified files:**

// turbo

```bash
git status
```

2. **Present the file list to the user and ASK which files to include.**

⛔ **STOP HERE. Wait for the user to respond.** Do NOT proceed until the user explicitly selects files. Do NOT run `git add` — that only happens in GATE 4. The user may specify:

- Specific files
- Glob pattern (e.g. `src/modules/fragrance/**`)
- "all" — only if the user explicitly says "all"

### GATE 2 — Atomicity Check (no git add allowed yet)

3. **Diff only the user-selected files:**

```bash
git diff <selected files>
```

For untracked files, read them to understand the content.

4. **Check atomicity and propose grouping.** If selected files contain unrelated changes, propose splitting into N separate commits. Present a grouping table:

```
Commit 1: <type>(<scope>) — file1, file2
Commit 2: <type>(<scope>) — file3, file4
```

⛔ **STOP HERE. Wait for user confirmation of the grouping.** Record the approved count (N). Do NOT run `git add` yet — that only happens in GATE 4.

### GATE 2.5 — Lightweight Self-Review (no git add allowed yet)

Before generating commit messages, scan the diff for common review pitfalls:

- **Security:** Any hardcoded secrets, tokens, or credentials?
- **Type Safety:** Any `any` types, unhandled `null`/`undefined`?
- **Cleanup:** Any unused imports, dead code, or leftover debug statements?
- **Consistency:** Do the changes follow existing project conventions?

If issues found → list them to the user with suggested fixes. Wait for resolution before proceeding to GATE 3.
If no issues found → proceed silently.

### GATE 3 — Preview (no git add allowed yet)

5. **Generate exactly N commit messages** (one per approved group) using the template above. Validate: message count == N.

6. **Show the full preview in chat.** Display each commit as a separate section:

```
## Commit 1 of N
Files: file1, file2
Message:
<full commit message>

---
## Commit 2 of N
...
```

⛔ **STOP HERE. Wait for explicit user approval (e.g. "ok", "approved", "go ahead").** The user must confirm before ANY `git add` or `git commit` runs. If the user requests changes, regenerate and show preview again. `git add` is ONLY allowed after this gate.

### GATE 4 — Execute (only after approval)

7. **Stage files** (only after user approved the preview):

```bash
git add <files for commit X>
```

8. **Security check** before committing:
   - No secrets, passwords, tokens, or PII in staged files.
   - Run `git diff --cached` to verify no `.env` or credentials were included.
   - If check fails, unstage files and abort.

9. **Commit** (only after security check passes):

```bash
git commit -m '<message for commit X>'
```

## Create Pull Request (optional — requires GitHub MCP)

If the `github` MCP server is available, continue. Otherwise the workflow ends at step 9.

Follow all rules from `pull-requests.md` (template, language, draft mode).

10. **Push the branch:**

```bash
git push origin <branch>
```

11. **Create PR** via GitHub MCP (if available) — apply `pull-requests.md` rules:
    - Title and body in Portuguese.
    - Use the PR body template from `pull-requests.md`.
    - Base branch: confirm with user (`main` or `develop`).
    - Draft by default (except hotfix).

12. **Review** the created PR — never assign reviewers without confirmation.

---

## 🔄 Version Management Reminder

After committing code changes, remember to update package versions:

1. **Update versions**: `npm run version` (auto-detects increment type)
2. **Build packages**: `npm run build:shared && npm run build`
3. **Commit version changes**: `git commit -m "🔧 chore(version): update package versions"`

The pre-commit hook will remind you about version updates when needed.
