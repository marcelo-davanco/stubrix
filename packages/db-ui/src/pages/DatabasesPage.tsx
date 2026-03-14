import { useCallback, useState } from 'react'
import { RefreshCcw, ChevronDown, Loader2 } from 'lucide-react'
import { useDbManager } from '../hooks/useDbManager'
import { useDbUiTranslation } from '../lib/i18n'
import { EngineSelector } from '../components/EngineSelector'
import { DatabaseList } from '../components/DatabaseList'
import { DatabaseDetailModal } from '../components/DatabaseDetailModal'
import { ProjectDatabaseConfigs } from '../components/ProjectDatabaseConfigs'
import { SnapshotForm } from '../components/SnapshotForm'
import { SnapshotList } from '../components/SnapshotList'
import { ToastProvider, useToast } from '../components/ToastProvider'
import { InlineAlert } from '../components/InlineAlert'
import { dbApi } from '../lib/db-api'

export function DatabasesPage() {
  return (
    <ToastProvider>
      <DatabasesPageInner />
    </ToastProvider>
  )
}

function DatabasesPageInner() {
  const t = useDbUiTranslation()
  const { toast } = useToast()
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    engines: allEngines,
    activeEngines,
    selectedEngine,
    setSelectedEngine,
    databases,
    loadingDatabases,
    projectDatabaseConfigs,
    selectedConnectionId,
    selectConnection,
    snapshots,
    loading,
    error,
    refreshAll,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    saveProjectDatabaseConfig,
    deleteProjectDatabaseConfig,
  } = useDbManager()

  const [inspectingDb, setInspectingDb] = useState<string | null>(null)

  const handleLoadDbInfo = useCallback(async (name: string) => {
    if (!selectedEngine) return null
    const info = await dbApi.getDatabaseInfo(
      name,
      selectedEngine,
      selectedProjectId,
      selectedConnectionId || undefined,
    )
    return info
  }, [selectedEngine, selectedProjectId, selectedConnectionId])

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  async function handleCreateSnapshot(payload: Parameters<typeof createSnapshot>[0]) {
    try {
      await createSnapshot(payload)
      toast({ type: 'success', title: t('db.toastSnapshotCreated'), description: t('db.toastSnapshotCreatedDesc').replace('{{label}}', payload.label) })
    } catch (err) {
      toast({ type: 'error', title: t('db.toastSnapshotCreateError'), description: err instanceof Error ? err.message : t('db.unknownError') })
      throw err
    }
  }

  const selectedConnection = projectDatabaseConfigs.find((c) => c.id === selectedConnectionId) ?? null
  const restoreTargetDatabase = selectedConnection?.database || databases[0] || ''

  async function handleRestoreSnapshot(name: string) {
    try {
      await restoreSnapshot(name, restoreTargetDatabase || 'default', { connectionId: selectedConnectionId || undefined })
      toast({ type: 'success', title: t('db.toastSnapshotRestored'), description: t('db.toastSnapshotRestoredDesc').replace('{{name}}', name) })
    } catch (err) {
      toast({ type: 'error', title: t('db.toastSnapshotRestoreError'), description: err instanceof Error ? err.message : t('db.unknownError') })
    }
  }

  async function handleDeleteSnapshot(name: string) {
    try {
      await deleteSnapshot(name)
      toast({ type: 'info', title: t('db.toastSnapshotDeleted'), description: t('db.toastSnapshotDeletedDesc').replace('{{name}}', name) })
    } catch (err) {
      toast({ type: 'error', title: t('db.toastSnapshotDeleteError'), description: err instanceof Error ? err.message : t('db.unknownError') })
    }
  }

  return (
    <div className="flex h-full flex-col" data-component="databases-page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 bg-surface-1/50 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{t('db.title')}</h1>
          <p className="text-xs text-text-secondary">{t('db.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Project picker */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-lg border border-white/10 bg-main-bg py-1.5 pl-3 pr-8 text-sm text-text-primary outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-main-bg px-3 py-1.5 text-sm text-text-secondary transition-all hover:bg-surface-2 hover:text-text-primary focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCcw size={14} />}
            {t('db.refresh')}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">

          {/* Error */}
          {error && (
            <InlineAlert
              message={t('db.syncError').replace('{{error}}', error)}
              onRetry={() => void refreshAll()}
            />
          )}

          {/* Engine selector */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary/60">
              {t('db.sectionEngines')}
            </p>
            <EngineSelector
              engines={activeEngines}
              allEngines={allEngines}
              selectedEngine={selectedEngine}
              onSelect={setSelectedEngine}
            />
          </section>

          {/* Main grid */}
          <div className="grid grid-cols-[1fr_630px] gap-x-5 gap-y-4">

            {/* Row 1: section titles */}
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary/60">
              {t('db.sectionSnapshots').replace('{{name}}', selectedProject?.name ?? selectedProjectId)}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary/60">
              {t('db.sectionConnections')}
            </p>

            {/* Row 2: top cards — same height via stretch */}
            <div className="flex flex-col">
              <SnapshotForm
                databases={databases}
                loadingDatabases={loadingDatabases}
                connections={projectDatabaseConfigs}
                onSubmit={handleCreateSnapshot}
                onConnectionChange={selectConnection}
              />
            </div>
            <div className="flex flex-col">
              <ProjectDatabaseConfigs
                projectId={selectedProjectId}
                configs={projectDatabaseConfigs}
                onSave={saveProjectDatabaseConfig}
                onDelete={deleteProjectDatabaseConfig}
                onRefresh={() => void refreshAll()}
              />
            </div>

            {/* Row 3+: remaining content */}
            <SnapshotList
              snapshots={snapshots}
              targetDatabase={restoreTargetDatabase}
              onDelete={handleDeleteSnapshot}
              onRestore={handleRestoreSnapshot}
              onUpdate={() => void refreshAll()}
            />
            <div className="space-y-5">
              <DatabaseList
                databases={databases}
                onInspect={(name) => setInspectingDb(name)}
              />
            </div>
          </div>

        </div>
      </div>

      <DatabaseDetailModal
        databaseName={inspectingDb}
        onClose={() => setInspectingDb(null)}
        onLoadInfo={handleLoadDbInfo}
      />
    </div>
  )
}

