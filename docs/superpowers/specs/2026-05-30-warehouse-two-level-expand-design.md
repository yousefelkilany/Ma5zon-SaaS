# Warehouse Stock Levels - Two-Level Expanding Table

## Summary

Enhance `WarehousesSubTable` to use react-table with expanding rows. Level 1 shows products available in a warehouse; expanding a product row shows its variants with name, SKU, and qty.

## Data Flow

1. User expands warehouse row → fetch products with stock in that warehouse
2. User expands product row → fetch variants for that product in that warehouse

## SQL Statements

### 1. `productsGetByWarehouseWithStock`

Get products that have at least one variant with quantity > 0 in a warehouse.

```sql
SELECT DISTINCT p.id, p.name
FROM products p
JOIN product_variants v ON p.id = v.product_id
JOIN stock_levels s ON v.id = s.variant_id
WHERE s.warehouse_id = ?1 AND s.quantity > 0
ORDER BY p.name
```

### 2. `variantsGetByProductAndWarehouse`

Get variant details and qty for a specific product in a specific warehouse.

```sql
SELECT
    v.id AS variant_id,
    v.variant_name,
    v.sku,
    COALESCE(s.quantity, 0) AS quantity
FROM product_variants v
LEFT JOIN stock_levels s ON v.id = s.variant_id AND s.warehouse_id = ?2
WHERE v.product_id = ?1
ORDER BY v.variant_name
```

## New Types

```typescript
interface ProductWithStock {
  id: string
  name: string
}

interface VariantWithStock {
  variant_id: string
  variant_name: string
  sku: string
  quantity: number
}
```

## New Commands

| Command                            | Parameters                                 | Returns              |
| ---------------------------------- | ------------------------------------------ | -------------------- |
| `productsGetByWarehouseWithStock`  | `warehouseId: string`                      | `ProductWithStock[]` |
| `variantsGetByProductAndWarehouse` | `productId: string`, `warehouseId: string` | `VariantWithStock[]` |

## Component Changes

### `WarehousesSubTable`

- Convert from plain `<table>` to react-table
- Add expand column with chevron icon
- Track `expandedProductIds: Set<string>`
- Track `productsCache: Map<warehouseId, ProductWithStock[]>`
- Track `variantsCache: Map<productId, VariantWithStock[]>`
- On warehouse expand → fetch products if not cached
- On product expand → fetch variants if not cached
- If product has no stock (qty=0 everywhere), it won't appear in productsGetByWarehouseWithStock results

## Props Interface

```typescript
interface WarehousesSubTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  warehouseId: string
  expandedProductIds?: Set<string>
  productsCache?: Map<string, ProductWithStock[]>
  variantsCache?: Map<string, VariantWithStock[]>
  onWarehouseExpand?: (warehouseId: string) => void
  onProductExpand?: (productId: string) => void
  isLoadingProducts?: (warehouseId: string) => boolean
  isLoadingVariants?: (productId: string) => boolean
}
```

## UI Structure

```
[warehouse row - always visible]
  └─ expanded section (when warehouse expanded)
      [product row]  ← only products with stock in this warehouse
        └─ expanded section (when product expanded)
            [variant row with name, sku, qty]
            [variant row with name, sku, qty]
            ...
      [product row]
        └─ expanded section
            [variant row with name, sku, qty]
            ...
```

## Expandability Rules

- Warehouse row: always has expand chevron (regardless of whether it has stock)
- If warehouse has no products with stock → expanding shows empty state "No stock in this warehouse"
- Product row: only visible if product has at least one variant with qty > 0 in this warehouse
- Product rows are sorted alphabetically by product name

## Error Handling

- On fetch error → show error state in expanded section with retry option
- On empty results → show empty state message
