import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { MockServersBridge } from './pages/MockServersBridge'
import { ProjectDashboardBridge } from './pages/ProjectDashboardBridge'
import { MocksListBridge } from './pages/MocksListBridge'
import { MockEditorBridge } from './pages/MockEditorBridge'
import { RecordingBridge } from './pages/RecordingBridge'
import { LogsPage } from './pages/LogsPage'
import { DatabasesPage } from '@stubrix/db-ui'

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
