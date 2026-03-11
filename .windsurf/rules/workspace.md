---
trigger: always_on
---

# Stubrix — Mock Server Platform

## Overview

Stubrix is a unified container for running **WireMock** or **Mockoon CLI**, sharing the same mock structure. It includes a control plane (API + UI) for managing mocks visually.

## Stack

| Layer      | Technology                                                  |
| ---------- | ----------------------------------------------------------- |
| Runtime    | Node ≥ 18                                                   |
| Monorepo   | npm workspaces (`packages/shared`, `packages/api`, `packages/ui`) |
| API        | NestJS 11 + Express, WebSockets (Socket.IO)                 |
| UI         | React 19 + Vite, TailwindCSS, Lucide icons, React Router   |
| Shared     | TypeScript lib consumed by both API and UI                  |
| Engines    | WireMock (Java) and Mockoon CLI (Node.js) via Docker        |
| Infra      | Docker Compose (4 profiles), Makefile                       |
| Testing    | Jest (API), ESLint, Prettier                                |

## Project Structure

```
stubrix/
├── packages/
│   ├── shared/        # Shared types and utilities (@stubrix/shared)
│   ├── api/           # NestJS control plane backend (@stubrix/api)
│   └── ui/            # React + Vite dashboard (@stubrix/ui)
├── mocks/
│   ├── mappings/      # WireMock route definitions (JSON)
│   └── __files/       # Response body files
├── scripts/           # Converter, entrypoint, recording helpers
├── Dockerfile         # Multi-engine Docker image
├── docker-compose.yml # 4 profiles: wiremock, wiremock-record, mockoon, mockoon-proxy
└── Makefile           # CLI shortcuts
```

## Mandatory Principles

- **Clean Code**, **DRY**, **SRP** — pragmatic solutions, no over-engineering.
- Respect existing architecture and conventions.
- Do not add or remove comments/documentation unless explicitly requested.
- After refactoring, verify no unused imports or dead references remain.

## TypeScript — Type Safety

- **NEVER** use `any`. Use `unknown` + type narrowing.
- Complex functions: explicit return type.
- Handle `null`/`undefined` with `?.` or guard clauses.
- Generics with constraints (`extends`) when applicable.

## Security (Baseline)

- No hardcoded secrets — use environment variables (`.env`).
- Never commit `.env` — use `.env.example` for reference.
- Never expose internal errors or stack traces in API responses.
