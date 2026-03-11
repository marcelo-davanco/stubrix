---
description: Create, review and manage pull requests using GitHub MCP integration
---

# Pull Request Workflow

## Creating a PR

1. Ensure your branch is up to date
```bash
git fetch origin && git rebase origin/main
```

2. Push your branch
```bash
git push -u origin $(git branch --show-current)
```

3. Create PR via GitHub MCP (use the `mcp3_create_pull_request` tool):
   - **owner**: `marcelo-davanco`
   - **repo**: `stubrix`
   - **title**: Follow conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
   - **head**: your branch name
   - **base**: `main`
   - **body**: Description with context, what changed, and how to test
   - **draft**: `true` if still in progress

## PR Description Template
```markdown
## What
Brief description of changes.

## Why
Context and motivation.

## How
Technical approach and key decisions.

## Testing
- [ ] Unit tests pass: `npm run test -w @stubrix/api`
- [ ] Build succeeds: `npm run build`
- [ ] Manual testing steps...

## Screenshots
(if UI changes)
```

## Reviewing a PR

1. Get PR details: use `mcp3_pull_request_read` with method `get`
2. View diff: use `mcp3_pull_request_read` with method `get_diff`
3. Check files changed: use `mcp3_pull_request_read` with method `get_files`
4. Check build status: use `mcp3_pull_request_read` with method `get_status`
5. Create review: use `mcp3_pull_request_review_write`
6. Add comments: use `mcp3_add_comment_to_pending_review`

## Code Review Checklist
- [ ] Follows NestJS conventions (API) or React patterns (UI)
- [ ] Types in @stubrix/shared if cross-package
- [ ] DTOs validated with class-validator
- [ ] No hardcoded credentials or env values
- [ ] Unit tests for new services
- [ ] TailwindCSS only for styling (no inline styles)
- [ ] Build order respected (shared → api/db-ui → ui)

## Merging
- Use squash merge for feature branches
- Use merge commit for release branches
- Delete branch after merge
