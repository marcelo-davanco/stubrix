// @stubrix/mock-ui - Mock UI Micro Frontend
//
// This package provides React components and hooks for managing mock servers,
// extracted from the main @stubrix/ui package following the micro frontend pattern.

// API Layer
export { mockApi, configureMockApi } from './lib/mock-api.js';
export type { CreateMockDto, UpdateMockDto } from './lib/mock-api.js';

// Shared Components
export { StatCard } from './components/StatCard.js';
export { ActionBtn } from './components/ActionBtn.js';
export { Field } from './components/Field.js';
export { EmptyState } from './components/EmptyState.js';
export { MockMethodBadge } from './components/MockMethodBadge.js';
export { EngineStatusBar } from './components/EngineStatusBar.js';
export { ProjectCard } from './components/ProjectCard.js';
export { CreateProjectModal } from './components/CreateProjectModal.js';

// Hooks
export { useMockManager } from './hooks/useMockManager.js';

// Pages
export { MockServersPage } from './pages/MockServersPage.js';
export { ProjectDashboardPage } from './pages/ProjectDashboardPage.js';
export { MocksListPage } from './pages/MocksListPage.js';
export { MockEditorPage } from './pages/MockEditorPage.js';
export { RecordingPanelPage } from './pages/RecordingPanelPage.js';