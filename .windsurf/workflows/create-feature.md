---
description: Create a new feature for the Stubrix project following the standard pattern
---

# Create New Feature Workflow

## Steps

1. Create a feature branch from main
```bash
git checkout main && git pull && git checkout -b feature/{feature-name}
```

2. If the feature involves **shared types**, start there:
   - Add types to `packages/shared/src/types/`
   - Export from `packages/shared/src/index.ts`
   - Build shared: `npm run build:shared`

3. If the feature involves **API changes**:
   - Generate NestJS module: `cd packages/api && npx nest g module {feature}`
   - Create controller: `npx nest g controller {feature}`
   - Create service: `npx nest g service {feature}`
   - Create DTOs in `src/{feature}/dto/`
   - Register module in `src/app.module.ts`
   - Write unit tests: `src/{feature}/{feature}.spec.ts`
   - Run tests: `npm run test -w @stubrix/api`

4. If the feature involves **UI changes**:
   - Create page: `packages/ui/src/pages/{Feature}Page.tsx`
   - Add route in App.tsx or routes file
   - Create components in `packages/ui/src/components/`
   - Add API client methods in `packages/ui/src/lib/api.ts`

5. If the feature involves **db-ui microfrontend**:
   - Create components in `packages/db-ui/src/components/`
   - Export from `packages/db-ui/src/index.ts`
   - Build db-ui: `npm run build:db-ui`
   - Import in @stubrix/ui where needed

6. If the feature involves **Docker/infrastructure**:
   - Update `docker-compose.yml` with new profile/service
   - Add Makefile targets
   - Update `.env.example` with new variables

7. Write or update the feature spec
   - Create `features/{NN}-{feature-name}.md` with description, tasks, and acceptance criteria

8. Test the full flow
```bash
npm run build
npm run test -w @stubrix/api
```

9. Commit and push
```bash
git add -A && git commit -m "feat: {description}" && git push -u origin feature/{feature-name}
```

10. Create a pull request via GitHub MCP or GitHub UI

## Feature Spec Template
```markdown
# Feature: {Title}

## Summary
Brief description of the feature.

## Tasks
- [ ] Task 1
- [ ] Task 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```
