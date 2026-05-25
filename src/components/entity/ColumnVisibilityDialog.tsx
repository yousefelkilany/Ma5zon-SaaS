import { useState, useEffect } from 'react'
import type { ColumnDef } from '@/lib/types/entity'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { GripVertical } from 'lucide-react'

interface ColumnVisibilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  onSave: (columns: ColumnDef[]) => void
}

export function ColumnVisibilityDialog({
  open,
  onOpenChange,
  columns,
  onSave,
}: ColumnVisibilityDialogProps) {
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>(columns)

  useEffect(() => {
    setLocalColumns(columns)
  }, [columns])

  const toggleColumn = (id: string) => {
    setLocalColumns(cols =>
      cols.map(col =>
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    )
  }

  const handleSave = () => {
    onSave(localColumns)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4 max-h-80 overflow-auto">
          {localColumns
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(col => (
              <div
                key={col.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-surface-container-low"
              >
                <GripVertical aria-hidden="true" className="text-on-surface-variant cursor-grab" size={16} />
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(col.id)}
                  aria-label={`Toggle ${col.label} visibility`}
                  className="w-4 h-4"
                />
                <span className="flex-1 text-on-surface text-body-sm">{col.label}</span>
                <span className="text-on-surface-variant text-body-sm text-xs">
                  {col.type}
                </span>
              </div>
            ))}
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}