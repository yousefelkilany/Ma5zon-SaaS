# Stock Movements Audits Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement stock movement audit displays in VariantDetailModal, ProductDetailModal, and WarehouseDetailModal with distinct behaviors per spec.

**Architecture:** Database schema change adds `product_id` to `stock_movements`. New Rust command for warehouse movements. Frontend uses TanStack Query with pagination support. Grouping logic runs in React for warehouse view.

**Tech Stack:** Tauri v2, Rust, React, TanStack Query, SQLite

---

## Task 1: Database Schema Change - Add product_id Column

**Files:**
- Modify: `src-tauri/src/sql/stocks.rs:73-86`
- Modify: `src-tauri/src/commands/stock_movements.rs:176-179`
- Modify: `src-tauri/src/seed/movements.rs:56-66, 68-76, 79-87, 93-101, 107-115, 128, 136`
- Create: `src-tauri/migrations/001_backfill_product_id.sql`

- [ ] **Step 1: Modify create_movements_table SQL to include product_id**

In `src-tauri/src/sql/stocks.rs`, update `create_movements_table()`:

```rust
pub fn create_movements_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        from_warehouse_id INTEGER,
        to_warehouse_id INTEGER,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        \"type\" TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(variant_id) REFERENCES product_variants(id),
        FOREIGN KEY(product_id) REFERENCES products(id),
        FOREIGN KEY(from_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY(to_warehouse_id) REFERENCES warehouses(id)
    ) STRICT"
}
```

- [ ] **Step 2: Update StockMovement struct in stocks.rs to include product_id**

In `src-tauri/src/commands/stocks.rs:54-62`, add `product_id` field:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockMovement {
    pub id: String,
    pub variant_id: String,
    pub product_id: String,
    pub from_warehouse_id: Option<String>,
    pub to_warehouse_id: Option<String>,
    pub quantity: i32,
    pub movement_type: String,
    pub created_at: String,
}
```

- [ ] **Step 3: Update insert statement in execute_movement**

In `src-tauri/src/commands/stock_movements.rs:176-179`, update to include product_id:

```rust
conn.execute(
    "INSERT INTO stock_movements (variant_id, product_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![variant_id, product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, now],
)
```

Wait - `execute_movement` doesn't receive `product_id` yet. We need to add it as a parameter. Let me revise this step:

In `src-tauri/src/commands/stock_movements.rs:129-186`, update `execute_movement` signature and body:

```rust
pub fn execute_movement(
    conn: &Connection,
    variant_id: i64,
    product_id: i64,
    from_warehouse_id: Option<i64>,
    to_warehouse_id: Option<i64>,
    quantity: i32,
    movement_type: &str,
) -> Result<(), String> {
    // ... existing validation unchanged ...
    
    // INSERT now includes product_id
    conn.execute(
        "INSERT INTO stock_movements (variant_id, product_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![variant_id, product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, now],
    )
```

- [ ] **Step 4: Update all callers of execute_movement in stock_movements.rs**

Update the 4 movement creation points (PURCHASE at line 152-155, SALE at 156-158, TRANSFER at 160-164, ADJUST at 166-172) to pass product_id. But first we need product_id to be passed into the tauri commands.

For now, update the tauri commands to accept and pass product_id:

```rust
#[tauri::command]
#[specta::specta]
pub async fn create_transfer(
    app: AppHandle,
    variant_id: String,
    product_id: String,
    from_warehouse: String,
    to_warehouse: String,
    quantity: i32,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let product_id_i64: i64 = product_id.parse().map_err(|e| format!("Invalid product_id: {e}"))?;
    let from_wh_i64: i64 = from_warehouse.parse().map_err(|e| format!("Invalid from_warehouse: {e}"))?;
    let to_wh_i64: i64 = to_warehouse.parse().map_err(|e| format!("Invalid to_warehouse: {e}"))?;

    execute_movement(&conn, variant_id_i64, product_id_i64, Some(from_wh_i64), Some(to_wh_i64), quantity, "TRANSFER")?;
    // ... logging unchanged ...
    Ok(())
}
```

Repeat for `create_purchase`, `create_sale`, `create_adjustment` - each accepting `product_id: String` and passing `product_id_i64`.

- [ ] **Step 5: Create migration script for product_id column**

Create `src-tauri/migrations/001_backfill_product_id.sql`:

```sql
-- Add product_id column to stock_movements
ALTER TABLE stock_movements ADD COLUMN product_id INTEGER NOT NULL;

-- Backfill product_id from product_variants
UPDATE stock_movements
SET product_id = (
    SELECT pv.product_id
    FROM product_variants pv
    WHERE pv.id = stock_movements.variant_id
);
```

- [ ] **Step 6: Update seed script to pass product_id**

In `src-tauri/src/seed/movements.rs`, we need to get product_id for each variant before calling execute_movement.

At line 56, before the loop, query for variant->product_id mapping:

```rust
// Get variant -> product_id mapping
let mut stmt = conn
    .prepare("SELECT id, product_id FROM product_variants")
    .map_err(|e| format!("Failed to prepare: {e}"))?;
let variant_product_map: std::collections::HashMap<i64, i64> = stmt
    .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)))
    .map_err(|e| format!("Failed to query: {e}"))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect: {e}"))?
    .into_iter()
    .collect();
