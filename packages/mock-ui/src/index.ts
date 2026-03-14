// @stubrix/mock-ui - Mock UI Micro Frontend
//
// This package provides React components and hooks for managing mock servers,
// extracted from the main @stubrix/ui package following the micro frontend pattern.

// API Layer
export { mockApi, configureMockApi } from './lib/mock-api.js';
export type {
  CreateMockDto,
  UpdateMockDto,
  ScenarioMeta,
  ScenarioBundle,
  ScenarioDiff,
  StatefulMock,
  CreateStatefulMockDto,
  UpdateStatefulMockDto,
  RagQueryResult,
  MockSuggestion,
  DataSuggestion,
  FaultRule,
  FaultProfile,
  ChaosPreset,
  CreateChaosProfileDto,
  LintResult,
  CoverageReport,
  WebhookEvent,
  WebhookSimulation,
  CreateWebhookSimulationDto,
  TemplateVariable,
  MockTemplate,
  CreateTemplateDto,
  MetricsSummary,
} from './lib/mock-api.js';

// Shared Components
export { StatCard } from './components/StatCard.js';
export { ActionBtn } from './components/ActionBtn.js';
export { Field } from './components/Field.js';
export { EmptyState } from './components/EmptyState.js';
export { MockMethodBadge } from './components/MockMethodBadge.js';
export { EngineStatusBar } from './components/EngineStatusBar.js';
export { ProjectCard } from './components/ProjectCard.js';
export { CreateProjectModal } from './components/CreateProjectModal.js';
export { ToastProvider, useToast } from './components/ToastProvider.js';
export type { ToastType } from './components/ToastProvider.js';
export { InlineAlert } from './components/InlineAlert.js';

// Hooks
export { useMockManager } from './hooks/useMockManager.js';

// Pages — Core
export { MockServersPage } from './pages/MockServersPage.js';
export { ProjectDashboardPage } from './pages/ProjectDashboardPage.js';
export { MocksListPage } from './pages/MocksListPage.js';
export { MockEditorPage } from './pages/MockEditorPage.js';
export { RecordingPanelPage } from './pages/RecordingPanelPage.js';

// Pages — New Services
export { ScenariosPage } from './pages/ScenariosPage.js';
export { StatefulMocksPage } from './pages/StatefulMocksPage.js';
export { WebhooksPage } from './pages/WebhooksPage.js';
export { ChaosPanelPage } from './pages/ChaosPanelPage.js';
export { CoveragePage } from './pages/CoveragePage.js';
export { GovernancePage } from './pages/GovernancePage.js';
export { IntelligencePage } from './pages/IntelligencePage.js';
export { TemplatesPage } from './pages/TemplatesPage.js';

// Pages — Observability
export { MetricsPage } from './pages/MetricsPage.js';
export { TracingPage } from './pages/TracingPage.js';
export { PerformancePage } from './pages/PerformancePage.js';

// Pages — Protocols & Events
export { ProtocolsPage } from './pages/ProtocolsPage.js';
export { EventsPage } from './pages/EventsPage.js';
export { ChaosNetworkPage } from './pages/ChaosNetworkPage.js';

// Pages — Enterprise
export { AuthPage } from './pages/AuthPage.js';
export { IamPage } from './pages/IamPage.js';
export { ContractsPage } from './pages/ContractsPage.js';

// Pages — Cloud & Storage
export { CloudPage } from './pages/CloudPage.js';
export { StoragePage } from './pages/StoragePage.js';