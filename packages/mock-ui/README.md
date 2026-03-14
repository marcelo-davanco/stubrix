# @stubrix/mock-ui

Mock server micro frontend for the Stubrix platform — React 19 + TailwindCSS.

## Overview

Standalone package containing all mock server UI: pages, components, state hook, and API client. Router-agnostic by design — navigation is injected via callback props, following the same pattern as `@stubrix/db-ui`.

## Structure

```
src/
├── index.ts                  Public API — all exports
├── lib/
│   └── mock-api.ts           Typed API client (14 endpoints)
├── hooks/
│   └── useMockManager.ts     Central state hook
├── components/
│   ├── StatCard.tsx           Stats display card
│   ├── ProjectCard.tsx        Project listing card with action buttons
│   ├── ActionBtn.tsx          Small icon action button
│   ├── CreateProjectModal.tsx Modal form for creating projects
│   ├── Field.tsx              Form field wrapper with label
│   ├── EmptyState.tsx         Empty state placeholder
│   ├── MockMethodBadge.tsx    HTTP method badge (colored)
│   ├── EngineStatusBar.tsx    Engine status (4 stat cards)
│   ├── ToastProvider.tsx      Context-based toast notifications
│   └── InlineAlert.tsx        Inline error display with retry
└── pages/
    ├── MockServersPage.tsx        Project list + engine status
    ├── ProjectDashboardPage.tsx   Per-project stats + quick actions
    ├── MocksListPage.tsx          Mocks table with search + delete
    ├── MockEditorPage.tsx         Create/edit mock form
    └── RecordingPanelPage.tsx     Start/stop/snapshot recording
```

## Public API

```typescript
// API client
export { mockApi, configureMockApi } from './lib/mock-api'
export type { CreateMockDto, UpdateMockDto } from './lib/mock-api'

// Central state hook
export { useMockManager } from './hooks/useMockManager'

// Components
export { StatCard } from './components/StatCard'
export { ProjectCard } from './components/ProjectCard'
export { ActionBtn } from './components/ActionBtn'
export { CreateProjectModal } from './components/CreateProjectModal'
export { Field } from './components/Field'
export { EmptyState } from './components/EmptyState'
export { MockMethodBadge } from './components/MockMethodBadge'
export { EngineStatusBar } from './components/EngineStatusBar'
export { ToastProvider, useToast } from './components/ToastProvider'
export type { ToastType } from './components/ToastProvider'
export { InlineAlert } from './components/InlineAlert'

// Pages
export { MockServersPage } from './pages/MockServersPage'
export { ProjectDashboardPage } from './pages/ProjectDashboardPage'
export { MocksListPage } from './pages/MocksListPage'
export { MockEditorPage } from './pages/MockEditorPage'
export { RecordingPanelPage } from './pages/RecordingPanelPage'
```

## useMockManager

Central state hook — all pages consume it.

```typescript
const {
  // State
  projects,          // Project[]
  currentProject,    // Project | null
  mocks,             // MockListItem[]
  status,            // StatusResponse | null
  recording,         // RecordingState | null
  loading,           // boolean
  error,             // string | null

  // Actions
  refreshAll,
  selectProject,
  createProject, updateProject, deleteProject,
  createMock, updateMock, deleteMock,
  startRecording, stopRecording, takeSnapshot,
} = useMockManager(projectId?)   // optional initial project
```

## Pages — Navigation Props

All pages are decoupled from any router. Navigation is injected via props:

```typescript
// MockServersPage
<MockServersPage
  onNavigateToProject={(id) => navigate(`/projects/${id}`)}
  onNavigateToMocks={(id) => navigate(`/projects/${id}/mocks`)}
  onNavigateToRecording={(id) => navigate(`/projects/${id}/recording`)}
/>

// ProjectDashboardPage
<ProjectDashboardPage
  projectId="my-project"
  onBack={() => navigate('/')}
  onNavigateToMocks={(id) => navigate(`/projects/${id}/mocks`)}
  onNavigateToRecording={(id) => navigate(`/projects/${id}/recording`)}
  onNavigateToNewMock={(id) => navigate(`/projects/${id}/mocks/new`)}
/>

// MocksListPage
<MocksListPage
  projectId="my-project"
  onBack={() => navigate(-1)}
  onNavigateToNewMock={(id) => navigate(`/projects/${id}/mocks/new`)}
  onNavigateToEditMock={(id, mockId) => navigate(`/projects/${id}/mocks/${mockId}/edit`)}
/>

// MockEditorPage
<MockEditorPage
  projectId="my-project"
  mockId="abc123"           // omit for "new" mode
  onBack={() => navigate(-1)}
  onSaved={() => navigate(-1)}
/>

// RecordingPanelPage
<RecordingPanelPage
  projectId="my-project"
  onBack={() => navigate(-1)}
/>
```

## mockApi

Independent API client — configurable base URL.

```typescript
import { configureMockApi, mockApi } from '@stubrix/mock-ui'

// Configure (optional — defaults to /api)
configureMockApi({ baseUrl: 'http://localhost:9090/api' })

// Usage
const projects = await mockApi.projects.list()
const status = await mockApi.status.get()
await mockApi.recording.start(projectId, { proxyTarget: 'https://api.example.com' })
```

## Toast System

```tsx
import { ToastProvider, useToast } from '@stubrix/mock-ui'

// Wrap your app
<ToastProvider>
  <App />
</ToastProvider>

// Use anywhere
const { toast } = useToast()
toast({ type: 'success', title: 'Saved!', description: 'Mock created.' })
toast({ type: 'error', title: 'Failed', description: error.message })
```

## Development

```bash
# From monorepo root
npm run build:mock-ui    # TypeScript compile
```

## Dependencies

- `@stubrix/shared` — shared TypeScript types
- `react` ^19, `react-dom` ^19 (peer)
- `lucide-react` — icons
- `tailwind-merge`, `clsx` — class utilities