drop(stmt);
```

Then in the loop (line 56+), pass product_id to execute_movement:

```rust
let product_id = variant_product_map.get(variant_id).ok_or("Variant not found")?;
execute_movement(
    conn,
    *variant_id,
    *product_id,
    None,
    Some(cairo_wh),
    purchase_qty,
    "PURCHASE",
)?;
```

Update all other execute_movement calls similarly.

- [ ] **Step 7: Run database migration**

Run the ALTER TABLE and backfill script against the database.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/sql/stocks.rs src-tauri/src/commands/stocks.rs src-tauri/src/commands/stock_movements.rs src-tauri/src/seed/movements.rs src-tauri/migrations/001_backfill_product_id.sql
git commit -m "feat: add product_id to stock_movements table with backfill"
```

---

## Task 2: Add stock_movements_get_by_warehouse Command

**Files:**
- Modify: `src-tauri/src/sql/stocks.rs` - add `get_movements_by_warehouse()` function
- Modify: `src-tauri/src/commands/stocks.rs` - add `stock_movements_get_by_warehouse` tauri command

- [ ] **Step 1: Add SQL function for getting movements by warehouse**

In `src-tauri/src/sql/stocks.rs`, add after `get_movements_by_variant()`:

```rust
pub fn get_movements_by_warehouse() -> &'static str {
    "SELECT id, variant_id, product_id, from_warehouse_id, to_warehouse_id, quantity, \"type\", created_at \
     FROM stock_movements \
     WHERE from_warehouse_id = ?1 OR to_warehouse_id = ?1 \
     ORDER BY created_at DESC"
}
```

Also update `get_movements_all()` to include product_id:

```rust
pub fn get_movements_all() -> &'static str {
    "SELECT id, variant_id, product_id, from_warehouse_id, to_warehouse_id, quantity, \"type\", created_at \
     FROM stock_movements ORDER BY created_at DESC"
}
```

And update `get_movements_by_variant()` to include product_id:

```rust
pub fn get_movements_by_variant() -> &'static str {
    "SELECT id, variant_id, product_id, from_warehouse_id, to_warehouse_id, quantity, \"type\", created_at \
     FROM stock_movements WHERE variant_id = ?1 ORDER BY created_at DESC"
}
```

- [ ] **Step 2: Update StockMovement serialization in stocks.rs commands**

In `src-tauri/src/commands/stocks.rs:170-185`, update to include product_id:

```rust
let movements = stmt
    .query_map([], |row| {
        Ok(StockMovement {
            id: row.get::<_, i64>(0)?.to_string(),
            variant_id: row.get::<_, i64>(1)?.to_string(),
            product_id: row.get::<_, i64>(2)?.to_string(),
            from_warehouse_id: row.get::<_, Option<i64>>(3)?.map(|v| v.to_string()),
            to_warehouse_id: row.get::<_, Option<i64>>(4)?.map(|v| v.to_string()),
            quantity: row.get(5)?,
            movement_type: row.get(6)?,
            created_at: row.get(7)?,
        })
    })
```

Update ALL query_map closures for stock_movements (there are 2 - in `stock_movements_get_all` and `stock_movements_get_by_variant`).

- [ ] **Step 3: Add stock_movements_get_by_warehouse command**

In `src-tauri/src/commands/stocks.rs`, after `stock_movements_get_by_variant` (around line 220):

