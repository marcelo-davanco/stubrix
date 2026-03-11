---
trigger: manual
description: 'Pull Requests: Portuguese body, self-contained, draft by default, GitHub MCP integration'
---

# Pull Requests

## Hard Rules

1. **PR title and body always in Portuguese** — human-facing content for the team.
2. **Self-contained** — the PR body must stand alone without reading commits, chat, or external context.
3. **Stateless** — on updates, rewrite the PR body entirely. Never append; always reflect the current state.
4. **Draft by default** — create PRs as draft unless explicitly told otherwise (exception: hotfixes).
5. **Never assign reviewers** without user confirmation.
6. **Base branch** — confirm with the user (`main` or `develop`) before creating.

## PR Body Template

Use this template when creating PRs via GitHub MCP. If `.github/pull_request_template.md` exists in the repo, **merge both**: fill the repo template sections AND include the structured sections below.

```markdown
## Resumo

<O que este PR faz + qual problema resolve + quem se beneficia. 1-3 frases.>

## Decisões Técnicas

<Implementação em alto nível. Decisões-chave: o que foi escolhido, por quê, alternativas consideradas.>

## Mudanças

- <área 1>: <o que mudou>
- <área 2>: <o que mudou>

## Como Verificar

<Passos para o reviewer validar manualmente. Omitir se puramente interno.>

## Plano de Testes

<QA manual, smoke tests. Não repetir o que os testes automatizados cobrem.>

## Considerações Futuras

<Itens fora de escopo mas que vale rastrear. Omitir se não houver.>
```

### Section Guidelines

| Section | Required | Notes |
|---------|----------|-------|
| Resumo | Always | 1-3 sentences, clear problem → solution |
| Decisões Técnicas | If non-trivial | Skip for simple changes (typos, config) |
| Mudanças | Always | Grouped by area, not by file |
| Como Verificar | If applicable | Omit for internal-only changes |
| Plano de Testes | If applicable | Don't repeat automated coverage |
| Considerações Futuras | If applicable | Omit if nothing to track |

## PR Types

| Type | Draft? | Base | Notes |
|------|--------|------|-------|
| Feature | Yes (draft) | `develop` or `main` (confirm) | Standard flow |
| Hotfix | **No** (immediate review) | `main` | See `/hotfix` workflow |
| Chore/Docs | Yes (draft) | `develop` or `main` (confirm) | Standard flow |

## Checklist

Before creating any PR, verify:

- [ ] Title in Portuguese, descriptive (not the commit message)
- [ ] Body follows the template above
- [ ] Body is self-contained (no "as discussed in chat")
- [ ] Base branch confirmed with user
- [ ] Draft mode set correctly (draft by default, except hotfix)
- [ ] No secrets, tokens, or PII in the PR body

## GitHub MCP Integration

When creating PRs via `github` MCP server:

- Use `create_pull_request` with `draft: true` (default) or `draft: false` (hotfix).
- After creation, share the PR URL with the user.
- Never assign reviewers without explicit confirmation.
- Never expose the MCP token in logs, messages, or project files.

## Anti-Patterns

- PR body in English
- Copy-pasting commit messages as the PR body
- Referencing chat context ("como combinamos", "conforme discutido")
- Leaving the GitHub template sections empty when creating via MCP
- Creating non-draft PRs without explicit user request (except hotfix)
