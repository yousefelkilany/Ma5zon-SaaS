import type { ToolbarProps } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Toolbar({
  searchValue,
  onSearchChange,
  onFiltersClick,
  onColumnsClick,
  selectedCount,
  onPrintSelected,
  onExportFormatSelect,
  onDelete,
}: ToolbarProps) {
  const { t } = useTranslation()

  return (
    <section className="px-6 py-3 border-y border-outline-variant bg-surface-container flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative max-w-sm">
          <input
            type="text"
            placeholder={t('entity.workspace.toolbar.searchPlaceholder')}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm placeholder:text-on-surface-variant/50"
          />
          <button
            type="button"
            className="absolute inset-e-10 top-1/2 -translate-y-1/2"
          >
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
          </button>
        </div>
        <div className="h-6 w-px bg-outline-variant" />
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:bg-surface-bright transition-colors rounded border border-outline-variant text-body-sm"
          onClick={onFiltersClick}
        >
          <span className="material-symbols-outlined text-[18px]">
            filter_list
          </span>
          {t('entity.workspace.toolbar.filters')}
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:bg-surface-bright transition-colors rounded border border-outline-variant text-body-sm"
          onClick={onColumnsClick}
        >
          <span className="material-symbols-outlined text-[18px]">
            view_column
          </span>
          {t('entity.workspace.toolbar.columns')}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant text-body-sm">
            {t('entity.workspace.selected', { count: selectedCount })}
          </span>
          <DropdownMenu>
            <div className="flex">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors rounded-s text-body-sm"
                onClick={onPrintSelected}
              >
                <span className="material-symbols-outlined text-[18px]">
                  print
                </span>
                {t('entity.workspace.toolbar.print')}
              </button>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center px-2 py-1.5 bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors rounded-e border-s border-on-secondary/20"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExportFormatSelect('csv')}>
                <span className="material-symbols-outlined text-[18px]">
                  grid_on
                </span>
                {t('entity.workspace.export.csv')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportFormatSelect('xlsx')}>
                <span className="material-symbols-outlined text-[18px]">
                  table
                </span>
                {t('entity.workspace.export.excel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <span className="material-symbols-outlined text-[18px]">
                  delete
                </span>
                {t('entity.workspace.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </section>
  )
}
