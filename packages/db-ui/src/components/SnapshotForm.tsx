import { useEffect, useState } from 'react'
import { Camera, Loader2, ChevronDown } from 'lucide-react'
import type { ProjectDatabaseConfigItem } from '../lib/db-api'

type SnapshotFormProps = {
  databases: Array<string>
  loadingDatabases?: boolean
  connections: Array<ProjectDatabaseConfigItem>
  onSubmit: (payload: { label: string; database: string; category?: null | string; connectionId?: string }) => Promise<void>
  onConnectionChange?: (connectionId: string) => void
}

const INPUT_CLASS = 'w-full rounded-lg border border-white/10 bg-main-bg px-3.5 py-2.5 text-sm text-text-primary placeholder-white/20 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40'

const ENGINE_LABEL: Record<string, string> = {
  postgres: '🐘 Postgres',
  mysql: '🐬 MySQL',
  sqlite: '📁 SQLite',
}

const STATUS_DOT: Record<string, string> = {
  ok: 'bg-green-400 shadow-[0_0_4px_theme(colors.green.400)]',
  error: 'bg-red-400',
  unknown: 'bg-white/20',
}

export function SnapshotForm({ databases, loadingDatabases = false, connections, onSubmit, onConnectionChange }: SnapshotFormProps) {
  const [label, setLabel] = useState('snapshot')
  const [database, setDatabase] = useState('')
  const [category, setCategory] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const enabledConnections = connections.filter((c) => c.enabled)

  useEffect(() => {
    if (enabledConnections.length > 0 && !connectionId) {
      const first = enabledConnections[0]
      setConnectionId(first.id)
      onConnectionChange?.(first.id)
      if (first.database) setDatabase(first.database)
    }
    if (connectionId && !enabledConnections.find((c) => c.id === connectionId)) {
      setConnectionId('')
      setDatabase('')
      onConnectionChange?.('')
    }
  }, [connections])

  useEffect(() => {
    if (loadingDatabases) return
    const conn = connections.find((c) => c.id === connectionId)
    const defaultDb = conn?.database ?? ''
    if (defaultDb && databases.includes(defaultDb)) {
      setDatabase(defaultDb)
    }
  }, [databases, loadingDatabases])

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
  }

  const selectedConn = enabledConnections.find((c) => c.id === connectionId) ?? null

  return (
    <form onSubmit={handleSubmit} className="flex-1 rounded-2xl border border-white/10 bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Camera size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight text-text-primary">Criar Snapshot</h2>
            <p className="text-xs text-text-secondary">Salve o estado atual do database</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !database}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {submitting ? 'Salvando...' : 'Criar Snapshot'}
        </button>
      </div>

      {connections.length > 0 && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Conexão</label>
          <div className="relative">
            <select
              value={connectionId}
              onChange={(e) => handleSelectConnection(e.target.value)}
              className="w-full appearance-none rounded-lg border border-white/10 bg-main-bg py-2.5 pl-3.5 pr-9 text-sm text-text-primary outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              <option value="">— Padrão (engine selecionada) —</option>
              {enabledConnections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {ENGINE_LABEL[conn.engine] ?? conn.engine} · {conn.name}
                  {conn.host ? ` (${conn.host}:${conn.port ?? '?'})` : ''}
                  {conn.database ? ` · ${conn.database}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          </div>
          {selectedConn && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-text-secondary/70">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[selectedConn.connectionStatus]}`} />
              {selectedConn.connectionStatus === 'ok' ? 'Conectado' : selectedConn.connectionStatus === 'error' ? 'Erro de conexão' : 'Status desconhecido'}
              {selectedConn.host && <span className="font-mono opacity-60">{selectedConn.host}:{selectedConn.port ?? '?'}</span>}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="snapshot"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Database *
            {loadingDatabases && <Loader2 size={11} className="ml-1.5 inline animate-spin text-text-secondary/60" />}
          </label>
          <select
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            disabled={loadingDatabases}
            className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <option value="">{loadingDatabases ? 'Carregando...' : 'Selecionar...'}</option>
            {databases.map((db) => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Categoria <span className="font-normal text-white/25">(opcional)</span>
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ex: staging"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {databases.length === 0 && (
        <p className="mt-2 text-xs text-text-secondary/60">Selecione uma engine ou conexão para ver databases disponíveis</p>
      )}
    </form>
  )
}
