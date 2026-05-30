# DataTable Div-Based Redesign Spec

**Date:** 2026-05-30
**Status:** Approved
**Type:** Component Redesign

## 1. Overview

Replace the HTML `<table>`-based DataTable with `<div>` elements using CSS Grid layout. Goal: achieve pixel-perfect column width control with interactive resize handles while preserving all existing functionality (sorting, selection, expansion, loading states, detail modals).

## 2. Architecture

### Component Structure

```
DataTable
├── TableHeader (sticky, grid row)
│   ├── SelectAllCheckbox
│   ├── ExpandChevron (products/warehouses only)
│   └── HeaderCell[] (label + sort button + resize handle)
├── TableBody
│   └── TableRow[] (grid row per data row)
│       ├── SelectCheckbox
│       ├── ExpandChevron
│       └── Cell[] (content via flexRender)
└── ExpandedContent (full-width below row when expanded)
```

### CSS Layout

`display: grid` replaces `<table>`. Both header and body rows are independent grid containers sharing `gridTemplateColumns` from centralized state.

## 3. State Management

```typescript
const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
  Object.fromEntries(visibleColumns.map(c => [c.id, c.width ?? 100]))
)

const [isResizing, setIsResizing] = useState<string | null>(null)
const resizeRef = useRef<{ startX: number; startWidth: number; columnId: string } | null>(null)
```

## 4. Column Width State

Initialize from `column.width` or default 100px. Update on resize drag.

```typescript
const gridTemplateColumns = tableColumns
  .map(col => `${columnWidths[col.id] ?? col.width}px`)
  .join(' ')
```

Applied to header and all body rows via `style` prop.

## 5. Resize Handles

### Structure

Each header cell contains an absolute-positioned resize handle at its trailing edge:

```jsx
<div className="relative flex items-center">
  {headerLabel}
  {column.sortable && (
    <button onClick={() => handleSort(columnId)}>sort icon</button>
  )}
  <div
    className="absolute top-0 h-full w-4 cursor-col-resize flex items-center justify-center end-0"
    onMouseDown={(e) => handleResizeStart(e, columnId)}
  >
    <div className={`h-full w-0.5 transition-colors ${isResizing === columnId ? 'bg-secondary' : 'bg-outline-variant hover:bg-secondary'}`} />
  </div>
</div>
```

### Mouse Handlers

```typescript
const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
  e.stopPropagation()
  const startWidth = columnWidths[columnId] ?? 100
  resizeRef.current = { startX: e.clientX, startWidth, columnId }
  setIsResizing(columnId)
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

const handleResizeMove = (e: MouseEvent) => {
  if (!resizeRef.current) return
  const { startX, startWidth, columnId } = resizeRef.current
  const delta = isRTLlayout ? startX - e.clientX : e.clientX - startX
  const newWidth = Math.max(50, Math.min(300, startWidth + delta))
  setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }))
}

const handleResizeEnd = () => {
  setIsResizing(null)
  resizeRef.current = null
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}
```

### Constraints

- Minimum width: 50px
- Maximum width: 300px
- Direction reverses in RTL layout

## 6. Sorting

- Sort button renders in header cells where `column.sortable === true`
- Active sort: `expand_less` (asc) or `expand_more` (desc)
- Inactive: `unfold_more`
- `handleSort(columnId)` cycles: asc → desc → clear (null)

```typescript
const handleSort = (columnId: string) => {
  if (!sort) {
    onSort({ columnId, direction: 'asc' })
  } else if (sort.columnId === columnId) {
    if (sort.direction === 'asc') {
      onSort({ columnId, direction: 'desc' })
    } else {
      onSort(null)
    }
  } else {
    onSort({ columnId, direction: 'asc' })
  }
}
```

## 7. Row Selection

### SelectAll (header)

```jsx
<input
  type="checkbox"
  checked={table.getIsAllRowsSelected()}
  onChange={table.getToggleAllRowsSelectedHandler()}
/>
```

### SelectRow (cell)

