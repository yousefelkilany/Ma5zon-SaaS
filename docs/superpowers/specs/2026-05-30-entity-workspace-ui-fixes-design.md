# Entity Workspace UI Fixes + Delete Refresh Spec

## 1. Overview

Fix delete not refreshing UI, wire callbacks properly, remove the actions column (edit/delete icons), and rely solely on clicking name column to open DetailModal.

## 2. Current Problems

### 2.1 Delete Not Triggering UI Refresh

**Root cause:** `DataTableShell` defines `handleEditClick` and `handleDeleteClick` (lines 97-110) but **never passes them** to `DataTable`. The `onEditClick` and `onDeleteClick` props exist in `DataTableProps` but DataTableShell doesn't wire them.

**Flow:**

1. User clicks delete icon → `handleDeleteClick` fires → `ConfirmationDialog` shows
2. User confirms delete → `onDeleteClick?.(selectedEntityId, selectedRow)` fires
3. But `onDeleteClick` is never provided by DataTableShell, so nothing happens
4. UI shows stale data until manual refresh

### 2.2 Actions Column Still Exists

The code has `_actionsColumn` in `DataTable` (lines 171-218) that renders edit/delete pencil icons on hover. User wants this removed entirely.

### 2.3 Callbacks Not Wired

- `onFiltersApply={x => x}` is a no-op — filters never propagate to Rust
- `onSaveColumnPrefs={x => x}` is a no-op — column preferences aren't saved

## 3. Desired Behavior

### 3.1 Row Click Opens DetailModal

- Clicking **name column** (the `isNameColumn` column) opens the DetailModal
- DetailModal contains **edit and delete** functionality inside it
- No actions column, no pencil icons, no hover-reveal buttons

### 3.2 Delete Triggers Refetch

- When delete is confirmed in `ConfirmationDialog`, after successful deletion, `queryClient.invalidateQueries(['entity', entityType])` is called
- Table re-fetches and shows updated data

### 3.3 Filters Propagate to Rust

- When `FilterDialog` applies filters, `onFiltersApply(filters)` is called
- EntityWorkspace passes these filters to the queryFn
- Rust builds WHERE clause from filters

### 3.4 Column Preferences Persist

- When `ColumnVisibilityDialog` saves, `onSaveColumnPrefs(columns)` is called
- EntityWorkspace saves to localStorage and invalidates query to refetch with new column order

## 4. Component Architecture After Changes

```
EntityWorkspace
├── useQuery (['entity', entityType], fetches with filters)
├── queryClient.invalidateQueries on delete/save
├── DataTableShell
│   ├── Toolbar (search, filters button, columns button, export)
│   ├── DataTable
│   │   ├── select column (checkbox, kept)
│   │   ├── expand column (chevron, kept for products)
│   │   ├── visible data columns (sorted by order)
│   │   └── NO actions column (removed)
│   ├── PaginationFooter
│   ├── FilterDialog → onFiltersApply → query refetch
│   └── ColumnVisibilityDialog → onSaveColumnPrefs → localStorage + refetch
```

## 5. Specific Changes

### 5.1 DataTable: Remove Actions Column

**File:** `src/components/entity/DataTable.tsx`

- Remove `_actionsColumn` useMemo (lines 171-218)
- Remove `_actionsColumn` from `tableColumns` array (line 237)
- Remove `onEditClick` and `onDeleteClick` from `DataTableProps` — no longer needed since we're not using row-level edit/delete buttons

**Result:** `tableColumns` becomes:

```typescript
const tableColumns = useMemo<TanstackColumnDef<EntityRow>[]>(() => {
  const cols: TanstackColumnDef<EntityRow>[] = [selectColumn]
  if (entityType === 'products') cols.push(expandColumn)
  cols.push(
    ...visibleColumns.map((col, idx) => ({
      id: col.id,
      accessorKey: col.id,
      header: col.label,
      size: col.width,
      enableSorting: col.sortable,
      enableResizing: idx + 1 != visibleColumns.length,
      cell: ({ getValue }: { getValue: () => unknown }) => (
        <DataCell column={col} value={getValue()} />
      ),
    }))
  )
  return cols
}, [selectColumn, expandColumn, entityType, visibleColumns])
```

Note: No more `onEditClick` or `onDeleteClick` props on DataTable.

### 5.2 DataTable: Keep Only Row Click for Name Column

**File:** `src/components/entity/DataTable.tsx`

- Keep the `onRowClick` callback for name column only
- Remove any other click handlers that aren't on the name column
- The `onRowClick` already opens the DetailModal (lines 426-428)

### 5.3 DataTableShell: Wire onRowClick to Open DetailModal

**File:** `src/components/entity/DataTableShell.tsx`

Currently `handleRowClick` is a no-op:

```typescript
const handleRowClick = useCallback((_id: string) => {
  // Row click handling is done in DataTable with typed modals
}, [])
```

This needs to be removed since DataTable handles it directly. But wait — DataTable renders its own modals (ProductDetailModal, WarehouseDetailModal, VariantDetailModal). The parent doesn't need to do anything.

So the current architecture is:

- `DataTable` handles `onRowClick` to open DetailModal
- DetailModal has edit/delete inside it

This is already correct for products/warehouses/variants. The issue is that `onRowClick` is only fired for the **name column** (line 426-428). Need to verify this is the case.

