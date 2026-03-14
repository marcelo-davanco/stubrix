import { cn } from '../../lib/utils'
import { useTranslation } from '../../lib/i18n'

export interface CategoryInfo {
  id: string
  label: string
  count: number
  enabledCount: number
  healthyCount: number
}

interface CategorySidebarProps {
  categories: CategoryInfo[]
  selected: string | null
  onSelect: (category: string | null) => void
  totalCount: number
}

export function CategorySidebar({ categories, selected, onSelect, totalCount }: CategorySidebarProps) {
  const { t } = useTranslation()
  const itemClass = (active: boolean) =>
    cn(
      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
      active
        ? 'bg-primary/20 text-primary font-medium'
        : 'text-text-secondary hover:bg-white/8 hover:text-text-primary',
    )

  return (
    <aside className="w-44 flex-shrink-0 flex flex-col gap-0.5 py-1">
      <button type="button" className={itemClass(selected === null)} onClick={() => onSelect(null)}>
        <span>{t('settings.all')}</span>
        <span className="text-xs opacity-60">{totalCount}</span>
      </button>
      <div className="my-1 border-t border-white/10" />
      {categories.map((cat) => {
        const hasUnhealthy = cat.enabledCount > 0 && cat.healthyCount < cat.enabledCount
        return (
          <button
            key={cat.id}
            type="button"
            className={itemClass(selected === cat.id)}
            onClick={() => onSelect(cat.id)}
          >
            <span className="flex items-center gap-1.5 truncate">
              {hasUnhealthy && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />}
              <span className="truncate">{cat.label}</span>
            </span>
            <span className="text-xs opacity-60 flex-shrink-0">{cat.count}</span>
          </button>
        )
      })}
    </aside>
  )
}