```rust
#[tauri::command]
#[specta::specta]
pub async fn stock_movements_get_by_warehouse(
    app: AppHandle,
    warehouse_id: String,
) -> Result<Vec<StockMovement>, String> {
    let conn = get_conn(&app)?;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let mut stmt = conn
        .prepare(get_movements_by_warehouse())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let movements = stmt
        .query_map(params![warehouse_id_i64], |row| {
            Ok(StockMovement {
                id: row.get::<_, i64>(0)?.to_string(),
                variant_id: row.get::<_, i64>(1)?.to_string(),
                product_id: row.get::<_, i64>(2)?.to_string(),
                from_warehouse_id: row.get::<_, Option<i64>>(3)?.map(|v| v.to_string()),
                to_warehouse_id: row.get::<_, Option<i64>>(4)?.map(|v| v.to_string()),
                quantity: row.get(5)?,
                movement_type: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query stock movements: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock movements: {e}"))?;

    Ok(movements)
}
```

- [ ] **Step 4: Export new command from lib.rs**

Check `src-tauri/src/lib.rs` and ensure `stock_movements_get_by_warehouse` is exported with the other stock commands.

- [ ] **Step 5: Build to verify**

```bash
cd src-tauri && cargo build 2>&1 | head -50
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/sql/stocks.rs src-tauri/src/commands/stocks.rs src-tauri/src/lib.rs
git commit -m "feat: add stock_movements_get_by_warehouse command"
```

---

## Task 3: Create Backfill Migration Script

**Files:**
- Create: `src-tauri/migrations/001_backfill_product_id.sql`

- [ ] **Step 1: Create and run migration**

The migration file was already created conceptually in Task 1. Verify the content is correct and run it against the database using sqlite3 CLI:

```bash
sqlite3 your_database.db < src-tauri/migrations/001_backfill_product_id.sql
```

- [ ] **Step 2: Commit the migration file**

```bash
git add src-tauri/migrations/001_backfill_product_id.sql
git commit -m "chore: add product_id backfill migration"
```

---

## Task 4: Update tauri-bindings for new commands

**Files:**
- Modify: `src/lib/bindings.ts` (auto-generated, just trigger regeneration)

- [ ] **Step 1: Regenerate bindings**

```bash
pnpm run tauri:specta
```

This regenerates `src/lib/bindings.ts` with the new `stock_movements_get_by_warehouse` command.

- [ ] **Step 2: Verify bindings include new command**

Check that `stock_movements_get_by_warehouse` is present in generated bindings.

---

## Task 5: Create StockMovementsTable Component

**Files:**
- Create: `src/components/entity/StockMovementsTable.tsx`

- [ ] **Step 1: Create component with types**

```typescript
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import type { StockMovement } from '@/lib/bindings'

interface StockMovementsTableProps {
  movements: StockMovement[]
  isLoading: boolean
  error?: string
  variant?: 'variant' | 'product' | 'warehouse'
  warehouseNames?: Map<string, string>
  productNames?: Map<string, string>
  variantNames?: Map<string, string>
  emptyMessage?: string
}

export function StockMovementsTable({
  movements,
  isLoading,
  error,
  variant = 'variant',
  warehouseNames = new Map(),
  productNames = new Map(),
  variantNames = new Map(),
  emptyMessage,
}: StockMovementsTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-body-md text-error">{error}</p>
  }

  if (movements.length === 0) {
    return <p className="text-body-md text-on-surface-variant">{emptyMessage || 'No movements'}</p>
  }

  // Render based on variant type...
}
```

- [ ] **Step 2: Implement variant="variant" (paginated list)**

Simple table with columns: Type, Quantity, From, To, Date. Used in VariantDetailModal.

- [ ] **Step 3: Implement variant="product" (grouped by variant)**

Group movements by variant_id. Show variant name as sub-header before each variant's movements.

- [ ] **Step 4: Implement variant="warehouse" (grouped by product consecutively)**

Apply consecutive product grouping algorithm. Show product name as header with count, indented rows.

- [ ] **Step 5: Add pagination controls for variant variant**

