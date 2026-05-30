# Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect DataTableShell pagination to Rust backend for Warehouses and Products, add pagination footer to warehouse subtables

**Architecture:** TanStack Query for data fetching with pagination params, Rust SQL queries with LIMIT/OFFSET returning (data, total_count) tuples, custom hooks per entity

**Tech Stack:** TanStack Query v5, tauri-specta, Rust SQLx

---

## File Structure

| Layer | File | Responsibility |
|-------|------|----------------|
| Rust SQL | `src-tauri/src/sql/warehouses.rs` | LIMIT/OFFSET pagination for warehouses |
| Rust SQL | `src-tauri/src/sql/stocks.rs` | LIMIT/OFFSET pagination for products by warehouse |
| Rust Commands | `src-tauri/src/commands/warehouses.rs` | Paginated warehouse command |
| Rust Commands | `src-tauri/src/commands/stocks.rs` | Paginated product command |
| Bindings | `src/lib/bindings.ts` | specta generated types |
| Hook | `src/hooks/useWarehousesPagination.ts` | Paginated warehouse query |
| Hook | `src/hooks/useProductsByWarehouse.ts` | Paginated products by warehouse query |
| Component | `src/components/entity/DataTableShell.tsx` | Connect pagination to query |
| Component | `src/components/entity/WarehousesSubTable.tsx` | Add pagination footer |
| Types | `src/lib/types/entity.ts` | PaginatedResponse type |

---

## Task 1: Add PaginatedResponse Type

**Files:**
- Modify: `src/lib/types/entity.ts`

- [ ] **Step 1: Add PaginatedResponse type**

```typescript
// In src/lib/types/entity.ts, add after PaginationState:

export interface PaginatedResponse<T> {
  data: T[]
  totalCount: number
  totalPages: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/entity.ts
git commit -m "feat: add PaginatedResponse type"
```

---

## Task 2: Rust SQL - Warehouses Pagination

**Files:**
- Modify: `src-tauri/src/sql/warehouses.rs`

- [ ] **Step 1: Read current warehouse fetch function**

Find the function that fetches all warehouses (likely `fetch_all` or similar). Identify the SQL query string.

- [ ] **Step 2: Add limit/offset parameters and return total_count**

Replace the fetch function signature to accept `limit: Option<i64>`, `offset: Option<i64>` and return `(Vec<Warehouse>, i64)`:

```rust
pub async fn fetch_all(
    db: &Pool<Sqlite>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<(Vec<Warehouse>, i64), DbErr> {
    // Get total count
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM warehouses")
        .fetch_one(db)
        .await?;

    // Build query with LIMIT/OFFSET
    let query = match (limit, offset) {
        (Some(limit), Some(offset)) => {
            sqlx::query_as::<_, Warehouse>(
                "SELECT * FROM warehouses LIMIT ? OFFSET ?"
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
        }
        (Some(limit), None) => {
            sqlx::query_as::<_, Warehouse>(
                "SELECT * FROM warehouses LIMIT ?"
            )
            .bind(limit)
            .fetch_all(db)
        }
        _ => {
            sqlx::query_as::<_, Warehouse>("SELECT * FROM warehouses")
 .fetch_all(db)
        }
    };

    let warehouses = query.await?;
    Ok((warehouses, total))
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/warehouses.rs
git commit -m "feat: add LIMIT/OFFSET pagination to warehouses SQL"
```

---

## Task 3: Rust Commands - Warehouses Paginated

**Files:**
- Modify: `src-tauri/src/commands/warehouses.rs`

- [ ] **Step 1: Read current warehouses_get_all command**

Find `warehouses_get_all` function.

- [ ] **Step 2: Modify to support pagination params**

```rust
#[specta::command]
pub async fn warehouses_get_paginated(
    page: i64,
    page_size: i64,
) -> Result<PaginatedResponse<Warehouse>, String> {
    let offset = (page - 1) * page_size;
    let db = get_db();
    let (warehouses, total_count) = warehouses::fetch_all(&db, Some(page_size), Some(offset))
        .await
        .map_err(|e| e.to_string())?;

    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResponse {
        data: warehouses,
        total_count,
        total_pages,
    })
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/warehouses.rs
git commit -m "feat: add warehouses_get_paginated command"
```

