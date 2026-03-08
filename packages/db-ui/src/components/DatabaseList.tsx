import { Database, Search, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from './EmptyState'

type DatabaseListProps = {
  databases: Array<string>
  onInspect: (name: string) => void
}

export function DatabaseList({ databases, onInspect }: DatabaseListProps) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? databases.filter((db) => db.toLowerCase().includes(search.toLowerCase()))
    : databases

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-1 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Databases disponíveis</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-secondary">{databases.length}</span>
      </div>

      {databases.length === 0 ? (
        <EmptyState
          icon={<Database size={22} strokeWidth={1.5} />}
          title="Nenhum database disponível"
          description="Selecione uma engine ativa para ver os databases disponíveis."
        />
      ) : (
        <>
          {databases.length > 5 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-main-bg px-3 py-2">
              <Search size={13} className="text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar databases..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary/50 outline-none caret-primary"
              />
            </div>
          )}
          <div className="space-y-1">
            {filtered.map((database) => (
              <button
                key={database}
                type="button"
                onClick={() => onInspect(database)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-text-primary transition-all hover:bg-surface-2"
              >
                <div className="flex items-center gap-2">
                  <Database size={13} className="text-text-secondary" />
                  <span className="font-medium">{database}</span>
                </div>
                <ChevronRight size={13} className="text-text-secondary" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-3 text-center text-sm text-text-secondary">Nenhum resultado para "{search}"</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
