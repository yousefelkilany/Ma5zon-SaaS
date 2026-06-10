# Bulk-by-ID Fetch Pattern

**Status:** Approved design (pending implementation)
**Date:** 2026-06-10
**Scope:** New `get_by_ids` command + bulk prefetch hooks for every entity that already has a `get_by_id` command, used to populate name maps in `StockMovementsTable`.

## Problem

`StockMovementsTable` renders rows containing only ids (`variant_id`, `product_id`, `from_warehouse_id`, `to_warehouse_id`) and currently has to display the raw id when it can't find a name in a lookup map. The only name source wired in today is `useWarehouses()`, which returns *all* warehouses. There is no equivalent for products or variants, so the table falls back to the raw id for those columns.

Calling `useGetProduct(id)` per row would be N round-trips through Tauri → Rust → SQLite. The fix is a single bulk-by-id fetch per entity, plus a thin TanStack Query hook that prefills the existing per-id detail caches so the rest of the app (modals, etc.) benefits for free.

## Goals

- One command per entity that takes `ids: Vec<i64>` and returns the matching rows in a single SQL round-trip.
- One TanStack Query hook per entity that calls the bulk command and prefills the per-id detail cache used by `useGetProduct` / `useGetVariant` / `useGetWarehouse` / `useGetUser`.
- Wire the new hooks into `StockMovementsTable` so the three name maps are populated from real data instead of empty `Map`s.
- Keep the pattern generic enough to be applied uniformly to all four entities (products, variants, warehouses, users).

## Non-Goals (YAGNI)

- No new "generic dispatcher" command that takes an `entityType` discriminator on the Rust side. Four small symmetric commands are clearer.
- No separate `['entity', type, 'all']` list cache. The existing paginated list queries use a different key shape, and pre-creating an `all` cache would be unused.
- No pagination / cursor on bulk fetch. `IN (...)` with a few dozen ids is the realistic max per table render.
- No changes to `ProductModal` / `VariantModal` — they already read from the per-id detail caches that we will be prefilling.

## Design

### 1. Rust — SQL helpers

For each of `products`, `variants`, `warehouses`, `users`, add a function in `src-tauri/src/sql/<entity>.rs`:

```rust
pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, ... FROM active_<entity>s WHERE id IN ({placeholders})"
    )
}
```

Notes:

- The number of placeholders is decided at *call* time, so the helper actually takes an `n: usize` argument and returns the formatted SQL string. (Returning `&'static str` is not possible when the placeholder count varies.)
- Follow the column list of the existing `get_by_id()` in the same file so the deserialization shape stays identical.
- Uses the `active_*` views so soft-deleted rows are excluded, matching `get_by_id`.

### 2. Rust — commands

Add one command per entity file in `src-tauri/src/commands/<entity>.rs`, with the same shape:

```rust
#[tauri::command]
#[specta::specta]
pub async fn products_get_by_ids(
    app: AppHandle,
    ids: Vec<i64>,
) -> Result<Vec<Product>, String> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let conn = get_conn(&app)?;
    let sql = sql::products::get_by_ids(ids.len());
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("products_get_by_ids: prepare failed: {e}"))?;
    let products = stmt
        .query_map(rusqlite::params_from_iter(ids.iter()), |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                company: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
            }
        })
        .map_err(|e| format!("products_get_by_ids: query failed: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("products_get_by_ids: collect failed: {e}"))?;
    Ok(products)
}
```

Three sibling commands with the matching entity type and row mapping: `variants_get_by_ids`, `warehouses_get_by_ids`, `users_get_by_ids`. Each lives in its own `commands/<entity>.rs` next to the existing `*_get_by_id` command and follows the same error-formatting convention.

Behavior:

- Empty `ids` short-circuits to `Ok(vec![])` — no SQL is run.
- Unknown or soft-deleted ids are simply absent from the result. The caller treats the response as a set.

Register all four in `src-tauri/src/bindings.rs` and regenerate `src/lib/bindings.ts` via `pnpm run rust:bindings`.

### 3. React — bulk prefetch hooks

Add four hooks in `src/services/entity/queries.ts`, mirroring the existing `useGetProduct` / `useWarehouses` style. Using `useBulkProducts` as the template:

