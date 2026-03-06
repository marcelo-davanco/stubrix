import { useMemo } from 'react'
import { RefreshCcw, ChevronDown, AlertCircle, Loader2 } from 'lucide-react'
import { useDbManager } from '../hooks/useDbManager'
import { EngineSelector } from '../components/EngineSelector'
import { DatabaseList } from '../components/DatabaseList'
import { DatabaseInfo } from '../components/DatabaseInfo'
import { ProjectDatabaseConfigs } from '../components/ProjectDatabaseConfigs'
import { SnapshotForm } from '../components/SnapshotForm'
import { SnapshotList } from '../components/SnapshotList'

export function DatabasesPage() {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    engines: allEngines,
    activeEngines,
    selectedEngine,
    setSelectedEngine,
    databases,
    preferredProjectConfig,
    projectDatabaseConfigs,
    databaseInfo,
    snapshots,
    loading,
    error,
    refreshAll,
    getDatabaseInfo,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    saveProjectDatabaseConfig,
    deleteProjectDatabaseConfig,
  } = useDbManager()

  const selectedDatabase = useMemo(
    () =>
      databaseInfo?.database ??
      preferredProjectConfig?.database ??
      preferredProjectConfig?.filePath ??
      '',
    [databaseInfo, preferredProjectConfig],
  )

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Databases</h1>
          <p className="text-xs text-text-secondary">Gerencie engines, conexões e snapshots</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Project picker */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-3 pr-8 text-sm text-text-primary outline-none focus:border-primary/50 transition-colors"
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
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-50"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCcw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Engine selector */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary/60">
              Engines
            </p>
            <EngineSelector
              engines={activeEngines}
              allEngines={allEngines}
              selectedEngine={selectedEngine}
              onSelect={setSelectedEngine}
            />
          </section>

          {/* Main grid */}
          <div className="grid gap-5 grid-cols-[1fr_400px]">

            {/* Left column: snapshots */}
            <div className="space-y-5">
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary/60">
                  Snapshots — {selectedProject?.name ?? selectedProjectId}
                </p>
                <SnapshotForm databases={databases} onSubmit={createSnapshot} />
              </section>
              <SnapshotList
                snapshots={snapshots}
                onDelete={deleteSnapshot}
                onRestore={(name) => restoreSnapshot(name, selectedDatabase || databases[0] || 'default')}
                onUpdate={() => void refreshAll()}
              />
            </div>

            {/* Right column: connections + databases + info */}
            <div className="space-y-5">
              <ProjectDatabaseConfigs
                projectId={selectedProjectId}
                configs={projectDatabaseConfigs}
                onSave={saveProjectDatabaseConfig}
                onDelete={deleteProjectDatabaseConfig}
              />
              <DatabaseList
                databases={databases}
                selectedDatabase={selectedDatabase}
                onInspect={(name) => void getDatabaseInfo(name)}
              />
              {databaseInfo && <DatabaseInfo info={databaseInfo} />}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
