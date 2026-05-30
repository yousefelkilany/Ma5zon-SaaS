# Stock Levels UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two read-only UI surfaces for viewing stock levels: expandable warehouse rows in DataTable and Stock tab in Product/Variant DetailModals.

**Architecture:** Lazy-loaded stock data via new Rust commands. Warehouse expand follows existing VariantsSubTable pattern. ProductDetailModal uses pivot table. VariantDetailModal uses flat list.

**Tech Stack:** Tauri v2, React, TanStack Query, Tailwind CSS, shadcn/ui, Rust/SQLite

---

## File Map

### Backend (Rust)

- `src-tauri/src/sql/stocks.rs` — Add two new SQL queries
- `src-tauri/src/commands/stocks.rs` — Add new struct and two commands
- `src-tauri/src/commands/mod.rs` — Export new commands
- `src-tauri/src/bindings.rs` — Regenerate bindings

### Frontend (React/TypeScript)

- `src/lib/types/entity.ts` — Add `StockLevelWithVariant` type
- `src/lib/bindings.ts` — Add binding methods for new commands
- `src/components/entity/StockLevelsTable.tsx` — New reusable stock table (variant flat + product pivot)
- `src/components/entity/WarehousesSubTable.tsx` — New expandable subtable for warehouses
- `src/components/entity/DataTable.tsx` — Add warehouse expand + stock props
- `src/components/entity/DataTableShell.tsx` — Pass through stock props
- `src/components/entity/EntityWorkspace.tsx` — Add stock cache state + fetch logic
- `src/components/entity/VariantDetailModal.tsx` — Add Stock tab
- `src/components/entity/ProductDetailModal.tsx` — Add Stock tab with pivot

---

## Task 1: Backend — SQL Queries

**Files:**

- Modify: `src-tauri/src/sql/stocks.rs`

- [ ] **Step 1: Add `get_stock_levels_by_product` query**

Append after existing queries:

```rust
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

- [ ] **Step 2: Add `get_levels_by_warehouse_with_names` query**

```rust
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

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/stocks.rs
git commit -m "feat(stocks): add SQL queries for stock levels with variant names"
```

---

## Task 2: Backend — Rust Commands

**Files:**

- Modify: `src-tauri/src/commands/stocks.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Add `StockLevelWithVariant` struct**

