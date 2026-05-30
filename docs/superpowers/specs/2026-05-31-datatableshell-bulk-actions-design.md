# DataTable Bulk Actions Design

**Date:** 2026-05-31
**Status:** Approved

## Problem

1. Delete button in `DataTableShell` is not connected to any database operation
2. Need to add Export Selected and Print PDF bulk actions
3. Delete requires a confirmation dialog before destructive operations

## Requirements

- Delete selected items with confirmation dialog
- Export selected items (intersection of selection and current visible data)
- Print selected items as PDF (intersection of selection and current visible data)
- Print is the primary/default action

## Architecture

```
EntityWorkspace (owns state, handlers)
    │
    ├── DataTableShell (receives callbacks, manages selection)
    │       │
    │       ├── Toolbar (split button with dropdown)
    │       ├── DataTable (renders data)
    │       └── ConfirmationDialog (delete confirmation)
    │
    └── EntityWorkspace computes intersection: selectedIds ∩ filteredData
```

### Data Flow

1. User selects rows in DataTable → `selectedIds` state in DataTableShell
2. User clicks Print/Export/Delete → DataTableShell calls appropriate callback
3. For Print/Export: callback receives `(selectedIds, filteredData)` to compute intersection
4. For Delete: DataTableShell opens ConfirmationDialog first
5. On confirm: EntityWorkspace calls Rust delete command, invalidates queries

## Component Changes

### Toolbar.tsx

**Props (ToolbarProps type):**
- `onPrintSelected: () => void` - primary action, triggers directly on button click
- `onExportSelected: () => void` - in dropdown menu
- `onDelete: () => void` - in dropdown menu, opens confirmation dialog

**UI Structure:**
```
┌──────────────────┬──────────┐
│  [Print]         │  [▼]     │  ← Split button
└──────────────────┴──────────┘
                     │
               ┌─────┴─────┐
               │ Export    │
               │ Delete    │
               └───────────┘
```

- Uses existing Radix UI `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`
- Delete menu item uses `variant="destructive"` for destructive styling
- Material symbols icons: `print`, `file_download`, `delete`

### DataTableShell.tsx

**New State:**
- `confirmationDialogOpen: boolean`
- `confirmationDialogAction: 'delete' | null`

**Removed:**
- `handleBulkAction` callback (replaced with specific handlers)

**New Callbacks:**
- `handleDeleteClick` - opens confirmation dialog
- `handleConfirmDelete` - calls `onDelete(selectedIds)`, closes dialog, clears selection
- `handlePrintSelected` - calls `onPrintSelected(selectedIds, filteredData)`
- `handleExportSelected` - calls `onExportSelected(selectedIds, filteredData)`

**Toolbar Props:**
```typescript
<Toolbar
  // ... existing
  onPrintSelected={handlePrintSelected}
  onExportSelected={handleExportSelected}
  onDelete={handleDeleteClick}
/>
```

**ConfirmationDialog integration:**
```tsx
<ConfirmationDialog
  open={confirmationDialogOpen}
  onOpenChange={(open) => {
    setConfirmationDialogOpen(open)
    if (!open) setConfirmationDialogAction(null)
  }}
  title={t('entity.workspace.deleteConfirmTitle')}
  description={t('entity.workspace.deleteConfirmDescription', { count: selectedIds.size })}
  confirmLabel={t('entity.workspace.delete')}
  onConfirm={handleConfirmDelete}
/>
```

### EntityWorkspace.tsx

**New Handlers:**

```typescript
const handleExportSelected = useCallback((ids: Set<string>, data: EntityRow[]) => {
  const selectedData = data.filter(row => ids.has(row.id))
  // TODO: implement export logic
}, [])

const handlePrintSelected = useCallback((ids: Set<string>, data: EntityRow[]) => {
  const selectedData = data.filter(row => ids.has(row.id))
  // TODO: implement print PDF logic
}, [])

const handleDelete = useCallback(async (ids: Set<string>) => {
  // TODO: call Rust delete command
  // TODO: invalidate queries
}, [queryClient, entityType])
```

### ToolbarProps Type

```typescript
export interface ToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onFiltersClick: () => void
  onColumnsClick: () => void
  hasSelection: boolean
  selectedCount: number
  onPrintSelected: () => void
  onExportSelected: () => void
  onDelete: () => void
  onExport: () => void
  activeFilterCount?: number
}
```

## i18n Keys

- `entity.workspace.delete` - "Delete" button label
- `entity.workspace.deleteConfirmTitle` - "Delete Items" dialog title
- `entity.workspace.deleteConfirmDescription` - "Are you sure you want to delete {count} items?" dialog description
- `entity.workspace.toolbar.exportSelected` - "Export Selected" menu item
- `entity.workspace.toolbar.print` - "Print" button label

## Intersection Logic

Both Print and Export operate on: `selectedIds ∩ visibleData`

The `filteredData` passed to DataTableShell already accounts for:
- Search filter (Fuse.js)
- Column filters
- Sort order

Export/Print should use this same filtered data, filtered further to only selected IDs.

## Out of Scope

- Implementing the actual PDF generation (placeholder for now)
- Implementing the actual export file format (placeholder for now)
- Multi-select all pages (current selection is only within current view)