---

## Task 4: Rust SQL - Products by Warehouse Pagination

**Files:**
- Modify: `src-tauri/src/sql/stocks.rs`

- [ ] **Step 1: Find products by warehouse function**

Find `fetch_products_by_warehouse_with_stock` or similar.

- [ ] **Step 2: Add LIMIT/OFFSET support**

Add limit/offset params and return total_count:

```rust
pub async fn fetch_products_by_warehouse_with_stock(
    db: &Pool<Sqlite>,
    warehouse_id: i64,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<(Vec<ProductWithStock>, i64), DbErr> {
    // Get total count
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM products p
         INNER JOIN stock_levels sl ON p.id = sl.product_id
         WHERE sl.warehouse_id = ?"
    )
    .bind(warehouse_id)
    .fetch_one(db)
    .await?;

    // Query with LIMIT/OFFSET
    let query = match (limit, offset) {
        (Some(limit), Some(offset)) => {
            sqlx::query_as::<_, ProductWithStock>(
                "SELECT p.id, p.name, p.sku, p.price, sl.quantity
 FROM products p
                 INNER JOIN stock_levels sl ON p.id = sl.product_id
                 WHERE sl.warehouse_id = ?
                 LIMIT ? OFFSET ?"
            )
            .bind(warehouse_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
        }
        _ => {
            sqlx::query_as::<_, ProductWithStock>(
                "SELECT p.id, p.name, p.sku, p.price, sl.quantity
                 FROM products p
                 INNER JOIN stock_levels sl ON p.id = sl.product_id
                 WHERE sl.warehouse_id = ?"
            )
            .bind(warehouse_id)
            .fetch_all(db)
        }
    };

    let products = query.await?;
    Ok((products, total))
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/stocks.rs
git commit -m "feat: add LIMIT/OFFSET pagination to products by warehouse SQL"
```

---

## Task 5: Rust Commands - Products by Warehouse Paginated

**Files:**
- Modify: `src-tauri/src/commands/stocks.rs`

- [ ] **Step 1: Find existing command**

Find `products_get_by_warehouse_with_stock`.

- [ ] **Step 2: Add paginated variant**

```rust
#[specta::command]
pub async fn products_get_by_warehouse_paginated(
    warehouse_id: i64,
    page: i64,
    page_size: i64,
) -> Result<PaginatedResponse<ProductWithStock>, String> {
    let offset = (page - 1) * page_size;
    let db = get_db();
    let (products, total_count) = stocks::fetch_products_by_warehouse_with_stock(
&db,
        warehouse_id,
        Some(page_size),
        Some(offset),
    )
    .await
    .map_err(|e| e.to_string())?;

    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResponse {
        data: products,
        total_count,
        total_pages,
    })
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/stocks.rs
git commit -m "feat: add products_get_by_warehouse_paginated command"
```

---

## Task 6: Update specta bindings

**Files:**
- Modify: `src/lib/bindings.ts` (regenerate via specta)

- [ ] **Step 1: Regenerate bindings**

```bash
cd /mnt/C/Accountant-SaaS && pnpm specta
```

- [ ] **Step 2: Verify PaginatedResponse is generated**