Add after existing `StockLevel` struct:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockLevelWithVariant {
    pub variant_id: String,
    pub variant_name: String,
    pub sku: String,
    pub warehouse_id: String,
    pub quantity: f64,
}
```

- [ ] **Step 2: Add `stock_levels_get_by_product` command**

```rust
#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_product(
    app: AppHandle,
    product_id: String,
) -> Result<Vec<StockLevelWithVariant>, String> {
    let conn = get_conn(&app)?;
    let product_id_i64: i64 = product_id
        .parse()
        .map_err(|e| format!("Invalid product_id: {e}"))?;
    let mut stmt = conn
        .prepare(get_stock_levels_by_product())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let levels = stmt
        .query_map(params![product_id_i64], |row| {
            Ok(StockLevelWithVariant {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                variant_name: row.get::<_, String>(1)?,
                sku: row.get::<_, String>(2)?,
                warehouse_id: row.get::<_, i64>(3)?.to_string(),
                quantity: row.get::<_, f64>(4)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}
```

- [ ] **Step 3: Add `stock_levels_get_by_warehouse_with_names` command**

```rust
#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_warehouse_with_names(
    app: AppHandle,
    warehouse_id: String,
) -> Result<Vec<StockLevelWithVariant>, String> {
    let conn = get_conn(&app)?;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let mut stmt = conn
        .prepare(get_levels_by_warehouse_with_names())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let levels = stmt
        .query_map(params![warehouse_id_i64], |row| {
            Ok(StockLevelWithVariant {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                variant_name: row.get::<_, String>(1)?,
                sku: row.get::<_, String>(2)?,
                warehouse_id: row.get::<_, i64>(3)?.to_string(),
                quantity: row.get::<_, f64>(4)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}
```

- [ ] **Step 4: Add imports in `stocks.rs`**

Update the import from `crate::sql::stocks` to include the new queries:

```rust
use crate::sql::stocks::{
    create_levels_table, create_movements_table, get_levels_all, get_levels_by_variant,
    get_levels_by_warehouse, get_movements_all, get_movements_by_variant,
    get_stock_levels_by_product, get_levels_by_warehouse_with_names,
};
```

- [ ] **Step 5: Export new commands in `src-tauri/src/commands/mod.rs`**

Add to exports:

```rust
pub use stocks::{
    StockLevel, StockLevelWithVariant, StockMovement,
    stock_levels_get_all, stock_levels_get_by_variant, stock_levels_get_by_warehouse,
    stock_levels_get_by_product, stock_levels_get_by_warehouse_with_names,
    stock_movements_get_all, stock_movements_get_by_variant,
};
```

- [ ] **Step 6: Regenerate bindings and verify build**

Run: `cd src-tauri && cargo build`
Expected: Compiles successfully

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/commands/stocks.rs src-tauri/src/commands/mod.rs src-tauri/src/sql/stocks.rs
git commit -m "feat(stocks): add Rust commands for stock levels with variant names"
```

---

## Task 3: Frontend Type Definition

**Files:**

- Modify: `src/lib/types/entity.ts`

- [ ] **Step 1: Add `StockLevelWithVariant` type**

Find the `VariantRow` interface and add nearby:

```typescript
interface StockLevelWithVariant {
  variant_id: string
  variant_name: string
  sku: string
  warehouse_id: string
  quantity: number
}
```

Also update the `DataTableProps` interface (or wherever props are defined) to include:

```typescript
stockLevelsCache?: Map<string, StockLevelWithVariant[]>
isLoadingStockLevels?: (id: string) => boolean
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/entity.ts
git commit -m "feat(types): add StockLevelWithVariant type and stock cache props"
```

---

## Task 4: Frontend Bindings

**Files:**

- Modify: `src/lib/bindings.ts`

- [ ] **Step 1: Add binding methods for new commands**

Add after existing stock level bindings (around line 340):

```typescript
public async stock_levels_get_by_product(productId: string): Promise<{ status: "ok"; data: StockLevelWithVariant[] } | { status: "error"; error: string }> {
    return { status: "ok", data: await TAURI_INVOKE("stock_levels_get_by_product", { productId }) };
}

public async stock_levels_get_by_warehouse_with_names(warehouseId: string): Promise<{ status: "ok"; data: StockLevelWithVariant[] } | { status: "error"; error: string }> {
    return { status: "ok", data: await TAURI_INVOKE("stock_levels_get_by_warehouse_with_names", { warehouseId }) };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bindings.ts
git commit -m "feat(bindings): add frontend bindings for new stock level commands"
```

---

## Task 5: StockLevelsTable Component

**Files:**

- Create: `src/components/entity/StockLevelsTable.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StockLevelWithVariant } from '@/lib/types/entity'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'
import i18n from '@/i18n/config'

interface StockLevelsTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  view: 'variant' | 'product'
  warehouseNames?: Map<string, string>
}

export function StockLevelsTable({
  stockLevels,
  isLoading,
  view,
  warehouseNames,
}: StockLevelsTableProps) {
  const { t } = useTranslation()
  const locale = i18n.language

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (stockLevels.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant p-4">
        {t('entity.stock.noLevels')}
      </p>
    )
  }

  if (view === 'variant') {
    return <VariantStockView stockLevels={stockLevels} warehouseNames={warehouseNames} locale={locale} />
  }

  return <ProductStockPivot stockLevels={stockLevels} warehouseNames={warehouseNames} locale={locale} />
}

function VariantStockView({
  stockLevels,
  warehouseNames,
  locale,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  locale: string
}) {
  const { t } = useTranslation()

  return (
    <table className="w-full text-body-sm">
      <thead>
        <tr className="border-b border-outline-variant">
          <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
            {t('entity.warehouse.name')}
          </th>
          <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
            {t('entity.stock.quantity')}
          </th>
        </tr>
      </thead>
      <tbody>
        {stockLevels.map((level, idx) => (
          <tr key={`${level.variant_id}-${level.warehouse_id}-${idx}`} className="border-t border-outline-variant/30">
            <td className="px-3 py-2 text-on-surface">
              {warehouseNames?.get(level.warehouse_id) ?? level.warehouse_id}
            </td>
            <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
              {level.quantity.toLocaleString(locale, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ProductStockPivot({
  stockLevels,
  warehouseNames,
  locale,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  locale: string
}) {
  const { t } = useTranslation()

  const { rows, columns, totals } = useMemo(() => {
    const variantMap = new Map<string, Map<string, number>>()
    const warehouseSet = new Set<string>()
    const columnSums: Record<string, number> = {}
    let rowTotalSum = 0

    for (const level of stockLevels) {
      if (!variantMap.has(level.variant_id)) {
        variantMap.set(level.variant_id, new Map())
      }
      variantMap.get(level.variant_id)!.set(level.warehouse_id, level.quantity)
      warehouseSet.add(level.warehouse_id)
      columnSums[level.warehouse_id] = (columnSums[level.warehouse_id] || 0) + level.quantity
      rowTotalSum += level.quantity
    }

    const variantRows: { variantId: string; variantName: string; sku: string; quantities: Map<string, number>; rowTotal: number }[] = []
    for (const [variantId, quantities] of variantMap) {
      let rowTotal = 0
      for (const q of quantities.values()) {
        rowTotal += q
      }
      const firstLevel = stockLevels.find(l => l.variant_id === variantId)
      variantRows.push({
        variantId,
        variantName: firstLevel?.variant_name ?? '',
        sku: firstLevel?.sku ?? '',
        quantities,
        rowTotal,
      })
    }

    const cols = Array.from(warehouseSet).sort()
    const totalRow = columnSums

    return { rows: variantRows, columns: cols, totals: { ...totalRow, _rowTotal: rowTotalSum } }
  }, [stockLevels])

  if (rows.length === 0) {
    return <p className="text-body-sm text-on-surface-variant p-4">{t('entity.stock.noLevels')}</p>
  }

  return (
    <table className="w-full text-body-sm">
      <thead>
        <tr className="border-b border-outline-variant">
          <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
            {t('entity.variant.name')}
          </th>
          <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
            SKU
          </th>
          {columns.map(wId => (
            <th key={wId} className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
              {warehouseNames?.get(wId) ?? wId}
            </th>
          ))}
          <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
            {t('entity.stock.total')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.variantId} className="border-t border-outline-variant/30">
            <td className="px-3 py-2 text-on-surface">{row.variantName}</td>
            <td className="px-3 py-2 text-on-surface-variant">{row.sku}</td>
            {columns.map(col => (
              <td key={col} className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                {row.quantities.get(col)?.toLocaleString(locale, { minimumFractionDigits: 2 }) ?? '-'}
              </td>
            ))}
            <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums font-bold">
              {row.rowTotal.toLocaleString(locale, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-outline-variant font-bold">
          <td colSpan={2} className="px-3 py-2 text-on-surface">
            {t('entity.stock.total')}
          </td>
          {columns.map(col => (
            <td key={col} className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
              {(totals[col] || 0).toLocaleString(locale, { minimumFractionDigits: 2 })}
            </td>
          ))}
          <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
            {totals._rowTotal.toLocaleString(locale, { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}
```

- [ ] **Step 2: Add i18n keys**

In `src/i18n/locales/en.json` (or relevant locale file), add:

```json
{
  "entity": {
    "stock": {
      "noLevels": "No stock levels found",
      "quantity": "Quantity",
      "total": "Total"
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/StockLevelsTable.tsx
git add src/i18n/locales/en.json
git commit -m "feat(stock): create StockLevelsTable component with variant and pivot views"
```

---

## Task 6: WarehousesSubTable Component

**Files:**

- Create: `src/components/entity/WarehousesSubTable.tsx`

- [ ] **Step 1: Create the component**

```typescript
import type { StockLevelWithVariant } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'
import i18n from '@/i18n/config'

interface WarehousesSubTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  warehouseId: string
}

export function WarehousesSubTable({
  stockLevels,
  isLoading,
  warehouseId,
}: WarehousesSubTableProps) {
  const { t } = useTranslation()
  const locale = i18n.language

  if (isLoading) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (stockLevels.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm">
        <span>{t('entity.stock.noLevels')}</span>
      </div>
    )
  }

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
              {t('entity.variant.name')}
            </th>
            <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
              SKU
            </th>
            <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
              {t('entity.stock.quantity')}
            </th>
          </tr>
        </thead>
        <tbody>
          {stockLevels.map((level) => (
            <tr key={`${level.variant_id}-${warehouseId}`} className="border-t border-outline-variant/30">
              <td className="px-3 py-2 text-on-surface">
                {level.variant_name}
              </td>
              <td className="px-3 py-2 text-on-surface-variant">
                {level.sku}
              </td>
              <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                {level.quantity.toLocaleString(locale, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/WarehousesSubTable.tsx
git commit -m "feat(warehouses): create WarehousesSubTable component for stock levels"
```

---

## Task 7: DataTable — Warehouse Expand

**Files:**

- Modify: `src/components/entity/DataTable.tsx`

- [ ] **Step 1: Import WarehousesSubTable**

Add to imports:

```typescript
import { WarehousesSubTable } from './WarehousesSubTable'
import { StockLevelsTable } from './StockLevelsTable'
```

- [ ] **Step 2: Update expand column to include warehouses**

Change line ~159:

```typescript
const tableColumns = useMemo<TanstackColumnDef<EntityRow>[]>(() => {
  const cols: TanstackColumnDef<EntityRow>[] = [selectColumn]
  if (entityType === 'products' || entityType === 'warehouses')
    cols.push(expandColumn)
  // ... rest unchanged
}, [selectColumn, expandColumn, entityType, visibleColumns])
```

- [ ] **Step 3: Update DataTableProps interface**

The file imports `DataTableProps` from `@/lib/types/entity`. The new props (stockLevelsCache, isLoadingStockLevels) should already be added to `DataTableProps` in Task 3. Verify they're present, then update `ExpandedRowProps`:

```typescript
interface ExpandedRowProps {
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  stockLevelsCache?: Map<string, StockLevelWithVariant[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingVariants?: (id: string) => boolean
  isLoadingStockLevels?: (id: string) => boolean
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}
```

Update `DataTable` function signature and destructuring to include new props.

- [ ] **Step 4: Add warehouse subtable rendering in expanded row logic**

In the expanded row rendering section (~lines 391-403), update:

```typescript
{expandedRowIds?.has(row.original.id) && (
  <tr>
    <td colSpan={columns.length + 2} className="p-0">
      {entityType === 'products' && (
        <VariantsSubTable
          variants={variantsCache?.get(row.original.id) ?? []}
          isLoading={isLoadingVariants?.(row.original.id)}
          productId={row.original.id}
          onVariantClick={onVariantClick}
          onAddVariant={onAddVariant}
        />
      )}
      {entityType === 'warehouses' && (
        <WarehousesSubTable
          stockLevels={stockLevelsCache?.get(row.original.id) ?? []}
          isLoading={isLoadingStockLevels?.(row.original.id)}
          warehouseId={row.original.id}
        />
      )}
    </td>
  </tr>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/DataTable.tsx
git commit -m "feat(datatable): add warehouse expand with WarehousesSubTable"
```

---

## Task 8: DataTableShell — Pass Through Props

**Files:**

- Modify: `src/components/entity/DataTableShell.tsx`

- [ ] **Step 1: Update DataTableShellProps interface**

Add to imports from `@/lib/types/entity`:

```typescript
StockLevelWithVariant
```

Update interface:

```typescript
interface DataTableShellProps {
  // ... existing fields
  stockLevelsCache?: Map<string, StockLevelWithVariant[]>
  isLoadingStockLevels?: (id: string) => boolean
}
```

- [ ] **Step 2: Pass props to DataTable**

In the `DataTable` component call inside `DataTableShell`, add the new props:

```typescript
<DataTable
  // ... existing props
  stockLevelsCache={stockLevelsCache}
  isLoadingStockLevels={isLoadingStockLevels}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat(datatableshell): pass stock levels cache props to DataTable"
```

---

## Task 9: EntityWorkspace — Stock Cache State

**Files:**

- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Add state and handler for stock levels**

Add new imports:

```typescript
import type { StockLevelWithVariant } from '@/lib/types/entity'
```

Add new state after `loadingVariants`:

```typescript
const [stockLevelsCache, setStockLevelsCache] = useState<
  Map<string, StockLevelWithVariant[]>
>(new Map())
const [loadingStockLevels, setLoadingStockLevels] = useState<Set<string>>(
  new Set()
)
```

- [ ] **Step 2: Update handleRowToggleExpand to handle warehouse expand**

Update the callback to also fetch stock levels when expanding a warehouse:

```typescript
const handleRowToggleExpand = useCallback(
  async (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
      if (entityType === 'products' && !variantsCache.has(id)) {
        setLoadingVariants(prev => new Set(prev).add(id))
        try {
          const result = await commands.variantsGetByProduct(id)
          if (result.status === 'ok') {
            const variantRows: VariantRow[] = result.data.map(v => ({
              ...v,
              uom_id: Number(v.uom_id),
            }))
            setVariantsCache(prev => new Map(prev).set(id, variantRows))
          }
        } finally {
          setLoadingVariants(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
      if (entityType === 'warehouses' && !stockLevelsCache.has(id)) {
        setLoadingStockLevels(prev => new Set(prev).add(id))
        try {
          const result =
            await commands.stock_levels_get_by_warehouse_with_names(id)
          if (result.status === 'ok') {
            setStockLevelsCache(prev => new Map(prev).set(id, result.data))
          }
        } finally {
          setLoadingStockLevels(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
    }
    setExpandedIds(newExpanded)
  },
  [expandedIds, variantsCache, stockLevelsCache, entityType]
)
```

- [ ] **Step 3: Pass new props to DataTableShell**

In the `DataTableShell` call, add:

```typescript
<DataTableShell
  // ... existing props
  stockLevelsCache={stockLevelsCache}
  isLoadingStockLevels={id => loadingStockLevels.has(id)}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "feat(entityworkspace): add stock levels cache state and fetch logic"
```

---

## Task 10: VariantDetailModal — Add Stock Tab

**Files:**

- Modify: `src/components/entity/VariantDetailModal.tsx`

- [ ] **Step 1: Add stock tab states and loading**

Add after existing state declarations:

```typescript
const [stockLevels, setStockLevels] = useState<StockLevelWithVariant[]>([])
const [isLoadingStock, setIsLoadingStock] = useState(false)
const [warehouseNames, setWarehouseNames] = useState<Map<string, string>>(
  new Map()
)
```

Add after `loadEntity` callback:

```typescript
const loadStockLevels = useCallback(async () => {
  if (!entityId) return
  setIsLoadingStock(true)
  const result = await commands.stock_levels_get_by_variant(entityId)
  setIsLoadingStock(false)
  if (result.status === 'ok') {
    setStockLevels(
      result.data.map(l => ({
        ...l,
        variant_name: '',
        sku: '',
      }))
    )
    // Also load warehouse names for display
    const whResult = await commands.warehousesGetAll([], [])
    if (whResult.status === 'ok') {
      const names = new Map<string, string>()
      for (const w of whResult.data) {
        names.set(w.id, w.name)
      }
      setWarehouseNames(names)
    }
  }
}, [entityId])
```

- [ ] **Step 2: Load stock levels when stock tab is activated**

Update `activeTab === 'stock'` case in the tab content:

```typescript
{activeTab === 'stock' && (
  <div id="stock-panel" role="tabpanel" aria-labelledby="stock-tab">
    <StockLevelsTable
      stockLevels={stockLevels}
      isLoading={isLoadingStock}
      view="variant"
      warehouseNames={warehouseNames}
    />
  </div>
)}
```

Note: You need to import `StockLevelsTable` and `StockLevelWithVariant`.

- [ ] **Step 3: Add stock tab to tabs array**

Update `tabs` to include stock:

```typescript
const tabs: { id: TabId; label: string }[] = [
  { id: 'details', label: t('entity.detail.tabs.details') },
  { id: 'stock', label: t('entity.detail.tabs.stock') },
  { id: 'insights', label: t('entity.detail.tabs.insights') },
  { id: 'audits', label: t('entity.detail.tabs.audits') },
]
```

Add `'stock'` to `TabId` type:

```typescript
type TabId = 'details' | 'stock' | 'insights' | 'audits'
```

- [ ] **Step 4: Load stock on tab activation**

Add effect to load stock when stock tab is first shown:

```typescript
useEffect(() => {
  if (activeTab === 'stock' && stockLevels.length === 0 && !isLoadingStock) {
    loadStockLevels()
  }
}, [activeTab, stockLevels.length, isLoadingStock, loadStockLevels])
```

- [ ] **Step 5: Add i18n key for stock tab**

Add to locale file: `"stock": "Stock"`

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantDetailModal.tsx src/i18n/locales/en.json
git commit -m "feat(variantmodal): add Stock tab to VariantDetailModal"
```

---

## Task 11: ProductDetailModal — Add Stock Tab with Pivot

**Files:**

- Modify: `src/components/entity/ProductDetailModal.tsx`

- [ ] **Step 1: Add stock tab states and loading**

Add imports:

```typescript
import type { StockLevelWithVariant } from '@/lib/types/entity'
import { StockLevelsTable } from './StockLevelsTable'
```

Add after existing state declarations:

```typescript
const [stockLevels, setStockLevels] = useState<StockLevelWithVariant[]>([])
const [isLoadingStock, setIsLoadingStock] = useState(false)
const [warehouseNames, setWarehouseNames] = useState<Map<string, string>>(
  new Map()
)
```

Add after `loadEntity` callback:

```typescript
const loadStockLevels = useCallback(async () => {
  if (!entityId) return
  setIsLoadingStock(true)
  const result = await commands.stock_levels_get_by_product(entityId)
  setIsLoadingStock(false)
  if (result.status === 'ok') {
    setStockLevels(result.data)
    // Also load warehouse names for display
    const whResult = await commands.warehousesGetAll([], [])
    if (whResult.status === 'ok') {
      const names = new Map<string, string>()
      for (const w of whResult.data) {
        names.set(w.id, w.name)
      }
      setWarehouseNames(names)
    }
  }
}, [entityId])
```

- [ ] **Step 2: Add stock tab to tabs array**

Update `tabs`:

```typescript
const tabs: { id: TabId; label: string }[] = [
  { id: 'details', label: t('entity.detail.tabs.details') },
  { id: 'stock', label: t('entity.detail.tabs.stock') },
  { id: 'insights', label: t('entity.detail.tabs.insights') },
  { id: 'audits', label: t('entity.detail.tabs.audits') },
]
```

Add `'stock'` to `TabId`:

```typescript
type TabId = 'details' | 'stock' | 'insights' | 'audits'
```

- [ ] **Step 3: Add stock tab content**

Add after `activeTab === 'details'` block:

```typescript
{activeTab === 'stock' && (
  <div id="stock-panel" role="tabpanel" aria-labelledby="stock-tab">
    <StockLevelsTable
      stockLevels={stockLevels}
      isLoading={isLoadingStock}
      view="product"
      warehouseNames={warehouseNames}
    />
  </div>
)}
```

- [ ] **Step 4: Load stock on tab activation**

Add effect:

```typescript
useEffect(() => {
  if (activeTab === 'stock' && stockLevels.length === 0 && !isLoadingStock) {
    loadStockLevels()
  }
}, [activeTab, stockLevels.length, isLoadingStock, loadStockLevels])
```

- [ ] **Step 5: Reset stock data when modal closes**

In the existing `useEffect` that resets state on `!open`, also reset stock:

```typescript
if (!open) {
  // ... existing resets
  setStockLevels([])
  setWarehouseNames(new Map())
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/ProductDetailModal.tsx
git commit -m "feat(productmodal): add Stock tab with pivot table to ProductDetailModal"
```

---

## Verification

- [ ] Run `pnpm run check:all` to verify linting and type checking
- [ ] Run `cd src-tauri && cargo build` to verify Rust compilation
- [ ] Manually test:
  1. Navigate to Warehouses tab — click warehouse name — verify stock levels subtable expands
  2. Open a Product — click Stock tab — verify pivot table renders correctly
  3. Open a Variant — click Stock tab — verify flat list renders correctly

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
