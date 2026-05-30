# Entity Workspace UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix delete not refreshing UI, remove actions column, wire callbacks properly with queryClient passed directly to DataTableShell for invalidation.

**Architecture:** Approach B (direct invalidation) — EntityWorkspace passes `queryClient` to DataTableShell, which calls `invalidateQueries` directly after delete succeeds. This avoids callback chain propagation.

**Tech Stack:** React (useState, useCallback), TanStack Query (queryClient), TypeScript

---

## Task 1: Remove Actions Column from DataTable

**Files:**
- Modify: `src/components/entity/DataTable.tsx:171-240`

**Context:** The `_actionsColumn` renders edit/delete pencil icons that we need to remove. Also remove `onEditClick` and `onDeleteClick` from props since they won't be used anymore.

- [ ] **Step 1: Remove _actionsColumn useMemo**

Find lines 171-218:
```typescript
const _actionsColumn = useMemo<TanstackColumnDef<EntityRow>>(
  () => ({
    id: 'actions',
    size: 100,
    enableResizing: false,
    header: () => (
      <span className="text-center">
        {t('entity.workspace.columns.actions')}
      </span>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1 text-on-surface-variant hover:text-primary"
          title={t('entity.workspace.edit')}
          aria-label={t('entity.workspace.edit')}
          onClick={e => {
            e.stopPropagation()
            handleEditClick(row.original.id, row.original)
          }}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            edit
          </span>
        </button>
        <button
          className="p-1 text-on-surface-variant hover:text-error"
          title={t('entity.workspace.delete')}
          aria-label={t('entity.workspace.delete')}
          onClick={e => {
            e.stopPropagation()
            handleDeleteClick(row.original.id, row.original)
          }}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            delete
          </span>
        </button>
      </div>
    ),
  }),
  [t, handleEditClick, handleDeleteClick]
)
```

Delete this entire block.

- [ ] **Step 2: Remove _actionsColumn from tableColumns**

Find line 237:
```typescript
cols.push(_actionsColumn)
```

Delete this line.

- [ ] **Step 3: Update tableColumns useMemo dependency array**

Find line 240:
```typescript
}, [selectColumn, expandColumn, entityType, visibleColumns, _actionsColumn])
```

Change to:
```typescript
}, [selectColumn, expandColumn, entityType, visibleColumns])
```

- [ ] **Step 4: Remove onEditClick and onDeleteClick from DataTableProps**

Find in `DataTableProps & ExpandedRowProps` (lines 84-85):
```typescript
  onEditClick?: (id: string, row: EntityRow) => void
  onDeleteClick?: (id: string, row: EntityRow) => void
```

Delete both lines.

- [ ] **Step 5: Remove handleEditClick and handleDeleteClick from component**

Find lines 97-110:
```typescript
  const handleEditClick = useCallback(
    (id: string, row: EntityRow) => {
      onEditClick?.(id, row)
      setSelectedEntityId(id)
      setEditModalOpen(true)
    },
    [onEditClick]
  )

  const handleDeleteClick = useCallback((id: string, row: EntityRow) => {
    setSelectedEntityId(id)
    setSelectedRow(row)
    setDeleteModalOpen(true)
  }, [])
```

Delete this entire block.

- [ ] **Step 6: Remove delete modal state and ConfirmationDialog**

Find lines 93-95:
```typescript
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<EntityRow | null>(null)
```

Change to:
```typescript
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
```

Also remove `selectedRow` since we don't need it anymore.

Find lines 488-503 (ConfirmationDialog block):
```typescript
      {selectedEntityId && (
        <ConfirmationDialog
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          title={t('entity.workspace.deleteConfirmTitle')}
          description={t('entity.workspace.deleteConfirmMessage')}
          onConfirm={() => {
            if (selectedEntityId && selectedRow) {
              onDeleteClick?.(selectedEntityId, selectedRow)
            }
            setDeleteModalOpen(false)
            setSelectedEntityId(null)
            setSelectedRow(null)
          }}
        />
      )}
```

Delete this entire block.

- [ ] **Step 7: Remove onDeleteClick from component destructuring**

Find line 85:
```typescript
  onDeleteClick,
```

Delete this line.

- [ ] **Step 8: Run TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 9: Commit**

```bash
git add src/components/entity/DataTable.tsx
git commit -m "refactor: remove actions column and delete modal from DataTable"
```

---

## Task 2: Pass queryClient to DataTableShell for Direct Invalidation

**Files:**
- Modify: `src/components/entity/DataTableShell.tsx`
- Modify: `src/components/entity/EntityWorkspace.tsx`

