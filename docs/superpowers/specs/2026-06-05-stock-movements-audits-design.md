# Stock Movements Audits Tab - Implementation Design

**Date**: 2026-06-05
**Status**: Approved

---

## 1. Overview

Implement stock movement audit displays across three modal detail views (Variant, Product, Warehouse), each with distinct data requirements and display patterns.

---

## 2. Database Schema Changes

### 2.1 Add product_id to stock_movements

```sql
ALTER TABLE stock_movements ADD COLUMN product_id INTEGER NOT NULL;
```

### 2.2 Backfill Script

Create a one-time migration script to populate `product_id` for existing records by joining through `product_variants`:

```sql
UPDATE stock_movements
SET product_id = (
    SELECT pv.product_id
    FROM product_variants pv
    WHERE pv.id = stock_movements.variant_id
);
```

### 2.3 Seed Script Update

Update `src-tauri/src/seed/movements.rs`:

- `execute_movement` now accepts `product_id` parameter
- Pass product_id from variant context when seeding

---

## 3. API / Rust Changes

### 3.1 New Command: Get Movements by Warehouse

**Command**: `stock_movements_get_by_warehouse(warehouse_id: String)`

**Returns**: All stock movements for a specific warehouse (where from_warehouse_id OR to_warehouse_id matches), sorted newest first.

### 3.2 Updated Command: Get Movements by Variant

**Command**: `stock_movements_get_by_variant(variant_id: String, limit: Option<i32>, offset: Option<i32>)`

**Returns**: Paginated movements for a variant, newest first. Default page size 10.

### 3.3 Updated: execute_movement

Add `product_id` parameter to movement creation functions.

---

## 4. VariantDetailModal - Audits Tab

### Query Strategy

- TanStack Query key: `['stock-movements-variant', variantId, page, pageSize]`
- Page size: 10
- Sort: `created_at DESC` (newest first)

### Display

- Table with columns: Type, Quantity, From Warehouse, To Warehouse, Date
- Pagination controls at bottom (previous/next, page indicator)
- Loading skeleton (5 rows) while fetching
- Empty state: "No stock movements recorded for this variant"

---

## 5. ProductDetailModal - Audits Tab

### Query Strategy

- Single query fetches all variants' movements for this product
- Query key: `['stock-movements-product', productId]`
- Limit 5 most recent per variant (application-side filtering using window function or post-query filter)
- Sort all results by `created_at DESC`

### Display

- Scrollable container (max-height with overflow-y: auto)
- Rows grouped by variant (variant name as sub-header before each variant's movements)
- Same columns as VariantDetailModal
- No pagination - list grows with fetched data
- Empty state: "No stock movements recorded for variants of this product"

---

## 6. WarehouseDetailModal - Audits Tab

### Query Strategy

- Query key: `['stock-movements-warehouse', warehouseId]`
- Fetch all movements for warehouse (from OR to), newest first
- Grouping done in React after data fetch

### Display Transformation: Consecutive Product Grouping

Group consecutive movements by `product_id`. Non-consecutive same-product groups get separate headers.

**Format**:

```
ProductName (N movements)
  - Type | Quantity | From | To | Date (indented row)
  - Type | Quantity | From | To | Date (indented row)
ProductName (N movements)
  - Type | Quantity | From | To | Date (indented row)
```

**Example**:

```
Alpha Corp (2 movements)
  - PURCHASE | 100 | - | Cairo | 2024-01-15
  - TRANSFER | 30 | Cairo | Alexandria | 2024-01-16
Beta Inc (1 movement)
  - SALE | 5 | Alexandria | - | 2024-01-17
Alpha Corp (1 movement)
  - ADJUST | 10 | - | Cairo | 2024-01-18
```

**Rules**:

- Header shows product name + count
- Rows indented under header
- No collapsible sections
- Grouping only when product_id is the same AND rows are consecutive in the sorted list

---

## 7. UI Components

### 7.1 StockMovementsTable

Reusable component used across all three modals with configurable props:

```typescript
interface StockMovementsTableProps {
  movements: StockMovement[]
  variant?: 'simple' | 'grouped' | 'warehouse'
  columns?: MovementColumn[]
  emptyMessage?: string
}
```

**Variants**:

- `simple`: Flat list with optional pagination
- `grouped`: Grouped by variant with sub-headers
- `warehouse`: Grouped by product with consecutive product merging

### 7.2 StockMovementRow

Individual row component rendering movement data with consistent styling.

### 7.3 MovementGroupHeader

Header component for grouped views showing product/variant name and movement count.

---

## 8. StockMovementForm Changes

Product ID flows through existing form submission context:

- When creating movement for a variant, product_id is available from that variant's data
- No new Rust commands needed for product_id lookup
- Form submission includes product_id in the movement creation payload

---

## 9. Error Handling & States

| State   | Display                                           |
| ------- | ------------------------------------------------- |
| Loading | Skeleton (5 rows)                                 |
| Empty   | Friendly message per tab context                  |
| Error   | Error message with retry button                   |
| Success | Full table with pagination/grouping as applicable |

---

## 10. Testing Considerations

### Unit Tests

- Consecutive product grouping logic (warehouse variant)
- Pagination offset/limit calculations
- Movement data transformation functions

### Integration Tests

- Paginated query returns correct page
- All variants of product are included with 5-movement limit
- Warehouse movements correctly filtered by from/to warehouse

### UI Tests

- Empty states render correctly for each context
- Pagination controls functional
- Grouped rows display with correct indentation

---

## 11. Files to Modify/Create

### Rust

- `src-tauri/src/commands/stock_movements.rs` - Add `stock_movements_get_by_warehouse`
- `src-tauri/src/commands/stocks.rs` - Update `stock_movements_get_by_variant` pagination
- `src-tauri/src/sql/stocks.rs` - Schema migration for product_id
- `src-tauri/src/seed/movements.rs` - Update seed to pass product_id
- Create backfill migration script

### Frontend

- `src/components/entity/StockMovementsTable.tsx` - New reusable component
- `src/components/entity/VariantDetailModal.tsx` - Implement audits tab
- `src/components/entity/ProductDetailModal.tsx` - Implement audits tab
- `src/components/entity/WarehouseDetailModal.tsx` - Implement audits tab
- `src/lib/tauri-bindings.ts` - Add new command bindings
- `src/hooks/useStockMovements.ts` - Query hooks (optional, can inline)

---

## 12. Implementation Order

1. Database migration (add column + backfill)
2. Rust commands (new + updated)
3. Frontend bindings
4. StockMovementsTable component
5. VariantDetailModal audits tab
6. ProductDetailModal audits tab
7. WarehouseDetailModal audits tab (with grouping logic)
8. Testing

---

## 13. Notes

- Movement types: `PURCHASE`, `SALE`, `TRANSFER`, `ADJUST`
- Future specialization per tab is planned but not in current scope
- product_id is always derived from variant context, no standalone lookup needed
