import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react'
import { BackupCard } from '../components/settings/BackupCard'
import type { BackupItem } from '../components/settings/BackupCard'
import { CreateBackupDialog } from '../components/settings/CreateBackupDialog'
import { RestoreBackupDialog } from '../components/settings/RestoreBackupDialog'
import { useSettings } from '../hooks/useSettings'
import type { ServiceOption } from '../components/settings/ServiceSelector'

export function BackupsPage() {
  const navigate = useNavigate()
  const { services } = useSettings()
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const serviceOptions: ServiceOption[] = services.map((s) => ({
    serviceId: s.serviceId,
    name: s.name,
    category: s.category,
  }))

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/backups')
      if (!res.ok) throw new Error('Failed to load backups')
      setBackups((await res.json()) as BackupItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchBackups() }, [fetchBackups])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleDownload = (id: string) => {
    const a = document.createElement('a')
    a.href = `/api/settings/backups/${id}/download`
    a.download = `backup-${id}.json`
    a.click()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this backup? This cannot be undone.')) return
    const res = await fetch(`/api/settings/backups/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Backup deleted.')
      await fetchBackups()
    }
  }

  const handlePreview = (id: string) => {
    setRestoreTarget({ id, name: backups.find((b) => b.id === id)?.name ?? id })
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4 overflow-hidden">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to Settings
        </button>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Configuration Backups</h1>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-primary/80 hover:bg-primary font-medium transition-colors"
          >
            <Plus size={14} />
            Create Backup
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading && (
          <div className="text-sm text-text-secondary animate-pulse text-center py-8">Loading backups…</div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-text-secondary">{error}</p>
            <button
              type="button"
              onClick={() => void fetchBackups()}
              className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && backups.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <p className="text-sm">No backups yet.</p>
            <p className="text-xs mt-1">Create your first backup to protect your configuration.</p>
          </div>
        )}

        {backups.map((backup) => (
          <BackupCard
            key={backup.id}
            backup={backup}
            onPreview={handlePreview}
            onRestore={(id) => setRestoreTarget({ id, name: backup.name })}
            onDownload={handleDownload}
            onDelete={(id) => void handleDelete(id)}
          />
        ))}

        {!loading && !error && backups.length > 0 && (
          <p className="text-xs text-text-secondary text-center py-2">
            Showing {backups.length} backup{backups.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Dialogs */}
      <CreateBackupDialog
        open={showCreate}
        services={serviceOptions}
        onClose={() => setShowCreate(false)}
        onComplete={() => {
          setShowCreate(false)
          showToast('Backup created successfully.')
          void fetchBackups()
        }}
      />

      {restoreTarget && (
        <RestoreBackupDialog
          backupId={restoreTarget.id}
          backupName={restoreTarget.name}
          open={true}
          onClose={() => setRestoreTarget(null)}
          onComplete={() => {
            setRestoreTarget(null)
            showToast('Restore completed.')
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-green-600 text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
