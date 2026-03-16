# @stubrix/ui

React 19 + Vite 7 host application — the main dashboard entry point for Stubrix.

## Overview

This package is the **host shell** that composes the micro frontend architecture. It provides routing, layout, and real-time logs. All mock server and database UI logic lives in dedicated packages consumed here.

## Package Role

| Responsibility                                         | Package                          |
| ------------------------------------------------------ | -------------------------------- |
| Mock server pages (Projects, Mocks, Editor, Recording) | `@stubrix/mock-ui`               |
| Database pages (Snapshots, Connections)                | `@stubrix/db-ui`                 |
| Real-time logs page                                    | **`@stubrix/ui`** (this package) |
| Layout, routing, navigation shell                      | **`@stubrix/ui`** (this package) |

## Structure

```
src/
├── App.tsx                  Route definitions + bridge wrappers
├── components/
│   ├── Layout.tsx           Sidebar + outlet shell
│   └── ui/
│       └── Badge.tsx        Shared badge component
├── lib/
│   ├── api.ts               Base API client (fetch wrapper)
│   ├── socket.ts            Socket.IO client for /ws/logs
│   └── utils.ts             cn() utility
└── pages/
    ├── MockServersBridge.tsx      → MockServersPage (@stubrix/mock-ui)
    ├── ProjectDashboardBridge.tsx → ProjectDashboardPage (@stubrix/mock-ui)
    ├── MocksListBridge.tsx        → MocksListPage (@stubrix/mock-ui)
    ├── MockEditorBridge.tsx       → MockEditorPage (@stubrix/mock-ui)
    ├── RecordingBridge.tsx        → RecordingPanelPage (@stubrix/mock-ui)
    └── LogsPage.tsx               Real-time logs (Socket.IO)
```

## Bridge Pattern

Each mock page is a thin wrapper that connects `react-router-dom` hooks to the router-agnostic props of `@stubrix/mock-ui`:

```tsx
// Example: MocksListBridge.tsx
import { useNavigate, useParams } from 'react-router-dom';
import { MocksListPage } from '@stubrix/mock-ui';

export function MocksListBridge() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  if (!projectId) return null;

  return (
    <MocksListPage
      projectId={projectId}
      onBack={() => navigate(`/projects/${projectId}`)}
      onNavigateToNewMock={(id) => navigate(`/projects/${id}/mocks/new`)}
      onNavigateToEditMock={(id, mockId) =>
        navigate(`/projects/${id}/mocks/${mockId}/edit`)
      }
    />
  );
}
```

## Routes

| Path                                      | Component                                         |
| ----------------------------------------- | ------------------------------------------------- |
| `/`                                       | `MockServersBridge` → `MockServersPage`           |
| `/projects/:projectId`                    | `ProjectDashboardBridge` → `ProjectDashboardPage` |
| `/projects/:projectId/mocks`              | `MocksListBridge` → `MocksListPage`               |
| `/projects/:projectId/mocks/new`          | `MockEditorBridge` → `MockEditorPage`             |
| `/projects/:projectId/mocks/:mockId/edit` | `MockEditorBridge` → `MockEditorPage`             |
| `/projects/:projectId/recording`          | `RecordingBridge` → `RecordingPanelPage`          |
| `/databases`                              | `DatabasesPage` (`@stubrix/db-ui`)                |
| `/logs`                                   | `LogsPage`                                        |
| `/scenarios`                              | `ScenariosBridge`                                 |
| `/stateful`                               | `StatefulMocksBridge`                             |
| `/webhooks`                               | `WebhooksBridge`                                  |
| `/chaos`                                  | `ChaosBridge`                                     |
| `/chaos-network`                          | `ChaosNetworkBridge`                              |
| `/coverage`                               | `CoverageBridge`                                  |
| `/governance`                             | `GovernanceBridge`                                |
| `/intelligence`                           | `IntelligenceBridge`                              |
| `/templates`                              | `TemplatesBridge`                                 |
| `/metrics`                                | `MetricsBridge`                                   |
| `/tracing`                                | `TracingBridge`                                   |
| `/performance`                            | `PerformanceBridge`                               |
| `/protocols`                              | `ProtocolsBridge` (GraphQL SDL + gRPC stubs)      |
| `/events`                                 | `EventsBridge` (Kafka + RabbitMQ)                 |
| `/auth`                                   | `AuthBridge`                                      |
| `/iam`                                    | `IamBridge`                                       |
| `/contracts`                              | `ContractsBridge`                                 |
| `/cloud`                                  | `CloudBridge`                                     |
| `/storage`                                | `StorageBridge`                                   |
| `/settings`                               | `SettingsPage` — service dashboard (24 services)  |
| `/settings/services/:serviceId`           | `ServiceConfigPage` — per-service config editor   |
| `/settings/backups`                       | `BackupsPage` — config backup management          |

## Development

```bash
# From monorepo root
npm run dev:ui       # Vite dev server on :5173 (proxies /api/* to :9090)
npm run build:ui     # TypeScript check + Vite production build
```

> Production build outputs to `packages/api/public/` for single-container serving.

## Dependencies

- `@stubrix/mock-ui` — mock server micro frontend
- `@stubrix/db-ui` — database micro frontend
- `@stubrix/shared` — shared TypeScript types
- `react-router-dom` ^7 — client-side routing
- `socket.io-client` — WebSocket connection for logs
