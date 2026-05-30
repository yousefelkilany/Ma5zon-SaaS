# Stock Levels UI Design

## Overview

Two read-only UI surfaces for viewing stock levels:
1. **WarehousesSubTable** — expandable rows in the Warehouses DataTable
2. **Stock Tab** — new tab in VariantDetailModal and ProductDetailModal

## Data Loading

Lazy loading: data fetched on expand (warehouse) or on tab activation (modals).

## Backend Changes

### New SQL Query

**`src-tauri/src/sql/stocks.rs`** — new query for product stock with variant names:

```sql
pub fn get_stock_levels_by_product() -> &'static str {
    "SELECT
        v.id AS variant_id,
        v.variant_name,
        v.sku,
        COALESCE(s.warehouse_id, 0) AS warehouse_id,
        COALESCE(s.quantity, 0) AS current_qty
     FROM product_variants v
     LEFT JOIN stock_levels s ON v.id = s.variant_id
     WHERE v.product_id = ?1
     ORDER BY v.variant_name"
}
```

**`src-tauri/src/sql/stocks.rs`** — existing query modified for warehouse stock with variant names:

```sql
pub fn get_levels_by_warehouse_with_names() -> &'static str {
    "SELECT
        v.id AS variant_id,
        v.variant_name,
        v.sku,
        COALESCE(s.warehouse_id, 0) AS warehouse_id,
        COALESCE(s.quantity, 0) AS current_qty
     FROM product_variants v
     LEFT JOIN stock_levels s ON v.id = s.variant_id AND s.warehouse_id = ?1
     ORDER BY v.variant_name"
}
```

### New/Modified Rust Commands

**`src-tauri/src/commands/stocks.rs`**:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockLevelWithVariant {
    pub variant_id: String,
    pub variant_name: String,
    pub sku: String,
    pub warehouse_id: String,
    pub quantity: f64,
}

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_product(
    app: AppHandle,
    product_id: String,
) -> Result<Vec<StockLevelWithVariant>, String>

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_warehouse_with_names(
    app: AppHandle,
    warehouse_id: String,
) -> Result<Vec<StockLevelWithVariant>, String>
```

Existing `stock_levels_get_by_variant` remains unchanged for single-variant queries.

## Frontend Components

### New Components

**`src/components/entity/WarehousesSubTable.tsx`**

Mirrors `VariantsSubTable` pattern.

Props:
```typescript
interface WarehousesSubTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  warehouseId: string
}
```

Columns: Variant Name | SKU | Quantity (all read-only, no add/edit/delete)

**`src/components/entity/StockLevelsTable.tsx`**

Reusable stock table component for modal tabs.

Props:
```typescript
interface StockLevelsTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  view: 'variant' | 'product'
}
```

- `variant` view: Warehouse Name | Quantity (flat list, one variant)
- `product` view: Pivot — rows=variants, columns=warehouses, cells=quantity, footer=column sums

### Modified Components

**`src/components/entity/DataTable.tsx`**

- Expand column now renders for `entityType === 'warehouses'` AND `entityType === 'products'`
- New props passed through:
  ```typescript
  stockLevelsCache?: Map<string, StockLevelWithVariant[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingStockLevels?: (id: string) => boolean
  ```
- When `expandedRowIds` contains a warehouse id and entityType is 'warehouses', renders `WarehousesSubTable` instead of `VariantsSubTable`

**`src/components/entity/DataTableShell.tsx`**

- Passes through new DataTable props

**`src/components/entity/EntityWorkspace.tsx`**

- New state: `stockLevelsCache` (Map<string, StockLevelWithVariant[]>) and `loadingStockLevels` (Set<string>)
- `handleRowToggleExpand` extended: when expanding a warehouse, fetches `stock_levels_get_by_warehouse_with_names(warehouse_id)` if not cached
- Passes new props to DataTableShell

**`src/components/entity/VariantDetailModal.tsx`**

- New tab: `stock`
- On tab activation: fetches `stock_levels_get_by_variant(entityId)`
- Renders `StockLevelsTable` with `view: 'variant'`

**`src/components/entity/ProductDetailModal.tsx`**

- New tab: `stock`
- On tab activation: fetches `stock_levels_get_by_product(entityId)`
- Renders `StockLevelsTable` with `view: 'product'` (pivot table with column sums)

## Data Flow

```
EntityWorkspace
  ├── expandedIds: Set<string>
  ├── stockLevelsCache: Map<warehouseId, StockLevelWithVariant[]>
  ├── loadingStockLevels: Set<warehouseId>
  │
  └── DataTableShell (passes through)
        └── DataTable
              ├── products → VariantsSubTable (existing)
              └── warehouses → WarehousesSubTable (new)
                                └── fetches stock_levels_get_by_warehouse_with_names

VariantDetailModal
  └── Stock tab → stock_levels_get_by_variant → StockLevelsTable (variant view)

ProductDetailModal
  └── Stock tab → stock_levels_get_by_product → StockLevelsTable (product view, pivot)
```

## Pivot Table Behavior (Product Stock Tab)

Input rows: `variant_id | variant_name | sku | warehouse_id | current_qty`

Pivot to:
| Variant | Warehouse 1 | Warehouse 2 | Warehouse N | Total |
|---------|-------------|-------------|-------------|-------|
| Variant A | 100 | 50 | — | 150 |
| Variant B | — | 75 | 200 | 275 |
| **Total** | **100** | **125** | **200** | **425** |

- Variants become rows
- Each unique warehouse becomes a column
- Missing stock = empty cell (or 0 depending on preference)
- Last row = column sums (total per warehouse)
- Last column = row sums (total per variant)

## Type Definitions

**`src/lib/types/entity.ts`** — add:

```typescript
interface StockLevelWithVariant {
  variant_id: string
  variant_name: string
  sku: string
  warehouse_id: string
  quantity: number
}
```

## Implementation Order

1. Backend: Add SQL query + Rust command for `stock_levels_get_by_product`
2. Backend: Add SQL query + Rust command for `stock_levels_get_by_warehouse_with_names`
3. Frontend: Add `StockLevelWithVariant` type
4. Frontend: Create `StockLevelsTable.tsx` component
5. Frontend: Create `WarehousesSubTable.tsx` component
6. Frontend: Extend `DataTable` with warehouse expand
7. Frontend: Extend `EntityWorkspace` with stock cache state and fetch logic
8. Frontend: Add stock tab to `VariantDetailModal`
9. Frontend: Add stock tab to `ProductDetailModal` with pivot rendering
