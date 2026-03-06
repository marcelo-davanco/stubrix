import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProjectsPage } from './pages/ProjectsPage'
import { DashboardPage } from './pages/DashboardPage'
import { MocksPage } from './pages/MocksPage'
import { MockEditorPage } from './pages/MockEditorPage'
import { RecordingPage } from './pages/RecordingPage'
import { LogsPage } from './pages/LogsPage'
import { DatabasesPage } from '@stubrix/db-ui'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<DashboardPage />} />
          <Route path="projects/:projectId/mocks" element={<MocksPage />} />
          <Route path="projects/:projectId/mocks/new" element={<MockEditorPage />} />
          <Route path="projects/:projectId/mocks/:mockId/edit" element={<MockEditorPage />} />
          <Route path="projects/:projectId/recording" element={<RecordingPage />} />
          <Route path="databases" element={<DatabasesPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
