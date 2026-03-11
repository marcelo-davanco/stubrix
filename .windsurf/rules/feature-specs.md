---
trigger: always
description: Feature spec management — numbered markdown files in features/ directory with Portuguese content
---

# Feature Specs Rules

## Location
Feature specs live in the root `features/` directory (outside stubrix repo).

## Format
- Numbered sequentially: `{NN}-{feature-name}.md`
- Written in **Portuguese** (project language for specs)
- Master plan: `integracao-db-docker.md`
- Individual tasks: `01-criar-packages-db.md` through `10-validacao-testes.md`

## Editing Rules
- **Never delete** completed acceptance criteria — mark them with `[x]`
- Add implementation notes inline as you work
- Update status when features are partially or fully complete
- Keep specs as living documents throughout development

## Cross-References
- Feature implementations → `stubrix/packages/`
- Docker changes → `stubrix/docker-compose.yml`
- Environment → `stubrix/.env.example`
- Build/test → `stubrix/Makefile`

## Creating New Features
Use the `/create-feature` workflow which includes creating the spec file.
