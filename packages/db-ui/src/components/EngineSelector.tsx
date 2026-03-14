import type { Engine } from '@stubrix/shared'
import { Server } from 'lucide-react'
import { EmptyState } from './EmptyState'

type EngineSelectorProps = {
  engines: Array<Engine>
  allEngines: Array<Engine>
  selectedEngine: null | string
  onSelect: (engine: string) => void
}

const ENGINE_ICON: Record<string, string> = {
  postgres: '🐘',
  mysql: '🐬',
  sqlite: '📁',
  mongodb: '🍃',
}

const ENGINE_COLOR: Record<string, { ring: string; bg: string; text: string; glow: string }> = {
  postgres: {
    ring: 'ring-blue-500/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/20',
  },
  mysql: {
    ring: 'ring-orange-500/40',
    bg: 'bg-orange-500/10',
    text: 'text-orange-300',
    glow: 'shadow-orange-500/20',
  },
  sqlite: {
    ring: 'ring-teal-500/40',
    bg: 'bg-teal-500/10',
    text: 'text-teal-300',
    glow: 'shadow-teal-500/20',
  },
  mongodb: {
    ring: 'ring-green-500/40',
    bg: 'bg-green-500/10',
    text: 'text-green-300',
    glow: 'shadow-green-500/20',
  },
}

export function EngineSelector({ allEngines, selectedEngine, onSelect }: EngineSelectorProps) {
  if (allEngines.length === 0) {
    return (
      <EmptyState
        icon={<Server size={24} strokeWidth={1.5} />}
        title="Nenhuma engine configurada"
        description="Configure uma engine de banco de dados para começar a gerenciar suas conexões e snapshots."
      />
    )
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${allEngines.length}, minmax(0, 1fr))` }}>
      {allEngines.map((engine) => {
        const isSelected = selectedEngine === engine.name
        const isActive = engine.status === 'active'
        const color = ENGINE_COLOR[engine.name] ?? ENGINE_COLOR.sqlite
        const icon = ENGINE_ICON[engine.name] ?? '🗄️'

        return (
          <button
            key={engine.name}
            type="button"
            disabled={!isActive}
            onClick={() => isActive && onSelect(engine.name)}
            className={[
              'group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200',
              isSelected && isActive
                ? `ring-1 ${color.ring} border-transparent ${color.bg} shadow-lg ${color.glow}`
                : isActive
                  ? 'border-white/8 bg-surface-1 hover:border-white/15 hover:bg-surface-2'
                  : 'cursor-not-allowed border-white/5 bg-main-bg opacity-40',
            ].join(' ')}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${isSelected ? color.bg : 'bg-main-bg'}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold capitalize ${isSelected ? color.text : 'text-text-primary'}`}>
                {engine.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-white/20'}`} />
                <span className="text-xs text-text-secondary">
                  {isActive ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            {isSelected && isActive && (
              <div className={`h-2 w-2 shrink-0 rounded-full ${color.text.replace('text-', 'bg-')}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}
