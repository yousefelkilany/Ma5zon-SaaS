import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef, FilterState } from '@/lib/types/entity'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'


interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  filters: FilterState[]
  onApply: (filters: FilterState[]) => void
}

export function FilterDialog({
  open,
  onOpenChange,
  columns,
  filters,
  onApply,
}: FilterDialogProps) {
  const { t } = useTranslation()
  const [localFilters, setLocalFilters] = useState<Record<string, string | string[] | { min?: string; max?: string }>>({})

  useEffect(() => {
    if (!open) return
    const initialized: Record<string, string | string[] | { min?: string; max?: string }> = {}
    filters.forEach(f => {
      const val = f.value
      if (typeof val === 'string') {
        initialized[f.columnId] = val
      } else if (Array.isArray(val)) {
        initialized[f.columnId] = val as unknown as string[]
      } else {
        initialized[f.columnId] = { min: String(val) ?? '', max: '' }
      }
    })
    setLocalFilters(initialized)
  }, [open, filters])

  const getFilterValue = (columnId: string) => {
    const val = localFilters[columnId]
    return typeof val === 'string' ? val : ''
  }
  const getNumberFilter = (columnId: string) => {
    const val = localFilters[columnId]
    return typeof val === 'object' && val !== null && !Array.isArray(val) ? val : {}
  }
  const getStatusFilter = (columnId: string) => {
    const val = localFilters[columnId]
    return Array.isArray(val) ? val : []
  }

  const filterableColumns = columns.filter(col => col.filterable && col.visible)

  const statusOptions = [
    { value: 'paid', label: t('entity.filter.statusPaid') },
    { value: 'overdue', label: t('entity.filter.statusOverdue') },
    { value: 'draft', label: t('entity.filter.statusDraft') },
  ]

  const handleClearAll = () => {
    onApply([])
    onOpenChange(false)
  }

  const handleApply = () => {
    const appliedFilters = Object.entries(localFilters)
      .filter(([_, v]) => v !== '' && (Array.isArray(v) ? v.length > 0 : true))
      .map(([columnId, value]) => {
        if (typeof value === 'string') {
          return { columnId, operator: 'contains' as const, value }
        } else if (Array.isArray(value)) {
          return { columnId, operator: 'eq' as const, value }
        } else {
          return { columnId, operator: 'between' as const, value: [value.min ?? '', value.max ?? ''] }
        }
      }) as FilterState[]
    onApply(appliedFilters)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('entity.workspace.toolbar.filters')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {filterableColumns.map(col => (
            <div key={col.id} className="space-y-2">
              <label className="text-body-sm text-on-surface font-medium">
                {col.label}
              </label>
              {col.type === 'text' && (
                <input
                  type="text"
                  aria-label={`Filter ${col.label}`}
                  placeholder={t('entity.filter.placeholder', { column: col.label })}
                  value={getFilterValue(col.id)}
                  onChange={e => setLocalFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                  className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                />
              )}
              {col.type === 'number' && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    aria-label={`${col.label} minimum`}
                    placeholder={t('entity.filter.min')}
                    value={getNumberFilter(col.id).min ?? ''}
                    onChange={e => setLocalFilters(prev => ({
                      ...prev,
                      [col.id]: { ...getNumberFilter(col.id), min: e.target.value }
                    }))}
                    className="flex-1 bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                  />
                  <input
                    type="number"
                    aria-label={`${col.label} maximum`}
                    placeholder={t('entity.filter.max')}
                    value={getNumberFilter(col.id).max ?? ''}
                    onChange={e => setLocalFilters(prev => ({
                      ...prev,
                      [col.id]: { ...getNumberFilter(col.id), max: e.target.value }
                    }))}
                    className="flex-1 bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                  />
                </div>
              )}
              {col.type === 'status' && (
                <div className="flex gap-2">
                  {statusOptions.map(option => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`${col.id}-${option.value}`}
                        checked={getStatusFilter(col.id).includes(option.value)}
                        onChange={e => {
                          const currentStatuses = getStatusFilter(col.id)
                          const newStatuses = e.target.checked
                            ? [...currentStatuses, option.value]
                            : currentStatuses.filter(s => s !== option.value)
                          setLocalFilters(prev => ({ ...prev, [col.id]: newStatuses }))
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-body-sm text-on-surface">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
              {col.type === 'date' && (
                <input
                  type="date"
                  aria-label={`Filter ${col.label}`}
                  value={getFilterValue(col.id)}
                  onChange={e => setLocalFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                  className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                />
              )}
            </div>
          ))}
          
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleClearAll}>
            {t('entity.filter.clearAll')}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('entity.filter.cancel')}
            </Button>
            <Button onClick={handleApply}>{t('entity.filter.apply')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}