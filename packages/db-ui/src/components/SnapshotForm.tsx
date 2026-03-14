import { useEffect, useState } from 'react'
import { Camera, Loader2, Link2 } from 'lucide-react'
import { useDbUiTranslation } from '../lib/i18n'
import type { ProjectDatabaseConfigItem } from '../lib/db-api'

type SnapshotFormProps = {
  databases: Array<string>
  connections: Array<ProjectDatabaseConfigItem>
  onSubmit: (payload: { label: string; database: string; category?: null | string; connectionId?: string }) => Promise<void>
  onConnectionChange?: (connectionId: string) => void
}

const INPUT_CLASS = 'w-full rounded-lg border border-white/10 bg-main-bg px-3.5 py-2.5 text-sm text-text-primary placeholder-white/20 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40'

const ENGINE_STYLE: Record<string, { badge: string }> = {
  postgres: { badge: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' },
  mysql: { badge: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30' },
  sqlite: { badge: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30' },
}

function StatusIndicator({ status }: { status: 'unknown' | 'ok' | 'error' }) {
  if (status === 'ok') return <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_4px_theme(colors.green.400)]" />
  if (status === 'error') return <span className="h-2 w-2 rounded-full bg-red-400" />
  return <span className="h-2 w-2 rounded-full bg-white/20" />
}

export function SnapshotForm({ databases, connections, onSubmit, onConnectionChange }: SnapshotFormProps) {
  const t = useDbUiTranslation()
  const [label, setLabel] = useState('snapshot')
  const [database, setDatabase] = useState('')
  const [category, setCategory] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (connections.length > 0 && !connectionId) {
      const first = connections[0]
      setConnectionId(first.id)
      onConnectionChange?.(first.id)
      if (first.database) setDatabase(first.database)
    }
  }, [connections])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!database) return
    setSubmitting(true)
    try {
      await onSubmit({
        label,
        database,
        category: category || null,
        connectionId: connectionId || undefined,
      })
      setLabel('snapshot')
      setDatabase('')
      setCategory('')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSelectConnection(id: string) {
    setConnectionId(id)
    setDatabase('')
    onConnectionChange?.(id)
    if (id) {
      const conn = connections.find((c) => c.id === id)
      if (conn?.database) setDatabase(conn.database)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 rounded-2xl border border-white/10 bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Camera size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight text-text-primary">{t('db.createSnapshot')}</h2>
            <p className="text-xs text-text-secondary">{t('db.createSnapshotDesc')}</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !database}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {submitting ? t('db.saving') : t('db.createSnapshotButton')}
        </button>
      </div>

      {connections.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-main-bg px-3 py-2.5">
          <Link2 size={12} className="shrink-0 text-text-secondary/50" />
          <span className="shrink-0 text-xs text-text-secondary/70">{t('db.connection')}</span>
          <div className="flex flex-1 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => handleSelectConnection('')}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                connectionId === ''
                  ? 'bg-primary/20 font-medium text-primary ring-1 ring-primary/30'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }`}
            >
              {t('db.default')}
            </button>
            {connections.map((conn) => {
              const style = ENGINE_STYLE[conn.engine] ?? ENGINE_STYLE.sqlite
              const isSelected = connectionId === conn.id
              return (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => handleSelectConnection(conn.id)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all ${
                    isSelected
                      ? 'bg-surface-2 font-medium text-text-primary ring-1 ring-white/15'
                      : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                  }`}
                >
                  <StatusIndicator status={conn.connectionStatus} />
                  <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${style.badge}`}>
                    {conn.engine}
                  </span>
                  <span>{conn.name}</span>
                  {conn.host && (
                    <span className="font-mono text-[10px] text-text-secondary/50">
                      {conn.host}:{conn.port ?? '?'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('db.label')}</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('db.labelPlaceholder')}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('db.database')} *</label>
          <select
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">{t('db.selectDatabase')}</option>
            {databases.map((db) => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            {t('db.category')} <span className="font-normal text-white/25">{t('db.optional')}</span>
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t('db.categoryPlaceholder')}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {databases.length === 0 && (
        <p className="mt-2 text-xs text-text-secondary/60">{t('db.selectEngineHint')}</p>
      )}
    </form>
  )
}
