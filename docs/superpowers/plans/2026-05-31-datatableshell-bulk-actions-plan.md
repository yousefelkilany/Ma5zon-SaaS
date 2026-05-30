# DataTableShell Bulk Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk actions (Print, Export Selected, Delete with confirmation) to DataTableShell toolbar

**Architecture:** EntityWorkspace passes typed callbacks (onPrintSelected, onExportSelected, onDelete) to DataTableShell. DataTableShell manages selection state and dialog visibility, calls appropriate callback. Toolbar uses split-button pattern with Radix UI DropdownMenu.

**Tech Stack:** React, Radix UI DropdownMenu, react-i18next, Tauri commands

---

## File Structure

- Modify: `src/lib/types/entity.ts` - ToolbarProps interface
- Modify: `src/components/entity/Toolbar.tsx` - split button with dropdown
- Modify: `src/components/entity/DataTableShell.tsx` - add dialog state, handlers
- Modify: `src/components/entity/EntityWorkspace.tsx` - add action handlers
- Add: `locales/*/entity.json` - i18n keys

---

## Task 1: Update ToolbarProps Type

**Files:**
- Modify: `src/lib/types/entity.ts:75-85`

- [ ] **Step 1: Update ToolbarProps interface**

Replace lines 75-85 with:

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

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/entity.ts
git commit -m "feat(entity): update ToolbarProps for bulk actions"
```

---

## Task 2: Update Toolbar Component

**Files:**
- Modify: `src/components/entity/Toolbar.tsx`

- [ ] **Step 1: Add imports for DropdownMenu components**

Add to top of file after existing imports:

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

- [ ] **Step 2: Update component props destructuring**

Replace `onBulkAction` in destructuring with three separate props:

```typescript
export function Toolbar({
  searchValue,
  onSearchChange,
  onFiltersClick,
  onColumnsClick,
  hasSelection,
  selectedCount,
  onPrintSelected,
  onExportSelected,
  onDelete,
  onExport,
}: ToolbarProps) {
```

- [ ] **Step 3: Replace bulk action buttons section (lines 59-75)**

Replace this section:
```typescript
{hasSelection && (
  <div className="flex items-center gap-2">
    <span className="text-on-surface-variant text-body-sm">
      {t('entity.workspace.selected', { count: selectedCount })}
    </span>
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:bg-surface-bright transition-colors rounded text-body-sm"
      onClick={() => onBulkAction('delete')}
    >
      <span className="material-symbols-outlined text-[18px]">
        delete
      </span>
      {t('entity.workspace.delete')}
    </button>
  </div>
)}
```

With:

```typescript
{hasSelection && (
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
        <DropdownMenuItem onClick={onExportSelected}>
          <span className="material-symbols-outlined text-[18px]">
            file_download
          </span>
          {t('entity.workspace.toolbar.exportSelected')}
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
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/Toolbar.tsx
git commit -m "feat(entity): add split button bulk actions with dropdown"
```

---

## Task 3: Update DataTableShell

**Files:**
- Modify: `src/components/entity/DataTableShell.tsx`

- [ ] **Step 1: Add ConfirmationDialog import**

Add to imports (line 16):

```typescript
import { ConfirmationDialog } from './ConfirmationDialog'
```

- [ ] **Step 2: Add dialog state after existing state declarations (after line 71)**

Add:

```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
```

- [ ] **Step 3: Replace handleBulkAction with new handlers (lines 137-139)**

Replace:

```typescript
const handleBulkAction = useCallback((_action: string) => {
  setSelectedIds(new Set())
}, [])
```

With:

```typescript
const handlePrintSelected = useCallback(() => {
  onPrintSelected(selectedIds, filteredData)
}, [selectedIds, filteredData, onPrintSelected])

const handleExportSelected = useCallback(() => {
  onExportSelected(selectedIds, filteredData)
}, [selectedIds, filteredData, onExportSelected])

const handleDeleteClick = useCallback(() => {
  setDeleteDialogOpen(true)
}, [])

const handleConfirmDelete = useCallback(() => {
  onDelete(selectedIds)
  setDeleteDialogOpen(false)
  setSelectedIds(new Set())
}, [selectedIds, onDelete])
```

- [ ] **Step 4: Add onPrintSelected, onExportSelected, onDelete to props interface and destructuring**

Add to interface (after line 29):
```typescript
onPrintSelected: (ids: Set<string>, data: EntityRow[]) => void
onExportSelected: (ids: Set<string>, data: EntityRow[]) => void
onDelete: (ids: Set<string>) => void
```

Add to destructuring (after line 53):
```typescript
onPrintSelected,
onExportSelected,
onDelete,
```

- [ ] **Step 5: Update Toolbar props (lines 151-161)**

Replace:
```typescript
<Toolbar
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  activeFilterCount={filters.length}
  onFiltersClick={() => setFilterDialogOpen(true)}
  onColumnsClick={() => setColumnDialogOpen(true)}
  hasSelection={selectedIds.size > 0}
  selectedCount={selectedIds.size}
  onBulkAction={handleBulkAction}
  onExport={onExport}
/>
```

With:
```typescript
<Toolbar
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  activeFilterCount={filters.length}
  onFiltersClick={() => setFilterDialogOpen(true)}
  onColumnsClick={() => setColumnDialogOpen(true)}
  hasSelection={selectedIds.size > 0}
  selectedCount={selectedIds.size}
  onPrintSelected={handlePrintSelected}
  onExportSelected={handleExportSelected}
  onDelete={handleDeleteClick}
  onExport={onExport}
/>
```

- [ ] **Step 6: Add ConfirmationDialog before closing div (before line 208)**

Add before `</div>`:

```typescript
<ConfirmationDialog
  open={deleteDialogOpen}
  onOpenChange={(open) => {
    setDeleteDialogOpen(open)
  }}
  title={t('entity.workspace.deleteConfirmTitle')}
  description={t('entity.workspace.deleteConfirmDescription', { count: selectedIds.size })}
  confirmLabel={t('entity.workspace.delete')}
  onConfirm={handleConfirmDelete}
/>
```

- [ ] **Step 7: Add useTranslation if not already imported** (check line 1 - it imports from react)

`useTranslation` is already imported on line 1.

- [ ] **Step 8: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat(entity): wire up bulk actions with confirmation dialog"
```

---

## Task 4: Update EntityWorkspace

**Files:**
- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Add new handlers after handleFiltersApply (after line 348)**

Add:

```typescript
const handlePrintSelected = useCallback(
  (_ids: Set<string>, _data: EntityRow[]) => {
    // TODO: implement print PDF logic
    console.log('Print selected:', _ids.size, 'items')
  },
  []
)

const handleExportSelected = useCallback(
  (_ids: Set<string>, _data: EntityRow[]) => {
    // TODO: implement export logic
    console.log('Export selected:', _ids.size, 'items')
  },
  []
)

const handleDelete = useCallback(
  async (_ids: Set<string>) => {
    // TODO: implement delete logic
    console.log('Delete:', _ids.size, 'items')
  },
  []
)
```

- [ ] **Step 2: Pass new handlers to DataTableShell (around line 357)**

Add after existing DataTableShell props:

```typescript
onPrintSelected={handlePrintSelected}
onExportSelected={handleExportSelected}
onDelete={handleDelete}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "feat(entity): add bulk action handlers to EntityWorkspace"
```

---

## Task 5: Add i18n Keys

**Files:**
- Modify: `src/locales/en/entity.json` (or relevant locale)

- [ ] **Step 1: Add new translation keys**

Add to the JSON file:

```json
"toolbar": {
  "print": "Print",
  "exportSelected": "Export Selected"
},
"delete": "Delete",
"deleteConfirmTitle": "Delete Items",
"deleteConfirmDescription": "Are you sure you want to delete {count} items? This action cannot be undone."
```

- [ ] **Step 2: Commit**

```bash
git add src/locales/*/entity.json
git commit -m "i18n: add bulk action translation keys"
```

---

## Self-Review Checklist

- [ ] All ToolbarProps updated in entity.ts
- [ ] Toolbar renders split button with Print primary, dropdown for Export/Delete
- [ ] DataTableShell has deleteDialogOpen state
- [ ] DataTableShell passes onPrintSelected, onExportSelected, onDelete to Toolbar
- [ ] ConfirmationDialog shown on delete
- [ ] EntityWorkspace has placeholder handlers for all three actions
- [ ] i18n keys added for print, exportSelected, deleteConfirmTitle, deleteConfirmDescription
- [ ] Each task commits separately

---

## Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| Delete with confirmation dialog | Task 3, Task 4 |
| Export Selected (intersection) | Task 4 placeholder |
| Print Selected (intersection) | Task 4 placeholder |
| Split button UI | Task 2 |
| ToolbarProps type change | Task 1 |
| i18n keys | Task 5 |

**Note:** Actual PDF generation and complete export implementation are marked as TODO in EntityWorkspace handlers - those are out of scope for this plan per the spec.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-31-datatableshell-bulk-actions-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?