```jsx
<input
  type="checkbox"
  checked={row.getIsSelected()}
  onChange={row.getToggleSelectedHandler()}
  onClick={(e) => e.stopPropagation()}
/>
```

## 8. Expand/Collapse

### ExpandChevron (products & warehouses entity types)

In each body row (first column after select):

```jsx
<button
  className="p-1 hover:bg-surface-bright rounded transition-colors"
  onClick={(e) => {
    e.stopPropagation()
    onRowToggleExpand?.(row.original.id)
  }}
>
  <span
    className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${
      expandedRowIds?.has(row.original.id) ? 'rotate-90' : ''
    }`}
  >
    chevron_right
  </span>
</button>
```

## 9. Name Column Click

Identify name column via `columnDef?.isNameColumn`. Open detail modal on click:

```jsx
<div
  className="px-compact-padding py-2 text-on-surface cursor-pointer hover:bg-surface-container-highest"
  onClick={() => handleRowClick(row.original.id, row.original)}
>
  {flexRender(cell.column.columnDef.cell, cell.getContext())}
</div>
```

## 10. Expanded Rows

When `expandedRowIds?.has(row.original.id)`:

```jsx
<div className="contents">
  <div className="table-row" style={{ display: 'grid', gridTemplateColumns }}>
    {row.getVisibleCells().map(...)}
  </div>
  <div
    className="bg-surface-container-low p-0"
    style={{ gridColumn: '1 / -1' }}
  >
    {entityType === 'products' && (
      <VariantsSubTable ... />
    )}
    {entityType === 'warehouses' && (
      <WarehousesSubTable ... />
    )}
  </div>
</div>
```

`gridColumn: 1 / -1` makes expanded content span all column tracks.

## 11. Loading Skeleton

Same CSS Grid structure. 8 skeleton rows.

```jsx
<div className="flex-1 overflow-auto no-scrollbar bg-surface-container-lowest">
  <div style={{ display: 'grid', gridTemplateColumns }}>
    {Array.from({ length: 8 }).map((_, rowIndex) => (
      <div key={rowIndex} className="contents">
        <div className="table-row-skeleton">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          {visibleColumns.map(col => (
            <Skeleton key={col.id} className="h-5" />
          ))}
        </div>
      </div>
    ))}
  </div>
</div>
```

## 12. Grid Template Generation

```typescript
const tableColumns = useMemo(() => {
  const cols: TanstackColumnDef<EntityRow>[] = [selectColumn]
  if (entityType === 'products' || entityType === 'warehouses') {
    cols.push(expandColumn)
  }
  cols.push(...visibleColumns.map(col => ({ ... })))
  return cols
}, [selectColumn, expandColumn, entityType, visibleColumns])

const gridTemplateColumns = tableColumns
  .map(col => `${columnWidths[col.id] ?? col.width}px`)
  .join(' ')
```

Both header and body rows receive identical `gridTemplateColumns` style.

## 13. Variant: Select + Expand Columns

For products/warehouses: select (10%) + expand (10%) + data columns  
For variants: select only (no expand column)

## 14. RTL Support

- Resize delta direction reverses in RTL (`startX - clientX` instead of `clientX - startX`)
- `inset-s-0` / `inset-e-0` for handle positioning
- `columnResizeDirection: 'rtl'` passed to `useReactTable`

## 15. Imports

```typescript
import { useMemo, useCallback, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef as TanstackColumnDef,
} from '@tanstack/react-table'
import type { ColumnDef, EntityRow, DataTableProps, VariantRow, StockLevelWithVariant } from '@/lib/types/entity'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsRTL } from '@/hooks/user-is-rtl'
import { VariantsSubTable, WarehousesSubTable, ProductDetailModal, WarehouseDetailModal, VariantDetailModal } from './'
```

## 16. Out of Scope

- Changes to parent `DataTableShell` — passes same props, no changes needed
- Changes to sub-tables (`VariantsSubTable`, `WarehousesSubTable`) — remain table-based for now
- Changes to column definitions or data flow
- Changes to detail modals