import { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { SettingsHeader } from '../components/settings/SettingsHeader'
import { CategorySidebar } from '../components/settings/CategorySidebar'
import type { CategoryInfo } from '../components/settings/CategorySidebar'
import { ServiceGrid } from '../components/settings/ServiceGrid'
import { MasterPasswordBanner } from '../components/settings/MasterPasswordBanner'
import { LogsModal } from '../components/settings/LogsModal'
import { DependencyWarningDialog } from '../components/settings/DependencyWarningDialog'
import { ExportWizard } from '../components/settings/ExportWizard'
import { ImportWizard } from '../components/settings/ImportWizard'

const CATEGORY_LABELS: Record<string, string> = {
  mock_engines: 'Mock Engines',
  databases: 'Databases',
  db_viewers: 'DB Viewers',
  cloud: 'Cloud',
  storage: 'Storage',
  iam: 'IAM',
  observability: 'Observability',
  tracing: 'Tracing',
  events: 'Events',
  protocols: 'Protocols',
  contracts: 'Contracts',
  chaos: 'Chaos',
  ai: 'AI / Intelligence',
  api_clients: 'API Clients',
}

export function SettingsPage() {
  const {
    services,
    cryptoStatus,
    loading,
    error,
    toggleService,
    toggleAutoStart,
    restartService,
    getServiceLogs,
    setupMasterPassword,
    verifyMasterPassword,
    lockSession,
    refetch,
  } = useSettings()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [logsTarget, setLogsTarget] = useState<{ id: string; name: string } | null>(null)
  const [depWarn, setDepWarn] = useState<{ serviceId: string; name: string; dependents: string[] } | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const categories = useMemo<CategoryInfo[]>(() => {
    const map = new Map<string, CategoryInfo>()
    for (const svc of services) {
      const cat = svc.category
      if (!map.has(cat)) {
        map.set(cat, {
          id: cat,
          label: CATEGORY_LABELS[cat] ?? cat,
          count: 0,
          enabledCount: 0,
          healthyCount: 0,
        })
      }
      const entry = map.get(cat)!
      entry.count++
      if (svc.enabled) entry.enabledCount++
      if (svc.healthStatus === 'healthy') entry.healthyCount++
    }
    return Array.from(map.values())
  }, [services])

  const handleToggle = async (serviceId: string, enabled: boolean) => {
    if (!enabled) {
      const svc = services.find((s) => s.serviceId === serviceId)
      // Naively check for dependents — API will return 409 if there are issues
      try {
        await toggleService(serviceId, enabled)
      } catch {
        if (svc) {
          setDepWarn({ serviceId, name: svc.name, dependents: [] })
        }
      }
      return
    }
    await toggleService(serviceId, enabled)
  }

  const handleRestart = async (serviceId: string) => {
    await restartService(serviceId)
  }

  const handleViewLogs = (serviceId: string) => {
    const svc = services.find((s) => s.serviceId === serviceId)
    if (svc) setLogsTarget({ id: svc.serviceId, name: svc.name })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        <div className="text-sm animate-pulse">Loading services…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4 overflow-hidden">
      <SettingsHeader
        onExport={() => setShowExport(true)}
        onImport={() => setShowImport(true)}
      />

      <div className="flex gap-5 flex-1 overflow-hidden">
        <CategorySidebar
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          totalCount={services.length}
        />

        <ServiceGrid
          services={services}
          selectedCategory={selectedCategory}
          onToggle={(id, en) => handleToggle(id, en)}
          onToggleAutoStart={(id, val) => void toggleAutoStart(id, val)}
          onRestart={(id) => void handleRestart(id)}
          onViewLogs={handleViewLogs}
        />
      </div>

      <MasterPasswordBanner
        status={cryptoStatus}
        onSetup={setupMasterPassword}
        onUnlock={async (pw) => verifyMasterPassword(pw)}
        onLock={lockSession}
      />

      {logsTarget && (
        <LogsModal
          serviceId={logsTarget.id}
          serviceName={logsTarget.name}
          open={true}
          onClose={() => setLogsTarget(null)}
          fetchLogs={getServiceLogs}
        />
      )}

      {depWarn && (
        <DependencyWarningDialog
          open={true}
          serviceId={depWarn.serviceId}
          serviceName={depWarn.name}
          dependents={depWarn.dependents}
          onCancel={() => setDepWarn(null)}
          onForceDisable={async () => {
            await toggleService(depWarn.serviceId, false)
            setDepWarn(null)
          }}
        />
      )}

      {showExport && <ExportWizard open onClose={() => setShowExport(false)} />}
      {showImport && <ImportWizard open onClose={() => setShowImport(false)} onComplete={() => void refetch()} />}
    </div>
  )
}
