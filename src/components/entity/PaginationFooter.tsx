import { formatNumber } from '@/lib/format'
import type { PaginationFooterProps } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'

export function PaginationFooter({
  pagination,
  onPageChange,
  isLoading,
  pageSizes,
}: PaginationFooterProps) {
  const { t } = useTranslation()
  const { page, pageSize, totalRows, totalPages } = pagination
  const start = totalRows === 0 && isLoading ? 0 : (page - 1) * pageSize + 1
  const end =
    totalRows === 0 && isLoading ? 0 : Math.min(page * pageSize, totalRows)

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageChange(1, Number(e.target.value))
  }

  pageSizes = pageSizes ?? [10, 25, 50, 100]

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    if (value >= 1 && value <= totalPages) {
      onPageChange(value, pageSize)
    }
  }

  return (
    <footer className="h-12 bg-surface-container-low border-t border-outline-variant px-6 flex items-center justify-between shrink-0 mt-3 rounded-full">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant text-body-sm">
            {t('entity.workspace.rowsPerPage')}
          </span>
          <select
            className="bg-surface-bright border border-outline-variant rounded w-12 px-2 py-1 text-on-surface text-center text-body-sm appearance-none"
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={isLoading}
            aria-label="Rows per page"
          >
            {pageSizes.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="text-on-surface-variant text-body-sm">
          {t('entity.workspace.showing', {
            start,
            end,
            total: formatNumber(totalRows),
          })}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          className="p-1 rounded hover:bg-surface-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onPageChange(1, pageSize)}
          disabled={isLoading || page === 1}
          title="First page"
          aria-label="First page"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] icon-directional rotate-180">
            first_page
          </span>
        </button>
        <button
          className="p-1 rounded hover:bg-surface-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page - 1, pageSize)}
          disabled={isLoading || page === 1}
          title="Previous page"
          aria-label="Previous page"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] icon-directional rotate-180">
            chevron_left
          </span>
        </button>
        <div className="flex items-center gap-1 mx-2">
          <span className="text-on-surface-variant text-body-sm">
            {t('entity.workspace.page')}
          </span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={handlePageInputChange}
            className="w-12 bg-surface-bright border border-outline-variant rounded px-2 py-1 text-center text-on-surface text-body-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            disabled={isLoading}
            aria-label="Go to page"
          />
          <span className="text-on-surface-variant text-body-sm">
            {t('entity.workspace.of', { total: totalPages })}
          </span>
        </div>
        <button
          className="p-1 rounded hover:bg-surface-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page + 1, pageSize)}
          disabled={isLoading || page === totalPages}
          title="Next page"
          aria-label="Next page"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] icon-directional rotate-180">
            chevron_right
          </span>
        </button>
        <button
          className="p-1 rounded hover:bg-surface-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onPageChange(totalPages, pageSize)}
          disabled={isLoading || page === totalPages}
          title="Last page"
          aria-label="Last page"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] rotate-180">
            last_page
          </span>
        </button>
      </div>
    </footer>
  )
}