Prev/Next buttons and page indicator. Only show when isPaginated prop is true.

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/StockMovementsTable.tsx
git commit -m "feat: add StockMovementsTable component"
```

---

## Task 6: Implement VariantDetailModal Audits Tab

**Files:**
- Modify: `src/components/entity/VariantDetailModal.tsx`

- [ ] **Step 1: Add state for stock movements**

```typescript
const [movements, setMovements] = useState<StockMovement[]>([])
const [isLoadingMovements, setIsLoadingMovements] = useState(false)
const [movementsError, setMovementsError] = useState('')
const [currentPage, setCurrentPage] = useState(1)
const [totalPages, setTotalPages] = useState(1)
const pageSize = 10
```

- [ ] **Step 2: Add loadMovements function**

```typescript
const loadMovements = useCallback(async () => {
  if (!entityId) return
  setIsLoadingMovements(true)
  const result = await commands.stockMovementsGetByVariant(entityId, pageSize, (currentPage - 1) * pageSize)
  setIsLoadingMovements(false)
  if (result.status === 'ok') {
    setMovements(result.data.movements)
    setTotalPages(result.data.total_pages)
  } else {
    setMovementsError(result.error ?? 'Failed to load movements')
  }
}, [entityId, currentPage])
```

- [ ] **Step 3: Load movements when audits tab is active**

Add useEffect to load when `activeTab === 'audits'`.

- [ ] **Step 4: Replace audits tab skeleton with StockMovementsTable**

```typescript
{activeTab === 'audits' && (
  <StockMovementsTable
    movements={movements}
    isLoading={isLoadingMovements}
    error={movementsError}
    variant="variant"
    warehouseNames={warehouseNames}
    emptyMessage={t('entity.audits.noMovementsVariant')}
    isPaginated
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    onRetry={loadMovements}
  />
)}
```

- [ ] **Step 5: Fetch warehouse names for the table**

Ensure warehouseNames Map is populated (already done in loadStockLevels).

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantDetailModal.tsx
git commit -m "feat: implement audits tab in VariantDetailModal with pagination"
```

---

## Task 7: Implement ProductDetailModal Audits Tab

**Files:**
- Modify: `src/components/entity/ProductDetailModal.tsx`

- [ ] **Step 1: Add state for stock movements**

```typescript
const [movements, setMovements] = useState<StockMovement[]>([])
const [isLoadingMovements, setIsLoadingMovements] = useState(false)
const [movementsError, setMovementsError] = useState('')
```

- [ ] **Step 2: Add loadMovements function**

Need to fetch all variants for this product, then for each variant get its 5 most recent movements. Create a special query or fetch all and filter.

```typescript
const loadMovements = useCallback(async () => {
  if (!entityId) return
  setIsLoadingMovements(true)
  
  // First get all variant IDs for this product
  const variantsResult = await commands.variantsGetByProduct(entityId)
  if (variantsResult.status !== 'ok') {
    setMovementsError(variantsResult.error ?? 'Failed to load variants')
    setIsLoadingMovements(false)
    return
  }
  
  // For each variant, fetch 5 most recent movements
  // This could be one query if we add a dedicated command
  const allMovements: StockMovement[] = []
  for (const variant of variantsResult.data) {
    const movResult = await commands.stockMovementsGetByVariant(variant.id, 5, 0)
    if (movResult.status === 'ok') {
      allMovements.push(...movResult.data.movements)
    }
  }
  
  // Sort by created_at DESC
  allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  setMovements(allMovements)
  setIsLoadingMovements(false)
}, [entityId])
```

Actually, for efficiency we should add a new Rust command that does this in one query. But per spec we can do it in React for now. If performance becomes an issue, we'll add a dedicated SQL query.

- [ ] **Step 3: Replace audits tab skeleton with StockMovementsTable (grouped by variant)**

```typescript
{activeTab === 'audits' && (
  <StockMovementsTable
    movements={movements}
    isLoading={isLoadingMovements}
    error={movementsError}
    variant="product"
    emptyMessage={t('entity.audits.noMovementsProduct')}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/ProductDetailModal.tsx
git commit -m "feat: implement audits tab in ProductDetailModal with variant grouping"
```

---

## Task 8: Implement WarehouseDetailModal Audits Tab with Product Grouping

**Files:**
- Modify: `src/components/entity/WarehouseDetailModal.tsx`

- [ ] **Step 1: Add state for stock movements and product/variant names**

