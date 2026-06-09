import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef, FilterState } from '@/lib/types/entity'
import { Dialog, DialogPanel, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  filters: FilterState[]
  onApply: (filters: FilterState[]) => void
}

type LocalValue = string | string[] | { min?: string; max?: string }

function localFiltersToArray(local: Record<string, LocalValue>): FilterState[] {
  return Object.entries(local)
    .filter(([_, v]) => v !== '' && (Array.isArray(v) ? v.length > 0 : true))
    .map(([columnId, value]) => {
      if (typeof value === 'string') {
        return { columnId, operator: 'contains' as const, value }
      } else if (Array.isArray(value)) {
        return { columnId, operator: 'eq' as const, value }
      }
      return {
        columnId,
        operator: 'between' as const,
        value: [value.min ?? '', value.max ?? ''],
      }
    }) as FilterState[]
}

function arraysEqual(a: FilterState[], b: FilterState[]): boolean {
  if (a.length !== b.length) return false
  const sortFn = (x: FilterState) =>
    `${x.columnId}:${x.operator}:${JSON.stringify(x.value)}`
  const sa = [...a].map(sortFn).sort()
  const sb = [...b].map(sortFn).sort()
  return sa.every((v, i) => v === sb[i])
}

export function FilterDialog({
  open,
  onOpenChange,
  columns,
  filters,
  onApply,
}: FilterDialogProps) {
  const { t } = useTranslation()
  const [localFilters, setLocalFilters] = useState<Record<string, LocalValue>>(
    {}
  )

  useEffect(() => {
    if (!open) return
    const initialized: Record<string, LocalValue> = {}
    filters.forEach(f => {
      const val = f.value
      if (typeof val === 'string') {
        initialized[f.columnId] = val
      } else if (Array.isArray(val)) {
        initialized[f.columnId] = val as unknown as string[]
      } else {
        initialized[f.columnId] = { min: String(val) || '', max: '' }
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
    return typeof val === 'object' && val !== null && !Array.isArray(val)
      ? val
      : {}
  }
  const getStatusFilter = (columnId: string) => {
    const val = localFilters[columnId]
    return Array.isArray(val) ? val : []
  }

  const isDirty = useMemo(() => {
    return !arraysEqual(localFiltersToArray(localFilters), filters)
  }, [localFilters, filters])

  const guard = useUnsavedGuard({
    isDirty,
    onDiscard: () => onOpenChange(false),
  })

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
    onApply(localFiltersToArray(localFilters))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onClose={guard.requestClose}>
      <DialogPanel onClose={guard.requestClose}>
        <DialogTitle>{t('entity.workspace.toolbar.filters')}</DialogTitle>
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
                  placeholder={t('entity.filter.placeholder', {
                    column: col.label,
                  })}
                  value={getFilterValue(col.id)}
                  onChange={e =>
                    setLocalFilters(prev => ({
                      ...prev,
                      [col.id]: e.target.value,
                    }))
                  }
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
                    onChange={e =>
                      setLocalFilters(prev => ({
                        ...prev,
                        [col.id]: {
                          ...getNumberFilter(col.id),
                          min: e.target.value,
                        },
                      }))
                    }
                    className="flex-1 bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                  />
                  <input
                    type="number"
                    aria-label={`${col.label} maximum`}
                    placeholder={t('entity.filter.max')}
                    value={getNumberFilter(col.id).max ?? ''}
                    onChange={e =>
                      setLocalFilters(prev => ({
                        ...prev,
                        [col.id]: {
                          ...getNumberFilter(col.id),
                          max: e.target.value,
                        },
                      }))
                    }
                    className="flex-1 bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                  />
                </div>
              )}
              {col.type === 'status' && (
                <div className="flex gap-2">
                  {statusOptions.map(option => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        id={`${col.id}-${option.value}`}
                        checked={getStatusFilter(col.id).includes(option.value)}
                        onChange={e => {
                          const currentStatuses = getStatusFilter(col.id)
                          const newStatuses = e.target.checked
                            ? [...currentStatuses, option.value]
                            : currentStatuses.filter(s => s !== option.value)
                          setLocalFilters(prev => ({
                            ...prev,
                            [col.id]: newStatuses,
                          }))
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-body-sm text-on-surface">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {col.type === 'date' && (
                <input
                  type="date"
                  aria-label={`Filter ${col.label}`}
                  value={getFilterValue(col.id)}
                  onChange={e =>
                    setLocalFilters(prev => ({
                      ...prev,
                      [col.id]: e.target.value,
                    }))
                  }
                  className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleClearAll}>
            {t('entity.filter.clearAll')}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={guard.requestClose}>
              {t('entity.filter.cancel')}
            </Button>
            <Button onClick={handleApply}>{t('entity.filter.apply')}</Button>
          </div>
        </div>
        <guard.ConfirmDialog />
      </DialogPanel>
    </Dialog>
  )
}
