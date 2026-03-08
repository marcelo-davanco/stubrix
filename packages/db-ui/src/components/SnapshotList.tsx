import { useState, useMemo } from 'react'
import { RotateCcw, Trash2, Loader2, Camera, Star, Lock, Tag, Filter } from 'lucide-react'
import { EmptyState } from './EmptyState'
import type { Snapshot } from '@stubrix/shared'
import { dbApi } from '../lib/db-api'

type SnapshotListProps = {
  snapshots: Array<Snapshot>
  onDelete: (name: string) => Promise<void>
  onRestore: (name: string) => Promise<void>
  onUpdate?: () => void
}

type FilterMode = 'all' | 'favorites' | 'protected'

export function SnapshotList({ snapshots, onDelete, onRestore, onUpdate }: SnapshotListProps) {
  const [pending, setPending] = useState<Record<string, 'restoring' | 'deleting'>>({})
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterCategory, setFilterCategory] = useState('')

  const categories = useMemo(() => {
    const cats = snapshots.map((s) => s.category).filter((c): c is string => !!c)
    return Array.from(new Set(cats)).sort()
  }, [snapshots])

  const filtered = useMemo(() => {
    return snapshots.filter((s) => {
      if (filterMode === 'favorites' && !s.favorite) return false
      if (filterMode === 'protected' && !s.protected) return false
      if (filterCategory && s.category !== filterCategory) return false
      return true
    })
  }, [snapshots, filterMode, filterCategory])

  async function handleRestore(name: string) {
    setPending((p) => ({ ...p, [name]: 'restoring' }))
    try { await onRestore(name) } finally {
      setPending((p) => { const n = { ...p }; delete n[name]; return n })
    }
  }

  async function handleDelete(name: string) {
    setPending((p) => ({ ...p, [name]: 'deleting' }))
    try { await onDelete(name) } finally {
      setPending((p) => { const n = { ...p }; delete n[name]; return n })
    }
  }

  async function handleToggle(snapshot: Snapshot, field: 'favorite' | 'protected') {
    setToggling((t) => ({ ...t, [`${snapshot.name}-${field}`]: true }))
    try {
      await dbApi.updateSnapshot(snapshot.name, { [field]: !snapshot[field] })
      onUpdate?.()
    } finally {
      setToggling((t) => { const n = { ...t }; delete n[`${snapshot.name}-${field}`]; return n })
    }
  }

  const hasFilters = filterMode !== 'all' || !!filterCategory

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-1 p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Snapshots</h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-secondary">
            {filtered.length}{filtered.length !== snapshots.length ? `/${snapshots.length}` : ''}
          </span>
        </div>

        {/* Filter toolbar */}
        {snapshots.length > 0 && (
          <div className="flex items-center gap-1.5">
            {categories.length > 0 && (
              <div className="relative flex items-center">
                <Tag size={11} className="pointer-events-none absolute left-2.5 text-text-secondary" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-lg border border-white/10 bg-main-bg py-1 pl-7 pr-6 text-xs text-text-secondary outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">Categoria</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="flex rounded-lg border border-white/10 bg-main-bg p-0.5">
              {(['all', 'favorites', 'protected'] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  title={mode === 'all' ? 'Todos' : mode === 'favorites' ? 'Favoritos' : 'Protegidos'}
                  className={`rounded-md p-1.5 transition-colors ${filterMode === mode ? 'bg-surface-2 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  {mode === 'all' && <Filter size={12} />}
                  {mode === 'favorites' && <Star size={12} />}
                  {mode === 'protected' && <Lock size={12} />}
                </button>
              ))}
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setFilterMode('all'); setFilterCategory('') }}
                className="text-xs text-text-secondary hover:text-primary"
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {snapshots.length === 0 ? (
        <EmptyState
          icon={<Camera size={22} strokeWidth={1.5} />}
          title="Nenhum snapshot criado"
          description="Crie um snapshot para salvar o estado atual do database e restaurá-lo quando necessário."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Filter size={22} strokeWidth={1.5} />}
          title="Nenhum resultado"
          description="Nenhum snapshot corresponde ao filtro selecionado."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((snapshot) => {
            const state = pending[snapshot.name]
            const favKey = `${snapshot.name}-favorite`
            const lockKey = `${snapshot.name}-protected`

            return (
              <div
                key={snapshot.name}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${snapshot.protected
                    ? 'border-warning/20 bg-warning/[0.04]'
                    : 'border-white/8 bg-main-bg hover:border-white/15 hover:bg-surface-2'
                  }`}
              >
                {/* Favorite star */}
                <button
                  type="button"
                  disabled={toggling[favKey]}
                  onClick={() => void handleToggle(snapshot, 'favorite')}
                  title={snapshot.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  className={`flex shrink-0 items-center justify-center rounded-lg p-1 transition-colors ${snapshot.favorite ? 'text-warning' : 'text-white/20 hover:text-warning/60'
                    } disabled:opacity-40`}
                >
                  {toggling[favKey]
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Star size={13} fill={snapshot.favorite ? 'currentColor' : 'none'} />}
                </button>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="truncate text-sm font-medium text-text-primary">{snapshot.name}</p>
                    {snapshot.protected && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                        <Lock size={9} /> Protegido
                      </span>
                    )}
                    {snapshot.category && (
                      <span className="shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] text-text-secondary">
                        {snapshot.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    <span className="capitalize">{snapshot.engine ?? '—'}</span>
                    {' · '}{snapshot.sizeFormatted}
                    {' · '}{new Date(snapshot.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={toggling[lockKey]}
                    onClick={() => void handleToggle(snapshot, 'protected')}
                    title={snapshot.protected ? 'Desproteger snapshot' : 'Proteger snapshot'}
                    className={`flex items-center justify-center rounded-lg p-1.5 transition-colors ${snapshot.protected
                        ? 'text-warning hover:bg-warning/15'
                        : 'text-white/20 hover:bg-white/8 hover:text-text-secondary'
                      } disabled:opacity-40`}
                  >
                    {toggling[lockKey]
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Lock size={13} fill={snapshot.protected ? 'currentColor' : 'none'} />}
                  </button>
                  <button
                    type="button"
                    disabled={!!state || snapshot.protected}
                    onClick={() => void handleRestore(snapshot.name)}
                    title={snapshot.protected ? 'Snapshot protegido — remova a proteção para restaurar' : 'Restaurar snapshot'}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/25 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {state === 'restoring' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    {state === 'restoring' ? 'Restaurando...' : 'Restaurar'}
                  </button>
                  <button
                    type="button"
                    disabled={!!state || snapshot.protected}
                    onClick={() => void handleDelete(snapshot.name)}
                    title={snapshot.protected ? 'Snapshot protegido — não pode ser deletado' : 'Deletar snapshot'}
                    className="flex items-center justify-center rounded-lg p-1.5 text-white/20 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {state === 'deleting' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
