---
trigger: always_on
description: 'Commits: Conventional Commits + Gitmoji — atomic, English-only, template required'
---

# Commits

## Hard Rules

1. **All commit content in English** — title, body, bullet points. **PRs in Portuguese.** Chat messages follow the conversation language.
2. **One logical change = one commit.** Split unrelated changes with `git add -p`.
3. **Follow the template below exactly.** No exceptions.
4. **Never run `git add` or `git commit` without explicit user approval.**
5. **Always ask the user which files to include.** Never auto-select.

## Conventional Commits + Gitmoji

Format: `<Gitmoji> <type>(<scope>): <imperative description>`

| Emoji | Type       | When to use                      |
| ----- | ---------- | -------------------------------- |
| 🐛    | `fix`      | Bug fix                          |
| ✨    | `feat`     | New feature                      |
| 📝    | `docs`     | Documentation                    |
| ♻️    | `refactor` | Refactoring (no behavior change) |
| 🧪    | `test`     | New or improved tests            |
| ⚡    | `perf`     | Performance optimization         |
| 🔒    | `security` | Security fix                     |
| 🔧    | `chore`    | Dependencies, build, CI/CD       |
| 🎨    | `style`    | Formatting, no logic impact      |
| 💥    | `BREAKING` | Breaking API change              |

## Template (required)

```text
<Gitmoji> <type>(<scope>): <short imperative title>

<1-2 line summary: what changed and why>

Changes:
- <item 1>
- <item 2>

<Technical details if relevant>

Impact: <how this improves the project>
```

## Checklist

- [ ] Single logical change (atomic)
- [ ] Correct Gitmoji + type
- [ ] Specific scope
- [ ] Imperative description in English
- [ ] Body explains the "why" in English
- [ ] No secrets, passwords, tokens, or PII

## Anti-Patterns

- Generic messages: `Fix`, `WIP`, `Update code`
- Multiple unrelated changes in one commit
- Missing conventional format
- Vague details without technical justification
- Commit content in Portuguese
- Running `git add` before asking the user which files to include
- Running `git commit` before showing preview and getting approval

### Violation Examples

```text
❌ WRONG — auto-adding files without asking:
   git add .windsurf/
   git add .gitignore

✅ CORRECT — ask first, then wait:
   "Which files do you want to include? Here's what changed:
    - .gitignore (modified)
    - .windsurf/ (untracked — 28 new files)"
   → Wait for user response before ANY git add.

❌ WRONG — committing without preview:
   git commit -m '📝 docs(windsurf): add rules'

✅ CORRECT — show preview, wait for approval:
   "## Commit 1 of 2
   Files: .windsurf/rules/, .windsurf/workflows/
   Message:
   📝 docs(windsurf): add rules and workflows for backend development
   ..."
   → Wait for explicit "ok" / "approved" / "go ahead" before git add + git commit.

❌ WRONG — commit content in Portuguese:
   git commit -m '📝 docs(windsurf): adicionar regras e workflows'

✅ CORRECT — commit content always in English:
   git commit -m '📝 docs(windsurf): add rules and workflows for backend development'
```
