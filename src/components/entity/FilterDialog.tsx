import type { ColumnDef, FilterState } from '@/lib/types/entity'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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
  const filterableColumns = columns.filter(col => col.filterable && col.visible)

  const handleClearAll = () => {
    onApply([])
    onOpenChange(false)
  }

  const handleApply = () => {
    onApply(filters)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
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
                  placeholder={`Filter ${col.label}...`}
                  className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                />
              )}
              {col.type === 'number' && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                  />
                </div>
              )}
              {col.type === 'status' && (
                <div className="flex gap-2">
                  {['Paid', 'Overdue', 'Draft'].map(status => (
                    <label key={status} className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="text-body-sm text-on-surface">{status}</span>
                    </label>
                  ))}
                </div>
              )}
              {col.type === 'date' && (
                <input
                  type="date"
                  className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm"
                />
              )}
            </div>
          ))}
          {/* Placeholder for future filter rows */}
          <div className="text-center text-on-surface-variant text-body-sm py-4">
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleClearAll}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}