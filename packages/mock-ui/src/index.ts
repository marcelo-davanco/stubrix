// @stubrix/mock-ui - Mock UI Micro Frontend
//
// This package provides React components and hooks for managing mock servers,
// extracted from the main @stubrix/ui package following the micro frontend pattern.

// API Layer
export { mockApi, configureMockApi } from './lib/mock-api.js';
export type { CreateMockDto, UpdateMockDto } from './lib/mock-api.js';

// TODO: Add exports as components are implemented
// - Components: ProjectCard, StatCard, MockMethodBadge, etc.
// - Hooks: useMockManager (central state management)
// - Pages: MockServersPage, ProjectDashboard, MocksList, etc.