```typescript
const [movements, setMovements] = useState<StockMovement[]>([])
const [isLoadingMovements, setIsLoadingMovements] = useState(false)
const [movementsError, setMovementsError] = useState('')
const [productNames, setProductNames] = useState<Map<string, string>>(new Map())
const [variantNames, setVariantNames] = useState<Map<string, string>>(new Map())
```

- [ ] **Step 2: Add loadMovements function**

```typescript
const loadMovements = useCallback(async () => {
  if (!entityId) return
  setIsLoadingMovements(true)
  
  const result = await commands.stockMovementsGetByWarehouse(entityId)
  setIsLoadingMovements(false)
  
  if (result.status === 'ok') {
    setMovements(result.data)
    
    // Fetch product names for grouping display
    const uniqueProductIds = [...new Set(result.data.map(m => m.product_id))]
    // Batch fetch products...
    
    // Fetch variant names
    const uniqueVariantIds = [...new Set(result.data.map(m => m.variant_id))]
    // Batch fetch variants...
  } else {
    setMovementsError(result.error ?? 'Failed to load movements')
  }
}, [entityId])
```

- [ ] **Step 3: Replace audits tab skeleton with StockMovementsTable (warehouse grouping)**

```typescript
{activeTab === 'audits' && (
  <StockMovementsTable
    movements={movements}
    isLoading={isLoadingMovements}
    error={movementsError}
    variant="warehouse"
    productNames={productNames}
    variantNames={variantNames}
    emptyMessage={t('entity.audits.noMovementsWarehouse')}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/WarehouseDetailModal.tsx
git commit -m "feat: implement audits tab in WarehouseDetailModal with product grouping"
```

---

## Task 9: Update StockMovementForm to pass product_id

**Files:**
- Modify: `src/components/entity-form/StockMovementForm.tsx`

- [ ] **Step 1: Ensure product_id flows through to movement creation**

The form receives variant_id which should carry product_id context. Ensure when calling create_transfer, create_purchase, etc., the product_id is passed.

- [ ] **Step 2: Commit**

```bash
git add src/components/entity-form/StockMovementForm.tsx
git commit -m "feat: pass product_id in stock movement form submission"
```

---

## Task 10: Verify and test

**Files:**
- Test various flows in the application

- [ ] **Step 1: Start the app and verify builds**

```bash
pnpm run tauri:dev 2>&1 | head -100
```

Fix any type errors or compilation issues.

- [ ] **Step 2: Test VariantDetailModal audits tab**

Open a variant detail modal, switch to audits tab, verify pagination works.

- [ ] **Step 3: Test ProductDetailModal audits tab**

Open a product detail modal, switch to audits tab, verify variant grouping works.

- [ ] **Step 4: Test WarehouseDetailModal audits tab**

Open a warehouse detail modal, switch to audits tab, verify consecutive product grouping works.

- [ ] **Step 5: Run check:all**

```bash
pnpm run check:all
```

Fix any lint or type errors.

---

## File Summary

### Rust Files Modified
- `src-tauri/src/sql/stocks.rs` - Schema and queries
- `src-tauri/src/commands/stocks.rs` - StockMovement struct and new command
- `src-tauri/src/commands/stock_movements.rs` - execute_movement signature update
- `src-tauri/src/seed/movements.rs` - Pass product_id in seed
- `src-tauri/src/lib.rs` - Export new command

### Rust Files Created
- `src-tauri/migrations/001_backfill_product_id.sql` - Migration

### Frontend Files Created
- `src/components/entity/StockMovementsTable.tsx` - Reusable component

### Frontend Files Modified
- `src/components/entity/VariantDetailModal.tsx` - Audits tab
- `src/components/entity/ProductDetailModal.tsx` - Audits tab
- `src/components/entity/WarehouseDetailModal.tsx` - Audits tab
- `src/components/entity-form/StockMovementForm.tsx` - Pass product_id

---

## Dependencies

1. Task 1 must complete before Tasks 2, 3
2. Task 2 must complete before Task 4
3. Task 4 must complete before Tasks 5, 6, 7, 8
4. Tasks 5, 6, 7, 8 are independent but should follow order for testing

---

## Notes

- Movement types: `PURCHASE`, `SALE`, `TRANSFER`, `ADJUST`
- Page size constant: 10
- ProductDetailModal limit per variant: 5
- Warehouse grouping: consecutive product_id sequences, no collapse