```ts
export function useBulkProducts(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'products', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.productsGetByIds(
        ids.map(Number).filter(Number.isFinite)
      )
      const data = unwrap(result)
      data.forEach((p) => {
        queryClient.setQueryData(
          entityQueryKeys.detail('product', p.id),
          p
        )
      })
      return data
    },
    enabled: ids.length > 0,
  })
}
```

`useBulkVariants`, `useBulkWarehouses`, `useBulkUsers` follow the same pattern with the matching command and key type.

Key choices:

- **Stable key**: sort `ids` before putting them in the key so `["1","2"]` and `["2","1"]` hit the same cache.
- **Id parsing**: the React layer carries ids as strings; the Rust command takes `i64`. `Number(...)` then `filter(Number.isFinite)` guards against `NaN` / non-numeric input.
- **Prefill target**: only the per-id detail cache `entityQueryKeys.detail(type, id)`. No new `['entity', type, 'all']` list cache.
- **Dedup**: not needed in JS — SQLite `IN (...)` collapses duplicates.

### 4. Wiring into `StockMovementsTable.tsx`

Replace the empty maps at `src/components/entity/StockMovementsTable.tsx:49-52` and the `useWarehouses()` call at line 53 with three bulk hooks fed by ids extracted from the `movements` prop:

```ts
const productIds = useMemo(
  () => unique(movements.flatMap((m) => (m.product_id ? [m.product_id] : []))),
  [movements]
)
const variantIds = useMemo(
  () => unique(movements.map((m) => m.variant_id)),
  [movements]
)
const warehouseIds = useMemo(
  () =>
    unique(
      movements.flatMap((m) =>
        [m.from_warehouse_id, m.to_warehouse_id].filter(Boolean) as string[]
      )
    ),
  [movements]
)

const { data: products } = useBulkProducts(productIds)
const { data: variants } = useBulkVariants(variantIds)
const { data: warehouses } = useBulkWarehouses(warehouseIds)
```

Then build the three lookup `Map<string, string>`s in a `useMemo` over `(products, variants, warehouses)`. `ProductMovementsView` (variant-names view) and `WarehouseMovementsView` (product-names view) get the same maps; the unused ones stay as `new Map()` so child prop signatures don't change.

`enabled: ids.length > 0` plus the table's existing `isLoading` prop means we don't need to thread new loading state — the table renders skeletons until `movements` arrives, and the bulk hooks resolve in parallel.

The unused `useMemo` import is fine; it stays because `groupMovementsByVariantId` and the `WarehouseMovementsView` grouping still need it.

### 5. Error handling

- **Hook level**: same `unwrap` pattern as existing hooks. A throw propagates to TanStack Query and is surfaced via the existing `error` prop on the table.
- **Rust level**: returns `Result<Vec<T>, String>`; SQL prepare / execution errors are formatted the same way as existing commands. No new error types.

## Testing

- **Rust unit** (per entity, wherever the project already houses SQL tests — confirmed during plan): `get_by_ids(n)` returns a SQL string with exactly `n` placeholders.
- **Rust integration** in the existing commands test harness: insert 2 rows, call `*_get_by_ids` with 3 ids (one unknown), assert exactly the 2 known rows come back in the right order.
- **Hook test** in `src/services/entity/__tests__/queries.test.ts`: mock `commands.productsGetByIds` to resolve with 2 products; render `useBulkProducts(["1","2"])`; assert both `entityQueryKeys.detail('product','1')` and `entityQueryKeys.detail('product','2')` cache entries are populated and the hook returns the data. Also assert the `enabled` flag is honored when `ids` is empty.
- **No new e2e test**: the wiring change is small and the existing table renders are covered visually.

## Files Touched

- `src-tauri/src/sql/{products,variants,warehouses,users}.rs` — new `get_by_ids(n)` helper
- `src-tauri/src/commands/{products,variants,warehouses,users}.rs` — new `*_get_by_ids` command
- `src-tauri/src/bindings.rs` — register four commands
- `src/lib/bindings.ts` — regenerated
- `src/services/entity/queries.ts` — four new bulk hooks
- `src/services/entity/__tests__/queries.test.ts` — hook tests
- `src/components/entity/StockMovementsTable.tsx` — use the new hooks, drop `useWarehouses`

## Out of Scope (re-stated)

- No generic dispatcher on either side.
- No `['entity', type, 'all']` list cache.
- No `ProductModal` / `VariantModal` changes (they inherit the prefilled caches for free).
- No pagination on bulk fetch.
