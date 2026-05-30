# Pagination Design Spec

## Overview

Connect DataTableShell pagination to Rust backend for Warehouses and Products entities. Add pagination footer to warehouse subtables for products.

## Requirements

- **Entities**: Warehouses (main table), Products (main table + warehouse subtable)
- **Page size options**: 10, 25, 50, 100 (default: 10)
- **Rust changes**: Modify existing commands to support LIMIT/OFFSET and return total_count
- **Subtable**: Add PaginationFooter to WarehousesSubTable for products

## Architecture

### Rust Layer

**SQL Changes** (`src-tauri/src/sql/warehouses.rs`, `src-tauri/src/sql/stocks.rs`):

- Add `limit: Option<i64>`, `offset: Option<i64>` parameters to fetch functions
- Return `(Vec<T>, i64)` tuple with data and total count
- Default `limit: None` returns all (backward compatible)

**Command Changes**:

- `warehouses_get_all` → `warehouses_get_paginated(limit, offset)` → returns `(Vec<Warehouse>, i64)`
- `products_get_by_warehouse_with_stock` → add pagination params for warehouse-level product fetch

### Frontend Hooks

**`useWarehousesPagination(page, pageSize)`**:

- TanStack Query hook fetching paginated warehouses
- Query key: `['warehouses', 'paginated', { page, pageSize }]`
- Returns `{ data, totalCount, totalPages, isLoading }`

**`useProductsByWarehouse(warehouseId, page, pageSize)`**:

- Fetches products for a specific warehouse with pagination
- Query key: `['products', 'warehouse', warehouseId, { page, pageSize }]`

### DataTableShell Changes

**Current** (broken):

```typescript
const handlePageChange = useCallback((page: number, pageSize: number) => {
  setPaginationState(prev => ({ ...prev, page, pageSize }))
}, [])
```

**Fixed**:

- Accept `onPageChange` that triggers data refetch via query invalidation
- Accept `totalRows` and `totalPages` from server response
- Remove local pagination state (derive from query data)

### WarehousesSubTable Changes

**Layout**:

```
[Warehouse Row - expanded]
 ├── [Product Row 1]
  ├── [Product Row 2]
  └── [PaginationFooter] ← NEW
```

- Add `PaginationFooter` below product rows
- Pass warehouse-level pagination state to fetch hook
- Show loading indicator during fetch

## Data Flow

1. User clicks page change → `handlePageChange(page, pageSize)`
2. Query key changes → TanStack Query triggers refetch
3. Rust receives `LIMIT ? OFFSET ?` → returns page + total_count
4. Frontend updates `paginationState` with server totals
5. Table re-renders with new page

## Files to Modify

| Layer         | File                                           |
| ------------- | ---------------------------------------------- |
| Rust SQL      | `src-tauri/src/sql/warehouses.rs`              |
| Rust SQL      | `src-tauri/src/sql/stocks.rs`                  |
| Rust Commands | `src-tauri/src/commands/warehouses.rs`         |
| Rust Commands | `src-tauri/src/commands/stocks.rs`             |
| Bindings      | `src/lib/bindings.ts` (specta)                 |
| Hooks         | `src/hooks/useWarehousesPagination.ts` (new)   |
| Hooks         | `src/hooks/useProductsByWarehouse.ts` (modify) |
| Component     | `src/components/entity/DataTableShell.tsx`     |
| Component     | `src/components/entity/WarehousesSubTable.tsx` |
| Types         | `src/lib/types/entity.ts`                      |

## Error Handling

- Rust returns error → TanStack Query error state → show error toast
- Empty page (page > totalPages) → auto-correct to last page
- Network failure → retry with exponential backoff

## Testing

- Unit tests for Rust SQL LIMIT/OFFSET logic
- Integration tests for query refetch on page change
- Verify subtable pagination doesn't affect main table pagination