**Context:** Approach B — pass `queryClient` directly to DataTableShell so it can call `invalidateQueries` without propagating callbacks through multiple layers.

- [ ] **Step 1: Add queryClient prop to DataTableShellProps**

Find line 17-30:
```typescript
interface DataTableShellProps {
  entityType: string
  columns: ColumnDef[]
  data: EntityRow[]
  pagination: PaginationState
  isLoading: boolean
  onSaveColumnPrefs: (columns: ColumnDef[]) => void
  onFiltersApply: (filters: FilterState[]) => void
  onExport: () => void
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingVariants?: (id: string) => boolean
}
```

Add `queryClient` to the interface:
```typescript
interface DataTableShellProps {
  entityType: string
  columns: ColumnDef[]
  data: EntityRow[]
  pagination: PaginationState
  isLoading: boolean
  onSaveColumnPrefs: (columns: ColumnDef[]) => void
  onFiltersApply: (filters: FilterState[]) => void
  onExport: () => void
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingVariants?: (id: string) => boolean
  queryClient: QueryClient // Add this
}
```

Import `QueryClient` from `@tanstack/react-query`.

- [ ] **Step 2: Add queryClient to DataTableShell destructuring**

Find lines 39-52:
```typescript
export function DataTableShell({
  entityType,
  columns,
  data,
  pagination,
  isLoading,
  onSaveColumnPrefs,
  onFiltersApply,
  onExport,
  expandedRowIds,
  variantsCache,
  onRowToggleExpand,
  isLoadingVariants,
}: DataTableShellProps) {
```

Add `queryClient` to destructuring:
```typescript
export function DataTableShell({
  entityType,
  columns,
  data,
  pagination,
  isLoading,
  onSaveColumnPrefs,
  onFiltersApply,
  onExport,
  expandedRowIds,
  variantsCache,
  onRowToggleExpand,
  isLoadingVariants,
  queryClient,
}: DataTableShellProps) {
```

- [ ] **Step 3: Wire onFiltersApply to trigger refetch**

Find line 55:
```typescript
  const [filters] = useState<FilterState[]>([])
```

Change to:
```typescript
  const [filters, setFilters] = useState<FilterState[]>([])
```

Find the FilterDialog (lines 128-134):
```typescript
      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        columns={columns}
        filters={filters}
        onApply={onFiltersApply}
      />
```

The `onFiltersApply` callback needs to both:
1. Update local filters state
2. Trigger query invalidation

Change the `onApply` handler in FilterDialog to call a local handler that updates state AND calls `queryClient.invalidateQueries(['entity', entityType])`.

Actually, `onFiltersApply` is a prop from EntityWorkspace. The cleanest approach: pass `queryClient` to FilterDialog's `onApply`, but that changes FilterDialog interface.

Better: update `handleColumnSave` to call `queryClient.invalidateQueries` after `onSaveColumnPrefs`. And for filters, EntityWorkspace handles invalidation via `onFiltersApply` callback.

But the issue is `onFiltersApply` is a no-op. Let's fix that in EntityWorkspace, not DataTableShell.

For now in DataTableShell, just remove the unused `filters` state since FilterDialog manages its own filters. The `onFiltersApply` is passed from parent and will be wired there.

Actually wait — looking at line 55, `filters` state in DataTableShell is NEVER used (line 132 passes `filters={filters}` but that's from state, not from FilterDialog's response). And `onApply={onFiltersApply}` on line 133 just passes the no-op up.

The `handleColumnSave` at line 83-89:
```typescript
  const handleColumnSave = useCallback(
    (newColumns: ColumnDef[]) => {
      onSaveColumnPrefs(newColumns)
      setColumnDialogOpen(false)
    },
    [onSaveColumnPrefs]
  )
```

This calls `onSaveColumnPrefs` (the no-op from EntityWorkspace). We need to add `queryClient.invalidateQueries` here directly.

Change `handleColumnSave` to:
```typescript
  const handleColumnSave = useCallback(
    (newColumns: ColumnDef[]) => {
      onSaveColumnPrefs(newColumns)
      queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
      setColumnDialogOpen(false)
    },
    [onSaveColumnPrefs, queryClient, entityType]
  )
```

- [ ] **Step 4: Remove unused state and handlers from DataTableShell**

Remove line 55 (`const [filters] = useState<FilterState[]>([])`) since FilterDialog manages its own filters and we don't need local state.

Remove lines 75-77 (`handleRowClick` no-op) since DataTable handles row clicks directly.

Remove lines 79-81 (`handleBulkAction` no-op) since we don't have bulk actions yet.

