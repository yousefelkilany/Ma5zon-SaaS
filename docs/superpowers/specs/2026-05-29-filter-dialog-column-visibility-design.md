# FilterDialog Fix + ColumnVisibilityDialog Drag-to-Reorder + Rust Filter/Column Support

## 1. Overview

Fix FilterDialog bug, add drag-to-reorder to ColumnVisibilityDialog, and extend existing Rust commands (`getAll`, `warehousesGetAll`) to accept filter and column parameters so filtering/column selection propagates to SQL queries.

## 2. Component Changes

### 2.1 FilterDialog Fix

**Files:** `src/components/entity/FilterDialog.tsx`

**Problem 1:** `handleApply` passes `filters` prop instead of `localFilters`:
```typescript
// BEFORE (buggy)
const handleApply = () => {
  onApply(filters)  // ❌ uses prop, ignores local state
  onOpenChange(false)
}
```

**Problem 2:** `localFilters` initializes as empty `{}` but should sync from `filters` prop when dialog opens.

**Changes:**
1. Add `useEffect` to initialize `localFilters` from `filters` prop when dialog opens:
```typescript
useEffect(() => {
  if (open) {
    const initialized: Record<string, string | string[] | { min?: string; max?: string }> = {}
    filters.forEach(f => {
      initialized[f.columnId] = f.value as string | string[] | { min?: string; max?: string }
    })
    setLocalFilters(initialized)
  }
}, [open, filters])
```

2. `handleApply` converts `localFilters` to `FilterState[]` and calls `onApply`:
```typescript
const handleApply = () => {
  const appliedFilters: FilterState[] = Object.entries(localFilters)
    .filter(([_, v]) => v !== '' && (Array.isArray(v) ? v.length > 0 : true))
    .map(([columnId, value]) => {
      if (typeof value === 'string') {
        return { columnId, operator: 'contains' as const, value }
      } else if (Array.isArray(value)) {
        return { columnId, operator: 'eq' as const, value }
      } else {
        return { columnId, operator: 'between' as const, value: [value.min ?? '', value.max ?? ''] }
      }
    })
  onApply(appliedFilters)
  onOpenChange(false)
}
```

**Key behavior:**
- `handleClearAll` calls `onApply([])` and closes dialog
- `handleApply` converts local state to FilterState format, closes dialog
- Dialog does NOT auto-apply on open — waits for user confirmation

### 2.2 ColumnVisibilityDialog Drag-to-Reorder

**Files:** `src/components/entity/ColumnVisibilityDialog.tsx`

**Dependencies:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Behavior:** Each column row has a drag handle (GripVertical icon). Dragging a column updates its `order` in `localColumns`. On save, `onSave(localColumns)` is called with updated order.

**Drag implementation:**
- `DndContext` wraps the sortable list
- `SortableContext` with `verticalListSortingStrategy`
- Each row uses `useSortable(col.id)` hook
- `DragOverlay` renders the dragged item with stack-shadow elevation (8px blur, 50% opacity black shadow)
- On `onDragEnd`, call `arrayMove` to reorder `localColumns`, then update `order` property for each column

**Visual:**
- Drag handle: `cursor-grab`, `cursor grabbing` while dragging
- Drag preview: elevated card with shadow, same content as original row
- Drop zone: other items shift up/down as draggable moves

**State update on drag end:**
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event
  if (over && active.id !== over.id) {
    const oldIndex = localColumns.findIndex(c => c.id === active.id)
    const newIndex = localColumns.findIndex(c => c.id === over.id)
    const reordered = arrayMove(localColumns, oldIndex, newIndex)
    setLocalColumns(reordered.map((col, idx) => ({ ...col, order: idx })))
  }
}
```

### 2.3 DataTableShell Cleanup

**Files:** `src/components/entity/DataTableShell.tsx`

Since FilterDialog and ColumnVisibilityDialog are staying in DataTableShell (not moving to DataTable per user decision), no structural changes needed for dialog placement.

**Minor:** Remove unused `filters` state initialization comment if no longer needed, ensure `onFiltersApply` callback properly triggers re-fetch in parent.

## 3. Rust Command Updates

### 3.1 New FilterState Rust Type

**File:** Add to relevant Rust command module

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct FilterState {
    pub column_id: String,
    pub operator: String, // "eq" | "neq" | "contains" | "gt" | "lt" | "gte" | "lte" | "between"
    pub value: serde_json::Value,
}
```

### 3.2 SQL Generation for Filters

Build WHERE clause from `filters`:
- `eq` → `column_id = value`
- `neq` → `column_id != value`
- `contains` → `column_id LIKE '%value%'`
- `gt` / `gte` / `lt` / `lte` → `column_id >/>=/</<= value`
- `between` → `column_id BETWEEN value[0] AND value[1]`

Status filter special case: if `operator` is `eq` and `value` is array (multiple statuses), use `column_id IN ('paid', 'overdue')`.

### 3.3 Column Selection

- If `columns` parameter is empty → `SELECT *`
- If non-empty → `SELECT column1, column2, ...`

### 3.4 Updated Command Signatures

```rust
// Products
#[tauri::command]
pub async fn get_all(
    filters: Vec<FilterState>,
    columns: Vec<String>,
) -> Result<Vec<Product>, String> {
    // Build query with WHERE from filters, SELECT from columns
    // Empty filters = no WHERE clause
    // Empty columns = SELECT *
}
```

```rust
// Warehouses
#[tauri::command]
pub async fn warehouses_get_all(
    filters: Vec<FilterState>,
    columns: Vec<String>,
) -> Result<Vec<Warehouse>, String> {
    // Same pattern
}
```

## 4. Files to Modify

| File | Change |
|------|--------|
| `src/components/entity/FilterDialog.tsx` | Fix handleApply, add useEffect for initial sync |
| `src/components/entity/ColumnVisibilityDialog.tsx` | Add @dnd-kit drag-to-reorder |
| `src/lib/types/entity.ts` | FilterState already exists, no change needed |
| Rust command module | Add FilterState type, update getAll/warehousesGetAll signatures |

## 5. Data Flow Summary

```
User clicks "Apply" in FilterDialog
  → handleApply converts localFilters → FilterState[]
  → onFiltersApply(filters) callback fired
  → EntityWorkspace re-fetches with filters
  → getAll(filters, columns) called in Rust
  → SQL generated with WHERE clause from filters
  → Results returned and table re-renders
```

## 6. Edge Cases

- **Empty filters** → no WHERE clause, return all rows
- **Empty columns** → SELECT *, return all columns
- **Invalid filter operator** → return error or ignore filter
- **Column not in table** → ignore in SELECT, no error
- **Filter on hidden column** → still apply filter (filters work on data, not UI)