import type { ToolbarProps } from '@/lib/types/entity'

export function Toolbar({
  searchValue,
  onSearchChange,
  onFiltersClick,
  onColumnsClick,
  hasSelection,
  selectedCount,
  onBulkAction,
  onExport,
}: ToolbarProps) {
  return (
    <section className="px-6 py-3 border-y border-outline-variant bg-surface-container flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative max-w-sm">
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm placeholder:text-on-surface-variant/50"
          />
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
        </div>
        <div className="h-6 w-px bg-outline-variant" />
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:bg-surface-bright transition-colors rounded border border-outline-variant text-body-sm"
          onClick={onFiltersClick}
        >
          <span className="material-symbols-outlined text-[18px]">filter_list</span>
          Filters
        </button>
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:bg-surface-bright transition-colors rounded border border-outline-variant text-body-sm"
          onClick={onColumnsClick}
        >
          <span className="material-symbols-outlined text-[18px]">view_column</span>
          Columns
        </button>
      </div>
      <div className="flex items-center gap-3">
        {hasSelection && (
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant text-body-sm">
              {selectedCount} selected
            </span>
            <button
              className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:bg-surface-bright transition-colors rounded text-body-sm"
              onClick={() => onBulkAction('delete')}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete
            </button>
          </div>
        )}
        {hasSelection && <div className="h-6 w-px bg-outline-variant" />}
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:bg-surface-bright transition-colors rounded text-body-sm"
          onClick={onExport}
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          Export
        </button>
      </div>
    </section>
  )
}