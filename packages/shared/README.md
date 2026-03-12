# @stubrix/shared

Shared TypeScript types consumed by all packages in the Stubrix monorepo.

## Overview

Single source of truth for all domain types. No runtime code — pure TypeScript declarations compiled to `.d.ts` files.

## Exported Types

### Project

```typescript
interface Project {
  id: string
  name: string
  slug: string
  proxyTarget: string | null
  description: string
  createdAt: string | null
}

interface ProjectWithStats extends Project {
  mocksCount: number
}

interface CreateProjectDto {
  name: string
  proxyTarget?: string
  description?: string
}

interface UpdateProjectDto {
  name?: string
  proxyTarget?: string | null
  description?: string
}
```

### Mock

```typescript
interface MockRequest {
  method: string
  url?: string
  urlPattern?: string
  urlPath?: string
  urlPathPattern?: string
  headers?: Record<string, unknown>
  bodyPatterns?: unknown[]
}

interface MockResponse {
  status: number
  headers?: Record<string, string>
  body?: string
  bodyFileName?: string
  fixedDelayMilliseconds?: number
}

interface Mock {
  id: string
  request: MockRequest
  response: MockResponse
  metadata?: MockMetadata
}

interface MockListItem {
  id: string
  filename: string
  projectId: string
  request: { method: string; url: string }
  response: { status: number; hasBodyFile: boolean; bodyFileName?: string; bodyPreview?: string }
}

interface MockDetail extends MockListItem {
  mapping: Mock
  body?: string
}
```

### Status

```typescript
type EngineType = 'wiremock' | 'mockoon'
type EngineStatus = 'running' | 'stopped' | 'error'

interface StatusResponse {
  engine: EngineType
  engineStatus: EngineStatus
  port: number
  controlPort: number
  recordMode: boolean
  proxyTarget: string | null
  mocks: { total: number; bodyFiles: number; byProject: Record<string, number> }
  projects: number
  uptime: number
}
```

### Recording

```typescript
interface RecordingState {
  active: boolean
  projectId: string | null
  proxyTarget: string | null
  startedAt: string | null
  requestsRecorded: number
  includePatterns?: string[]
  excludePatterns?: string[]
}

interface StartRecordingDto {
  proxyTarget?: string
  includePatterns?: string[]
  excludePatterns?: string[]
}

interface RecordingStopResult {
  message: string
  projectId: string
  newMocks: number
  files: string[]
}
```

### Database

```typescript
interface Engine {
  name: string
  status: 'active' | 'inactive' | 'error'
}

interface Snapshot {
  name: string
  size: number
  sizeFormatted: string
  createdAt: string
  favorite: boolean
  protected: boolean
  category: string | null
  engine: string | null
  projectId?: string | null
}

interface DatabaseInfo {
  database: string
  engine: string
  totalSize: string
  tables: Array<{ name: string; size: string }>
}
```

### Log

```typescript
interface LogEntry {
  id: string
  timestamp: string
  method: string
  url: string
  status: number
  responseTime: number
  matched: boolean
  projectId?: string
}
```

## Build Order

This package **must be built first** — all other packages depend on it:

```
@stubrix/shared → @stubrix/api
                → @stubrix/db-ui
                → @stubrix/mock-ui
                → @stubrix/ui
```

## Development

```bash
# From monorepo root
npm run build:shared     # tsc compile

# From packages/shared
npm run build            # tsc
```
