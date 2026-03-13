import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { MockServersBridge } from './pages/MockServersBridge'
import { ProjectDashboardBridge } from './pages/ProjectDashboardBridge'
import { MocksListBridge } from './pages/MocksListBridge'
import { MockEditorBridge } from './pages/MockEditorBridge'
import { RecordingBridge } from './pages/RecordingBridge'
import { LogsPage } from './pages/LogsPage'
import { DatabasesPage } from '@stubrix/db-ui'
import { ScenariosBridge } from './pages/ScenariosBridge'
import { StatefulMocksBridge } from './pages/StatefulMocksBridge'
import { WebhooksBridge } from './pages/WebhooksBridge'
import { ChaosBridge } from './pages/ChaosBridge'
import { CoverageBridge } from './pages/CoverageBridge'
import { GovernanceBridge } from './pages/GovernanceBridge'
import { IntelligenceBridge } from './pages/IntelligenceBridge'
import { TemplatesBridge } from './pages/TemplatesBridge'
import MetricsBridge from './pages/MetricsBridge'
import TracingBridge from './pages/TracingBridge'
import PerformanceBridge from './pages/PerformanceBridge'
import ProtocolsBridge from './pages/ProtocolsBridge'
import EventsBridge from './pages/EventsBridge'
import ChaosNetworkBridge from './pages/ChaosNetworkBridge'
import AuthBridge from './pages/AuthBridge'
import IamBridge from './pages/IamBridge'
import ContractsBridge from './pages/ContractsBridge'
import CloudBridge from './pages/CloudBridge'
import StorageBridge from './pages/StorageBridge'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<MockServersBridge />} />
          <Route path="projects/:projectId" element={<ProjectDashboardBridge />} />
          <Route path="projects/:projectId/mocks" element={<MocksListBridge />} />
          <Route path="projects/:projectId/mocks/new" element={<MockEditorBridge />} />
          <Route path="projects/:projectId/mocks/:mockId/edit" element={<MockEditorBridge />} />
          <Route path="projects/:projectId/recording" element={<RecordingBridge />} />
          <Route path="databases" element={<DatabasesPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="scenarios" element={<ScenariosBridge />} />
          <Route path="stateful" element={<StatefulMocksBridge />} />
          <Route path="webhooks" element={<WebhooksBridge />} />
          <Route path="chaos" element={<ChaosBridge />} />
          <Route path="coverage" element={<CoverageBridge />} />
          <Route path="governance" element={<GovernanceBridge />} />
          <Route path="intelligence" element={<IntelligenceBridge />} />
          <Route path="templates" element={<TemplatesBridge />} />
          <Route path="metrics" element={<MetricsBridge />} />
          <Route path="tracing" element={<TracingBridge />} />
          <Route path="performance" element={<PerformanceBridge />} />
          <Route path="protocols" element={<ProtocolsBridge />} />
          <Route path="events" element={<EventsBridge />} />
          <Route path="chaos-network" element={<ChaosNetworkBridge />} />
          <Route path="auth" element={<AuthBridge />} />
          <Route path="iam" element={<IamBridge />} />
          <Route path="contracts" element={<ContractsBridge />} />
          <Route path="cloud" element={<CloudBridge />} />
          <Route path="storage" element={<StorageBridge />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
