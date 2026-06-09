import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@/lib/types/entity'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface SortableRowProps {
  col: ColumnDef
  onToggle: () => void
  t: (key: string, options?: Record<string, unknown>) => string
}

function SortableRow({ col, onToggle, t }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: col.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-2 rounded hover:bg-surface-container-low"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical
          aria-hidden="true"
          className="text-on-surface-variant"
          size={16}
        />
      </button>
      <input
        type="checkbox"
        checked={col.visible}
        onChange={onToggle}
        aria-label={t('entity.workspace.columns.toggleVisibility', {
          column: col.label,
        })}
        className="w-4 h-4"
      />
      <span className="flex-1 text-on-surface text-body-sm">{col.label}</span>
      <span className="text-on-surface-variant text-body-sm text-xs">
        {col.typeLabel}
      </span>
    </div>
  )
}

interface ColumnVisibilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  onSave: (columns: ColumnDef[]) => void
}

function columnsEqual(a: ColumnDef[], b: ColumnDef[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    if (
      x.id !== y.id ||
      x.visible !== y.visible ||
      x.order !== y.order
    ) {
      return false
    }
  }
  return true
}

export function ColumnVisibilityDialog({
  open,
  onOpenChange,
  columns,
  onSave,
}: ColumnVisibilityDialogProps) {
  const { t } = useTranslation()
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>(columns)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (over && active.id !== over.id) {
      const oldIndex = localColumns.findIndex(c => c.id === active.id)
      const newIndex = localColumns.findIndex(c => c.id === over.id)
      const reordered = arrayMove(localColumns, oldIndex, newIndex)
      setLocalColumns(reordered.map((col, idx) => ({ ...col, order: idx })))
    }
  }

  useEffect(() => {
    if (open) {
      setLocalColumns(columns)
    }
  }, [open, columns])

  const toggleColumn = (id: string) => {
    setLocalColumns(cols =>
      cols.map(col => (col.id === id ? { ...col, visible: !col.visible } : col))
    )
  }

  const isDirty = useMemo(
    () => !columnsEqual(localColumns, columns),
    [localColumns, columns]
  )

  const guard = useUnsavedGuard({
    isDirty,
    onDiscard: () => onOpenChange(false),
  })

  const handleSave = () => {
    onSave(localColumns)
  }

  return (
    <Dialog open={open} onClose={guard.requestClose}>
      <DialogPanel onClose={guard.requestClose}>
        <DialogTitle>{t('entity.workspace.columns.manage')}</DialogTitle>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localColumns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 py-4 max-h-80 overflow-auto">
              {localColumns
                .slice()
                .sort((a, b) => a.order - b.order)
                .map(col => (
                  <SortableRow
                    key={col.id}
                    col={col}
                    onToggle={() => toggleColumn(col.id)}
                    t={t}
                  />
                ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="flex items-center gap-3 p-2 rounded bg-surface-container-high shadow-lg">
                <GripVertical
                  aria-hidden="true"
                  className="text-on-surface-variant"
                  size={16}
                />
                <span className="flex-1 text-on-surface text-body-sm">
                  {localColumns.find(c => c.id === activeId)?.label}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={guard.requestClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('entity.workspace.columns.saveChanges')}
          </Button>
        </div>
        <guard.ConfirmDialog />
      </DialogPanel>
    </Dialog>
  )
}