Check that `PaginatedResponse<Warehouse>` and `PaginatedResponse<ProductWithStock>` types exist.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bindings.ts
git commit -m "feat: regenerate specta bindings with paginated commands"
```

---

## Task 7: Create useWarehousesPagination hook

**Files:**
- Create: `src/hooks/useWarehousesPagination.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function useWarehousesPagination(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['warehouses', 'paginated', { page, pageSize }],
    queryFn: async () => {
      const result = await commands.warehousesGetPaginated(page, pageSize)
      if (result.status === 'ok') {
        return result.data
      }
      throw new Error(result.error)
    },
    placeholderData: (prev) => prev,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWarehousesPagination.ts
git commit -m "feat: add useWarehousesPagination hook"
```

---

## Task 8: Create useProductsByWarehouse hook

**Files:**
- Modify: `src/hooks/useProductsByWarehouse.ts` (or create if doesn't exist)

- [ ] **Step 1: Write/update the hook**

```typescript
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function useProductsByWarehouse(
  warehouseId: number,
  page: number,
  pageSize: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['products', 'warehouse', warehouseId, { page, pageSize }],
    queryFn: async () => {
      const result = await commands.productsGetByWarehousePaginated(
        warehouseId,
        page,
        pageSize
      )
      if (result.status === 'ok') {
        return result.data
      }
      throw new Error(result.error)
    },
    enabled,
    placeholderData: (prev) => prev,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useProductsByWarehouse.ts
git commit -m "feat: add pagination support to useProductsByWarehouse hook"
```

---

## Task 9: Update DataTableShell

**Files:**
- Modify: `src/components/entity/DataTableShell.tsx`

- [ ] **Step 1: Read current DataTableShell**

Focus on lines 95-97 (`handlePageChange`) and lines 156-161 (PaginationFooter usage).

- [ ] **Step 2: Update handlePageChange to trigger refetch**

Replace local state update with prop callback:

```typescript
// Remove local pagination state
// const [paginationState, setPaginationState] = useState<PaginationState>(...)

// Update handlePageChange
const handlePageChange = useCallback((page: number, pageSize: number) => {
  onPageChange?.(page, pageSize)
}, [onPageChange])

// Update paginationState to come from props
const paginationState: PaginationState = {
  page: pagination?.page ?? 1,
  pageSize: pagination?.pageSize ?? 10,
  totalRows: pagination?.totalRows ?? 0,
  totalPages: pagination?.totalPages ?? 1,
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat: wire DataTableShell pagination to onPageChange callback"
```

---

## Task 10: Update WarehousesSubTable with PaginationFooter

**Files:**
- Modify: `src/components/entity/WarehousesSubTable.tsx`

- [ ] **Step 1: Read current WarehousesSubTable**

Find where products are rendered after warehouse expansion.

- [ ] **Step 2: Add pagination state and PaginationFooter**

```typescript
const [productPagination, setProductPagination] = useState({
  page: 1,
  pageSize: 10,
  totalRows: 0,
  totalPages: 1,
})

// In handleWarehouseExpand, reset pagination
const handleWarehouseExpand = useCallback(async (warehouseId: number) => {
  if (expandedWarehouses.has(warehouseId)) {
    setExpandedWarehouses(prev => {
      const next = new Set(prev)
      next.delete(warehouseId)
      return next
    })
  } else {
    setExpandedWarehouses(prev => new Set(prev).add(warehouseId))
    setProductPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1
  }
}, [expandedWarehouses])

// Add handleProductPageChange
const handleProductPageChange = useCallback((page: number, pageSize: number) => {
  setProductPagination(prev => ({ ...prev, page, pageSize }))
}, [])

// Add PaginationFooter after product list
{expandedWarehouses.has(warehouse.id) && (
  <PaginationFooter
    pagination={productPagination}
    onPageChange={handleProductPageChange}
    isLoading={isLoadingProducts}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/WarehousesSubTable.tsx
git commit -m "feat: add PaginationFooter to WarehousesSubTable"
```

---

## Task 11: Run check:all

- [ ] **Step 1: Run quality checks**

```bash
pnpm run check:all
```

- [ ] **Step 2: Fix any issues**

Address linting, type errors, or test failures.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: address check:all issues"
```

---

## Spec Coverage Check

- [x] Warehouses main table pagination → Task 3, 7
- [x] Products by warehouse pagination → Task 5, 8
- [x] Page size options (10/25/50/100) → PaginationFooter already supports, passes through
- [x] Rust LIMIT/OFFSET → Task 2, 4
- [x] DataTableShell onPageChange → Task 9
- [x] WarehousesSubTable PaginationFooter → Task 10
- [x] Error handling → TanStack Query handles errors automatically
- [x] Empty page handling → TanStack Query `placeholderData` keeps previous data visible

**No gaps found.**
