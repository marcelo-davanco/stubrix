import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { I18nProvider, useTranslation } from './lib/i18n'
import { Layout } from './components/Layout'
import { ProjectsPage } from './pages/ProjectsPage'
import { DashboardPage } from './pages/DashboardPage'
import { MocksPage } from './pages/MocksPage'
import { MockEditorPage } from './pages/MockEditorPage'
import { RecordingPage } from './pages/RecordingPage'
import { LogsPage } from './pages/LogsPage'
import { SettingsPage } from './pages/SettingsPage'
import { DatabasesPage, DbUiI18nProvider } from '@stubrix/db-ui'

function DatabasesRoute() {
  const { t } = useTranslation()
  return (
    <DbUiI18nProvider t={t}>
      <DatabasesPage />
    </DbUiI18nProvider>
  )
}

function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<DashboardPage />} />
            <Route path="projects/:projectId/mocks" element={<MocksPage />} />
            <Route path="projects/:projectId/mocks/new" element={<MockEditorPage />} />
            <Route path="projects/:projectId/mocks/:mockId/edit" element={<MockEditorPage />} />
            <Route path="projects/:projectId/recording" element={<RecordingPage />} />
            <Route path="databases" element={<DatabasesRoute />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

export default App
