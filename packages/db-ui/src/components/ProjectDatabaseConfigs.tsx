import { useState } from 'react'
import { Plus, Pencil, Trash2, Wifi, WifiOff, Loader2, X, Check, ServerCrash, ChevronDown, ChevronUp } from 'lucide-react'
import type {
  ProjectDatabaseConfigItem,
  UpsertProjectDatabaseConfigPayload,
} from '../lib/db-api'
import { dbApi } from '../lib/db-api'

type ConfigFormState = UpsertProjectDatabaseConfigPayload & { id?: string }
type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

type ProjectDatabaseConfigsProps = {
  projectId: string
  configs: Array<ProjectDatabaseConfigItem>
  onSave: (payload: UpsertProjectDatabaseConfigPayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const EMPTY_FORM: ConfigFormState = {
  engine: 'postgres',
  name: '',
  database: '',
  host: '',
  port: '',
  username: '',
  password: '',
  filePath: '',
  notes: '',
}

const ENGINE_DEFAULTS: Record<string, Partial<ConfigFormState>> = {
  postgres: { host: 'localhost', port: '5432' },
  mysql: { host: 'localhost', port: '3306' },
  sqlite: { host: '', port: '' },
}

const ENGINE_STYLE: Record<string, { badge: string; icon: string }> = {
  postgres: { badge: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30', icon: '🐘' },
  mysql: { badge: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30', icon: '🐬' },
  sqlite: { badge: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30', icon: '📁' },
}

const INPUT_CLASS = 'w-full rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-sm text-text-primary placeholder-white/20 outline-none focus:border-primary/60 focus:bg-white/[0.06] transition-all'
const LABEL_CLASS = 'mb-1.5 block text-xs font-medium text-text-secondary'

function ConfigForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ConfigFormState
  onSave: (payload: UpsertProjectDatabaseConfigPayload) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<ConfigFormState>(initial)
  const [submitting, setSubmitting] = useState(false)
  const isSqlite = form.engine === 'sqlite'

  function set(patch: Partial<ConfigFormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleEngineChange(engine: ConfigFormState['engine']) {
    set({ engine, ...ENGINE_DEFAULTS[engine] })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      await onSave({
        engine: form.engine,
        name: form.name.trim(),
        database: form.database || undefined,
        host: form.host || undefined,
        port: form.port || undefined,
        username: form.username || undefined,
        password: form.password || undefined,
        filePath: form.filePath || undefined,
        notes: form.notes || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Engine</label>
          <select
            value={form.engine}
            onChange={(e) => handleEngineChange(e.target.value as ConfigFormState['engine'])}
            className={INPUT_CLASS}
          >
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Nome da conexão *</label>
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="ex: production-db"
            required
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {isSqlite ? (
        <div>
          <label className={LABEL_CLASS}>Caminho do arquivo (.db)</label>
          <input
            value={form.filePath}
            onChange={(e) => set({ filePath: e.target.value })}
            placeholder="/data/app.db"
            className={INPUT_CLASS}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className={LABEL_CLASS}>Host</label>
              <input
                value={form.host}
                onChange={(e) => set({ host: e.target.value })}
                placeholder="localhost"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Porta</label>
              <input
                value={form.port}
                onChange={(e) => set({ port: e.target.value })}
                placeholder={form.engine === 'postgres' ? '5432' : '3306'}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={LABEL_CLASS}>Database</label>
              <input
                value={form.database}
                onChange={(e) => set({ database: e.target.value })}
                placeholder="mydb"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Usuário</label>
              <input
                value={form.username}
                onChange={(e) => set({ username: e.target.value })}
                placeholder="postgres"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Senha</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                placeholder="••••••••"
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className={LABEL_CLASS}>Notas (opcional)</label>
        <input
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Conexão de produção, read-only..."
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !form.name.trim()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm text-text-secondary hover:bg-white/5"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </form>
  )
}

function ConfigCard({
  config,
  projectId,
  onEdit,
  onDelete,
}: {
  config: ProjectDatabaseConfigItem
  projectId: string
  onEdit: () => void
  onDelete: () => void
}) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [expanded, setExpanded] = useState(false)

  async function handleTest() {
    setTestStatus('testing')
    setTestMessage('')
    try {
      const result = await dbApi.testProjectDatabaseConfig(projectId, config.id)
      setTestStatus(result.ok ? 'ok' : 'error')
      setTestMessage(result.message)
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const isSqlite = config.engine === 'sqlite'
  const style = ENGINE_STYLE[config.engine] ?? ENGINE_STYLE.sqlite
  const connStr = isSqlite
    ? (config.filePath || 'Sem arquivo definido')
    : config.host ? `${config.host}:${config.port || '?'}` : 'Sem host'

  return (
    <div className={`overflow-hidden rounded-2xl border transition-all duration-200 ${expanded ? 'border-white/15 bg-white/[0.05]' : 'border-white/8 bg-white/[0.03] hover:border-white/12'
      }`}>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
          {style.icon} {config.engine}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight text-text-primary">{config.name}</p>
          <p className="truncate font-mono text-xs text-text-secondary">{connStr}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {testStatus === 'ok' && (
            <span className="mr-1 flex items-center gap-0.5 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
              <Wifi size={9} /> OK
            </span>
          )}
          {testStatus === 'error' && (
            <span className="mr-1 flex items-center gap-0.5 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              <ServerCrash size={9} /> Erro
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testStatus === 'testing'}
            title="Testar conexão"
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/8 hover:text-primary disabled:opacity-40"
          >
            {testStatus === 'testing' ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
          </button>
          <button type="button" onClick={onEdit} title="Editar"
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/8 hover:text-text-primary">
            <Pencil size={13} />
          </button>
          <button type="button" onClick={onDelete} title="Remover"
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-red-500/15 hover:text-red-400">
            <Trash2 size={13} />
          </button>
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/8">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/8 bg-white/[0.02] px-4 py-3">
          <div className="grid gap-x-6 gap-y-2 text-xs md:grid-cols-2">
            {!isSqlite ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Host</span>
                  <span className="font-mono text-text-primary">{config.host || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Porta</span>
                  <span className="font-mono text-text-primary">{config.port || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Usuário</span>
                  <span className="font-mono text-text-primary">{config.username || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Database</span>
                  <span className="font-mono text-text-primary">{config.database || '—'}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between md:col-span-2">
                <span className="text-text-secondary">Arquivo</span>
                <span className="font-mono text-text-primary">{config.filePath || '—'}</span>
              </div>
            )}
            {config.notes && (
              <div className="flex items-center justify-between md:col-span-2">
                <span className="text-text-secondary">Notas</span>
                <span className="text-text-primary">{config.notes}</span>
              </div>
            )}
            <div className="flex items-center justify-between md:col-span-2 pt-1 border-t border-white/5">
              <span className="text-text-secondary">Atualizado</span>
              <span className="text-white/40">{new Date(config.updatedAt).toLocaleString('pt-BR')}</span>
            </div>
          </div>
          {testStatus === 'error' && testMessage && (
            <p className="mt-2 text-xs text-red-400">{testMessage}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ProjectDatabaseConfigs({
  projectId,
  configs,
  onSave,
  onDelete,
}: ProjectDatabaseConfigsProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ProjectDatabaseConfigItem | null>(null)

  function handleEdit(config: ProjectDatabaseConfigItem) {
    setEditingConfig(config)
    setShowForm(true)
  }

  async function handleSave(payload: UpsertProjectDatabaseConfigPayload) {
    await onSave(payload)
    setShowForm(false)
    setEditingConfig(null)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingConfig(null)
  }

  const formInitial: ConfigFormState = editingConfig
    ? {
      engine: editingConfig.engine,
      name: editingConfig.name,
      database: editingConfig.database ?? '',
      host: editingConfig.host ?? '',
      port: editingConfig.port ?? '',
      username: editingConfig.username ?? '',
      password: '',
      filePath: editingConfig.filePath ?? '',
      notes: editingConfig.notes ?? '',
    }
    : EMPTY_FORM

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Conexões do projeto</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Acesso e conectividade por projeto</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setEditingConfig(null); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-xl bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/30"
          >
            <Plus size={13} /> Nova conexão
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04]">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="text-sm font-semibold text-text-primary">
              {editingConfig ? `Editar — ${editingConfig.name}` : 'Nova conexão'}
            </p>
            <button type="button" onClick={handleCancel} className="rounded-lg p-1 text-text-secondary hover:bg-white/8">
              <X size={14} />
            </button>
          </div>
          <div className="p-4">
            <ConfigForm initial={formInitial} onSave={handleSave} onCancel={handleCancel} />
          </div>
        </div>
      )}

      {configs.length === 0 && !showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-8 text-center transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl">🔌</div>
          <div>
            <p className="text-sm font-medium text-text-primary">Nenhuma conexão configurada</p>
            <p className="text-xs text-text-secondary">Clique para adicionar a primeira</p>
          </div>
        </button>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              projectId={projectId}
              onEdit={() => handleEdit(config)}
              onDelete={() => void onDelete(config.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
