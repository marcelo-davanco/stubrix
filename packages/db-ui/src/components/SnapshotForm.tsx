import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'

type SnapshotFormProps = {
  databases: Array<string>
  onSubmit: (payload: { label: string; database: string; category?: null | string }) => Promise<void>
}

const INPUT_CLASS = 'w-full rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-sm text-text-primary placeholder-white/20 outline-none focus:border-primary/60 focus:bg-white/[0.06] transition-all'

export function SnapshotForm({ databases, onSubmit }: SnapshotFormProps) {
  const [label, setLabel] = useState('snapshot')
  const [database, setDatabase] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!database) return
    setSubmitting(true)
    try {
      await onSubmit({ label, database, category: category || null })
      setLabel('snapshot')
      setCategory('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
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
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {submitting ? 'Salvando...' : 'Criar Snapshot'}
        </button>
      </div>

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
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Database *</label>
          <select
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecionar...</option>
            {databases.map((db) => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Categoria <span className="font-normal text-white/25">(opcional)</span></label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ex: staging"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {databases.length === 0 && (
        <p className="mt-2 text-xs text-text-secondary/60">Selecione uma engine para ver databases disponíveis</p>
      )}
    </form>
  )
}
