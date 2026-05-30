# Entity Table Sorting - Implementation Spec

## Overview

Add single-column sorting functionality to the entity data table (products and warehouses). Sorting is user-initiated via column header buttons, propagates to the backend for SQL-level ordering, and triggers data refetch.

## Backend Changes

### New Type (`src-tauri/src/types.rs`)

```rust
pub struct SortState {
    pub column_id: String,
    pub direction: String,  // "asc" | "desc"
}
```

### SQL Builder Changes

Modify `build_get_all` to accept optional `SortState`:

**`src-tauri/src/sql/products.rs`**

```rust
pub fn build_get_all(where_clause: &str, sort: Option<&SortState>) -> String {
    let base = "SELECT id, company, name, category, created_at, updated_at, deleted_at FROM active_products";
    let mut query = if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{base} WHERE {where_clause}")
    };

    match sort {
        Some(s) => {
            query = format!("{query} ORDER BY {} {}", s.column_id, s.direction);
        }
        None => {
            query = format!("{query} ORDER BY name");
        }
    }
    query
}
```

**`src-tauri/src/sql/warehouses.rs`** - same pattern for warehouse columns (id, name, location, created_at, updated_at).

### Command Signature Changes

Add `sort: Option<SortState>` parameter after `columns`:

**`src-tauri/src/commands/products.rs`**:

```rust
#[tauri::command]
#[specta::specta]
pub async fn get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    columns: Vec<String>,
    sort: Option<SortState>,
) -> Result<Vec<Product>, String>
```

**`src-tauri/src/commands/warehouses.rs`**:

```rust
#[tauri::command]
#[specta::specta]
pub async fn warehouses_get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    columns: Vec<String>,
    sort: Option<SortState>,
) -> Result<Vec<Warehouse>, String>
```

## Frontend Changes

### New Binding Type (`src/lib/types/entity.ts`)

```typescript
export interface BindingSortState {
  column_id: string
  direction: 'asc' | 'desc'
}
```

### DataTableShell Changes (`src/components/entity/DataTableShell.tsx`)

1. Add `onSortChange: (sort: SortState | null) => void` to props interface
2. Pass current `sort` state to parent via `onSortChange` when sort changes
3. Rename internal handler from `handleSort` to `handleSortChange` for consistency

### EntityWorkspace Changes (`src/components/entity/EntityWorkspace.tsx`)

1. Add `sort` state: `const [sort, setSort] = useState<SortState | null>(null)`
2. Add `onSortChange` handler to update sort state
3. Pass `sort` to `DataTableShell` prop
4. Add `sort` to query key: `['entity', entityType, activeFilters, sort]`
5. Pass `sort` to command calls:
   ```typescript
   const result = await commands.getAll(bindingFilters, [], sort)
   ```

## Data Flow

1. User clicks sort button on column header
2. `DataTable.handleSortChange` (line 229) updates sort state and calls `props.onSort`
3. `DataTableShell.handleSortChange` calls `onSortChange(sort)` to propagate upward
4. `EntityWorkspace` state updates, triggering `useQuery` refetch
5. Query function passes `BindingSortState` to backend command
6. Backend validates column against whitelist, builds SQL with `ORDER BY`
7. Sorted data returns and updates table

## Files to Modify

| File                                        | Changes                                |
| ------------------------------------------- | -------------------------------------- |
| `src-tauri/src/types.rs`                    | Add `SortState` struct                 |
| `src-tauri/src/sql/products.rs`             | Modify `build_get_all` signature + SQL |
| `src-tauri/src/sql/warehouses.rs`           | Same pattern                           |
| `src-tauri/src/commands/products.rs`        | Add `sort` param to `get_all`          |
| `src-tauri/src/commands/warehouses.rs`      | Add `sort` param to `warehousesGetAll` |
| `src/lib/types/entity.ts`                   | Add `BindingSortState` interface       |
| `src/components/entity/DataTableShell.tsx`  | Add sort prop + onSortChange callback  |
| `src/components/entity/EntityWorkspace.tsx` | Wire sort state into query             |

## Sort Validation

Backend validates `column_id` against allowed columns:

- Products: `id`, `company`, `name`, `category`, `created_at`, `updated_at`
- Warehouses: `id`, `name`, `location`, `created_at`, `updated_at`

Invalid columns fall back to default sort (by `name`).

## Default Behavior

When `sort` is `None`/`null`, queries default to `ORDER BY name ASC`.