But wait — `handleRowClick` is passed to DataTable as `onRowClick` prop (line 115). If we remove `handleRowClick`, we need to either pass `undefined` or a no-op.

Actually `handleRowClick` just isn't used — DataTable handles its own row clicks internally via `onRowClick` prop (which just opens modal). But we still need to pass `onRowClick` to DataTable since it accepts it.

So keep `handleRowClick` as a no-op, but remove `handleBulkAction`.

Actually let's keep things simple — just add `queryClient` and wire `handleColumnSave`. Don't refactor other things.

- [ ] **Step 5: Run TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat: pass queryClient to DataTableShell for direct invalidation"
```

---

## Task 3: Wire EntityWorkspace Callbacks (onFiltersApply, onSaveColumnPrefs, queryClient)

**Files:**
- Modify: `src/components/entity/EntityWorkspace.tsx`

**Context:** EntityWorkspace owns the data and queryClient. It needs to wire `onFiltersApply`, `onSaveColumnPrefs`, and pass `queryClient` to DataTableShell.

- [ ] **Step 1: Import useQueryClient**

Find line 4:
```typescript
import { useQuery } from '@tanstack/react-query'
```

Change to:
```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
```

- [ ] **Step 2: Add useQueryClient hook**

Find line 140:
```typescript
  const { data: entityData, isLoading } = useQuery({
```

Add before it:
```typescript
  const queryClient = useQueryClient()
```

- [ ] **Step 3: Add filter state**

Find line 102:
```typescript
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
```

Add after:
```typescript
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([])
```

- [ ] **Step 4: Wire onSaveColumnPrefs to localStorage + invalidation**

Find line 183:
```typescript
        onSaveColumnPrefs={x => x}
```

Change to:
```typescript
        onSaveColumnPrefs={(columns) => {
          localStorage.setItem(`user_prefs_columns_${entityType}`, JSON.stringify(columns))
          queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
        }}
```

- [ ] **Step 5: Wire onFiltersApply to update filter state + refetch**

Find line 184:
```typescript
        onFiltersApply={x => x}
```

Change to:
```typescript
        onFiltersApply={(filters) => {
          setActiveFilters(filters)
          queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
        }}
```

- [ ] **Step 6: Pass queryClient to DataTableShell**

Find line 182 (after isLoading):
```typescript
        isLoading={isLoading}
```

Add after:
```typescript
        queryClient={queryClient}
```

- [ ] **Step 7: Update queryFn to use activeFilters**

Find the queryFn (lines 144-155):
```typescript
      switch (entityType) {
        case 'products': {
          const result = await commands.getAll([], [])
          return result.status === 'ok' ? result.data : []
        }
        case 'warehouses': {
          const result = await commands.warehousesGetAll([], [])
          return result.status === 'ok' ? result.data : []
        }
        default:
          return []
      }
```

Change to:
```typescript
      switch (entityType) {
        case 'products': {
          const result = await commands.getAll(activeFilters, [])
          return result.status === 'ok' ? result.data : []
        }
        case 'warehouses': {
          const result = await commands.warehousesGetAll(activeFilters, [])
          return result.status === 'ok' ? result.data : []
        }
        default:
          return []
      }
```

- [ ] **Step 8: Run TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 9: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "feat: wire EntityWorkspace callbacks with queryClient invalidation and filter state"
```

---

## Task 4: Update DetailModal onDeleted to Trigger Parent Callback

**Files:**
- Modify: `src/components/entity/ProductDetailModal.tsx`
- Modify: `src/components/entity/WarehouseDetailModal.tsx`
- Modify: `src/components/entity/VariantDetailModal.tsx`

**Context:** Currently DetailModal's `onDeleted` only closes the modal. Need to also call a callback that triggers query invalidation. But wait — we removed ConfirmationDialog from DataTable. The delete confirmation is inside DetailModal. So DetailModal already calls `queryClient.invalidateQueries`? No, it doesn't.

Looking at ProductDetailModal (line 148), `handleDelete` calls `commands.deleteProduct(id)` then calls `onDeleted()`. The `onDeleted` is just `() => { setEditModalOpen(false); setSelectedEntityId(null) }`.

We need to pass an `onDeleted` callback from EntityWorkspace through DataTableShell → DataTable → DetailModal.

But wait — Approach B says DataTableShell has queryClient and calls invalidation directly. The issue is DataTableShell doesn't know when delete succeeds because ConfirmationDialog is inside DetailModal, not in DataTableShell.

So the callback chain is still needed: DetailModal.onDeleted → DataTable → DataTableShell → queryClient.invalidateQueries

OR: We pass queryClient all the way through to DetailModal.

Let me reconsider. The cleanest approach:

1. EntityWorkspace passes `queryClient` to DataTableShell
2. DataTableShell passes `queryClient` to DataTable
3. DataTable passes `queryClient` to DetailModal
4. DetailModal.handleDelete calls `queryClient.invalidateQueries` directly after delete succeeds

This avoids callback chains entirely.

So need to add `queryClient` prop to DataTableProps, pass it through DataTable to DetailModal.

Let me check DataTableProps in types/entity.ts to see what we need to add.

Actually let me just update the plan: Add `queryClient` to DataTableProps, pass it to DetailModal, DetailModal calls `invalidateQueries` after delete.

- [ ] **Step 1: Add queryClient to DataTableProps**

Find in `src/lib/types/entity.ts`:
```typescript
export interface DataTableProps {
  entityType: string
  columns: ColumnDef[]
  data: EntityRow[]
  sort: SortState | null
  isLoading: boolean
  selectedIds: Set<string>
  onSort: (sort: SortState | null) => void
  onRowSelect: (ids: Set<string>) => void
  onRowClick: (id: string, row: EntityRow) => void
  onEditClick?: (id: string, row: EntityRow) => void
  onDeleteClick?: (id: string, row: EntityRow) => void
}
```

We already removed `onEditClick` and `onDeleteClick` in Task 1. Add `queryClient`:
```typescript
import type { QueryClient } from '@tanstack/react-query'

export interface DataTableProps {
  entityType: string
  columns: ColumnDef[]
  data: EntityRow[]
  sort: SortState | null
  isLoading: boolean
  selectedIds: Set<string>
  onSort: (sort: SortState | null) => void
  onRowSelect: (ids: Set<string>) => void
  onRowClick: (id: string, row: EntityRow) => void
  queryClient: QueryClient
}
```

- [ ] **Step 2: Pass queryClient from DataTableShell to DataTable**

In DataTableShell, add `queryClient` to DataTable props (after isLoadingVariants):
```typescript
          <DataTable
            entityType={entityType}
            columns={columns}
            data={data}
            sort={sort}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSort={handleSort}
            onRowSelect={handleRowSelect}
            onRowClick={handleRowClick}
            queryClient={queryClient}
            ...
```

- [ ] **Step 3: Pass queryClient from DataTable to DetailModal**

In DataTable, pass queryClient to ProductDetailModal, WarehouseDetailModal, VariantDetailModal.

Find ProductDetailModal (lines 455-465):
```typescript
      {entityType === 'products' && selectedEntityId && (
        <ProductDetailModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          entityId={selectedEntityId}
          onDeleted={() => {
            setEditModalOpen(false)
            setSelectedEntityId(null)
          }}
        />
      )}
```

Change to:
```typescript
      {entityType === 'products' && selectedEntityId && (
        <ProductDetailModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          entityId={selectedEntityId}
          onDeleted={() => {
            setEditModalOpen(false)
            setSelectedEntityId(null)
            queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
          }}
        />
      )}
```

Same for WarehouseDetailModal and VariantDetailModal.

- [ ] **Step 4: Run TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/entity.ts src/components/entity/DataTable.tsx src/components/entity/DataTableShell.tsx
git commit -m "feat: pass queryClient through to DetailModal for delete invalidation"
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/entity/DataTable.tsx` | Remove actions column, remove onEditClick/onDeleteClick props, pass queryClient to DetailModal |
| `src/components/entity/DataTableShell.tsx` | Add queryClient prop, wire handleColumnSave with invalidation |
| `src/components/entity/EntityWorkspace.tsx` | Wire onFiltersApply, onSaveColumnPrefs, pass queryClient, use activeFilters in queryFn |
| `src/lib/types/entity.ts` | Add queryClient to DataTableProps |
| `src/components/entity/ProductDetailModal.tsx` | Call queryClient.invalidateQueries on onDeleted |
| `src/components/entity/WarehouseDetailModal.tsx` | Call queryClient.invalidateQueries on onDeleted |
| `src/components/entity/VariantDetailModal.tsx` | Call queryClient.invalidateQueries on onDeleted |

## Verification

After all tasks complete:
1. `pnpm run check:all` — TypeScript and lint pass
2. Delete a product/warehouse — table refetches and shows updated data
3. Apply a filter — table shows filtered results
4. Reorder columns in ColumnVisibilityDialog and save — columns persist and refetch happens
5. Click on a row name column — DetailModal opens with edit/delete inside