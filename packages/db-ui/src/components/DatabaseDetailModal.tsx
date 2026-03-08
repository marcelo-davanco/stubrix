import { useEffect, useCallback, useState } from 'react'
import { X, HardDrive, Table2, Database, Loader2, Search } from 'lucide-react'
import type { DatabaseInfo } from '@stubrix/shared'

type DatabaseDetailModalProps = {
  databaseName: string | null
  onClose: () => void
  onLoadInfo: (name: string) => Promise<DatabaseInfo | null | undefined>
}

const ENGINE_ICON: Record<string, string> = {
  postgres: '🐘',
  mysql: '🐬',
  sqlite: '📦',
}

export function DatabaseDetailModal({ databaseName, onClose, onLoadInfo }: DatabaseDetailModalProps) {
  const [info, setInfo] = useState<DatabaseInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableSearch, setTableSearch] = useState('')

  const load = useCallback(async (name: string) => {
    setLoading(true)
    setError(null)
    setInfo(null)
    setTableSearch('')
    try {
      const result = await onLoadInfo(name)
      setInfo(result ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar informações')
    } finally {
      setLoading(false)
    }
  }, [onLoadInfo])

  useEffect(() => {
    if (databaseName) {
      void load(databaseName)
    }
  }, [databaseName, load])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (databaseName) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [databaseName, onClose])

  if (!databaseName) return null

  const filteredTables = info?.tables.filter((t) =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase()),
  ) ?? []

  const icon = ENGINE_ICON[info?.engine ?? ''] ?? '🗄️'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-lg">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">{databaseName}</h2>
              {info && (
                <p className="text-xs capitalize text-text-secondary">{info.engine}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {info && (
              <div className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5">
                <HardDrive size={12} className="text-primary" />
                <span className="text-xs font-semibold text-primary">{info.totalSize}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-sm text-text-secondary">Carregando informações...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Database size={24} className="text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => void load(databaseName)}
                className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-3"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {info && !loading && (
            <>
              {/* Stats row */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-main-bg px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-text-primary">{info.tables.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary">Tabelas</p>
                </div>
                <div className="rounded-xl bg-main-bg px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-text-primary">{info.totalSize}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary">Tamanho</p>
                </div>
                <div className="rounded-xl bg-main-bg px-3 py-2.5 text-center">
                  <p className="text-lg font-bold capitalize text-text-primary">{info.engine}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary">Engine</p>
                </div>
              </div>

              {/* Tables */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Table2 size={13} className="text-text-secondary" />
                    <span className="text-xs font-semibold text-text-secondary">
                      Tabelas ({filteredTables.length}{tableSearch ? `/${info.tables.length}` : ''})
                    </span>
                  </div>
                </div>

                {info.tables.length > 8 && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-main-bg px-3 py-2">
                    <Search size={12} className="text-text-secondary" />
                    <input
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Filtrar tabelas..."
                      className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-secondary/50 outline-none caret-primary"
                    />
                  </div>
                )}

                {/* Table header */}
                <div className="mb-1 flex items-center justify-between px-3 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60">Nome</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60">Tamanho</span>
                </div>

                <div className="space-y-0.5">
                  {filteredTables.map((table, i) => (
                    <div
                      key={table.name}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                        i % 2 === 0 ? 'bg-main-bg' : 'bg-transparent'
                      }`}
                    >
                      <span className="font-mono text-xs text-text-primary">{table.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-text-secondary">{table.size}</span>
                    </div>
                  ))}
                  {filteredTables.length === 0 && (
                    <p className="py-4 text-center text-xs text-text-secondary">
                      Nenhuma tabela encontrada{tableSearch ? ` para "${tableSearch}"` : ''}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