### 5.4 DataTableShell: Pass onRowClick to DataTable

**File:** `src/components/entity/DataTableShell.tsx`

The `handleRowClick` no-op doesn't need to change — DataTable handles the click directly via the `isNameColumn` check. But DataTableShell needs to ensure `onRowClick` is NOT passed since DataTable manages its own modals internally.

Actually looking at the code again: DataTable renders its own modals (ProductDetailModal, etc.) at lines 455-487. The `onRowClick` in DataTable is only used for the name column click handler (lines 426-428). So DataTableShell doesn't need to do anything for this.

### 5.5 EntityWorkspace: Handle Delete with Query Invalidation

**File:** `src/components/entity/EntityWorkspace.tsx`

Add `onDelete` callback to DataTableShell props. The flow:

1. User clicks row name → DataTable opens DetailModal
2. User clicks delete inside modal → ConfirmationDialog shows
3. User confirms → delete command fires → `onDeleted` callback fires
4. `onDeleted` → EntityWorkspace calls `queryClient.invalidateQueries(['entity', entityType])`
5. Table refetches, UI updates

So the DataTable's `onDeleted` callback (passed to DetailModal) should trigger a query invalidation in EntityWorkspace.

Looking at DataTable lines 460-463:

```typescript
onDeleted={() => {
  setEditModalOpen(false)
  setSelectedEntityId(null)
}}
```

This only closes the modal — it doesn't trigger any refresh. The DetailModal's `handleDelete` (lines 168 for Variant, similar for Product/Warehouse) calls the delete command and then calls `onDeleted`.

So the fix is:

1. EntityWorkspace passes an `onDeleted` callback to DataTableShell
2. DataTableShell passes it to DataTable
3. DataTable's `onDeleted` (in DetailModal) calls the parent callback
4. EntityWorkspace's `onDeleted` calls `queryClient.invalidateQueries`

Actually simpler: just pass `queryClient` to DataTableShell via context, or add `onDeleteSuccess` callback chain.

**Simplest approach**: Add callback prop `onEntityDeleted` that EntityWorkspace sets to call `queryClient.invalidateQueries`. DataTableShell passes it to DataTable. DataTable calls it after delete succeeds.

### 5.6 Wire onFiltersApply

**File:** `src/components/entity/EntityWorkspace.tsx`

Currently:

```typescript
onFiltersApply={x => x}
```

Change to:

```typescript
onFiltersApply={(filters) => {
  // Trigger refetch with filters — TanStack Query key includes filters
  // Need to update queryKey to include filters, or use queryClient.setQueryData
}}
```

The cleanest approach: add `filters` to the queryKey:

```typescript
const {
  data: entityData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['entity', entityType, { filters }],
  queryFn: async () => {
    // pass filters to commands.getAll([], []) → commands.getAll(filters, [])
  },
})
```

But this requires changing the command signature to accept filters. We're already passing `filters: []` — the Rust command accepts filters but we're always passing empty.

So the fix: when `onFiltersApply` is called, store filters in state and include in queryKey. Refetch happens automatically.

### 5.7 Wire onSaveColumnPrefs

**File:** `src/components/entity/EntityWorkspace.tsx`

Save to localStorage and refetch:

```typescript
onSaveColumnPrefs={(columns) => {
  localStorage.setItem(`columns_${entityType}`, JSON.stringify(columns))
  queryClient.invalidateQueries(['entity', entityType])
}}
```

## 6. Files to Modify

| File                                        | Change                                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/entity/DataTable.tsx`       | Remove `_actionsColumn`, remove `onEditClick`/`onDeleteClick` props                                                                          |
| `src/components/entity/DataTableShell.tsx`  | Pass `onEntityDeleted` callback chain, remove unused `handleEditClick`/`handleDeleteClick`                                                   |
| `src/components/entity/EntityWorkspace.tsx` | Add `onEntityDeleted` → `queryClient.invalidateQueries`, wire `onFiltersApply` with filter state, wire `onSaveColumnPrefs` with localStorage |

## 7. Data Flow Summary

### Delete Flow

```
User clicks row name → DataTable opens DetailModal
User clicks delete in modal → ConfirmationDialog shows
User confirms → delete command fires → onDeleted callback
→ EntityWorkspace receives callback → queryClient.invalidateQueries
→ Table re-fetches with fresh data
```

### Filter Flow

```
User clicks filter button → FilterDialog opens
User sets filters, clicks Apply → onFiltersApply(filters)
→ EntityWorkspace stores filters, updates queryKey
→ useQuery triggers refetch with new filters
→ Rust builds WHERE clause from filters → filtered results returned
```

### Column Preference Flow

```
User clicks columns button → ColumnVisibilityDialog opens
User reorders/hides columns, clicks Save → onSaveColumnPrefs(columns)
→ EntityWorkspace saves to localStorage
→ queryClient.invalidateQueries
→ Table re-fetches with new column visibility
```

## 8. Edge Cases

- **Delete last item on page**: After invalidation, page should show empty state (handled by TanStack Query)
- **Filter with no results**: Table shows "no results" message (handled by empty data render)
- **Column reorder**: Order stored in `localColumns[i].order` — on save, this is persisted
- **Filter on non-visible column**: Filters apply to data, not UI — hidden columns still get filtered if filter targets them
