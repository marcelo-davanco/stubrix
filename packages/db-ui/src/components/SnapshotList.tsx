import { useState, useMemo } from 'react'
import { RotateCcw, Trash2, Loader2, Camera, Star, Lock, Tag, Filter, AlertTriangle, X } from 'lucide-react'
import { useDbUiTranslation } from '../lib/i18n'
import { EmptyState } from './EmptyState'
import type { Snapshot } from '@stubrix/shared'
import { dbApi } from '../lib/db-api'

type SnapshotListProps = {
  snapshots: Array<Snapshot>
  targetDatabase?: string
  onDelete: (name: string) => Promise<void>
  onRestore: (name: string) => Promise<void>
  onUpdate?: () => void
}

type RestoreConfirm = {
  snapshot: Snapshot
  targetDatabase: string
}

function RestoreConfirmDialog({
  confirm,
  onConfirm,
  onCancel,
  restoring,
}: {
  confirm: RestoreConfirm
  onConfirm: () => void
  onCancel: () => void
  restoring: boolean
}) {
  const { snapshot } = confirm
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-1 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Confirmar Restauração</h3>
              <p className="text-xs text-text-secondary">Esta ação sobrescreverá o database de destino</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={restoring}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary disabled:opacity-40"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mb-5 space-y-2.5 rounded-xl border border-white/8 bg-main-bg p-4">
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-text-secondary/70">Snapshot</span>
            <span className="truncate text-right font-medium text-text-primary">{snapshot.name}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-text-secondary/70">Database destino</span>
            <span className="font-mono font-medium text-text-primary">{confirm.targetDatabase || '—'}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-text-secondary/70">Engine</span>
            <span className="font-medium capitalize text-text-primary">{snapshot.engine ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-text-secondary/70">Tamanho</span>
            <span className="font-medium text-text-primary">{snapshot.sizeFormatted}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-text-secondary/70">Criado em</span>
            <span className="font-medium text-text-primary">{new Date(snapshot.createdAt).toLocaleString('pt-BR')}</span>
          </div>
          {snapshot.protected && (
            <div className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
              <Lock size={11} />
              Snapshot protegido — a restauração é permitida
            </div>
          )}
        </div>

        <p className="mb-5 text-xs text-text-secondary/80">
          O conteúdo atual do database de destino será <strong className="text-warning">permanentemente substituído</strong> pelos dados deste snapshot. Esta ação não pode ser desfeita.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={restoring}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-text-secondary transition-all hover:bg-surface-2 hover:text-text-primary disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={restoring}
            className="flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-warning/50 disabled:opacity-50"
          >
            {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {restoring ? 'Restaurando...' : 'Confirmar Restauração'}
          </button>
        </div>
      </div>
    </div>
  )
}

type FilterMode = 'all' | 'favorites' | 'protected'

export function SnapshotList({ snapshots, targetDatabase = '', onDelete, onRestore, onUpdate }: SnapshotListProps) {
  const t = useDbUiTranslation()
  const [pending, setPending] = useState<Record<string, 'restoring' | 'deleting'>>({})
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [restoreConfirm, setRestoreConfirm] = useState<RestoreConfirm | null>(null)

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

  async function confirmRestore() {
    if (!restoreConfirm) return
    const name = restoreConfirm.snapshot.name
    setPending((p) => ({ ...p, [name]: 'restoring' }))
    try {
      await onRestore(name)
      setRestoreConfirm(null)
    } finally {
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
    <>
    <div className="rounded-2xl border border-white/10 bg-surface-1 p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">{t('db.snapshots')}</h2>
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
                  <option value="">{t('db.filterCategory')}</option>
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
                  title={mode === 'all' ? t('db.filterAll') : mode === 'favorites' ? t('db.filterFavorites') : t('db.filterProtected')}
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
                {t('db.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {snapshots.length === 0 ? (
        <EmptyState
          icon={<Camera size={22} strokeWidth={1.5} />}
          title={t('db.noSnapshotsTitle')}
          description={t('db.noSnapshotsDesc')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Filter size={22} strokeWidth={1.5} />}
          title={t('db.noResultsTitle')}
          description={t('db.noResultsDesc')}
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
                    title={snapshot.favorite ? t('db.removeFavorite') : t('db.addFavorite')}
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
                        <Lock size={9} /> {t('db.protected')}
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
                    title={snapshot.protected ? t('db.unprotectSnapshot') : t('db.protectSnapshot')}
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
                    onClick={() => setRestoreConfirm({ snapshot, targetDatabase })}
                    title={snapshot.protected ? t('db.restoreSnapshotProtected') : t('db.restoreSnapshot')}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/25 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {state === 'restoring' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    {state === 'restoring' ? t('db.restoring') : t('db.restore')}
                  </button>
                  <button
                    type="button"
                    disabled={!!state || snapshot.protected}
                    onClick={() => void handleDelete(snapshot.name)}
                    title={snapshot.protected ? t('db.deleteSnapshotProtected') : t('db.deleteSnapshot')}
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

    {restoreConfirm && (
      <RestoreConfirmDialog
        confirm={restoreConfirm}
        restoring={!!pending[restoreConfirm.snapshot.name]}
        onConfirm={() => void confirmRestore()}
        onCancel={() => setRestoreConfirm(null)}
      />
    )}
    </>
  )
}
