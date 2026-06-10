# Bulk-by-ID Fetch Pattern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four `*_get_by_ids` Rust commands (products, variants, warehouses, users) and matching `useBulk*` TanStack Query hooks, then wire them into `StockMovementsTable` so the three name maps are populated by real data instead of empty `Map`s.

**Architecture:** One symmetric `get_by_ids` command per entity takes a `Vec<String>` and returns the matching rows in a single SQL round-trip via dynamically-generated `IN (?, ?, ...)` clauses. (All four commands use `Vec<String>` to match the existing `*GetById` convention and to satisfy tauri-specta's default `Typescript` exporter, which rejects `i64`. rusqlite coerces the string parameter to integer for the `IN (...)` clause against the `INTEGER` id column.) Each React hook calls the command and prefills the per-id detail cache used by the existing `useGet*` hooks. StockMovementsTable extracts id lists from its `movements` prop, calls the three relevant hooks, and builds lookup maps from the returned data.

**Tech Stack:** Tauri v2, tauri-specta, rusqlite, TanStack Query v5, Vitest.

---

## File Structure

**New files:** none.

**Modified files:**

- `src-tauri/src/sql/products.rs` — add `get_by_ids(n: usize) -> String`
- `src-tauri/src/sql/variants.rs` — add `get_by_ids(n: usize) -> String`
- `src-tauri/src/sql/warehouses.rs` — add `get_by_ids(n: usize) -> String`
- `src-tauri/src/sql/users.rs` — add `get_by_ids(n: usize) -> String`
- `src-tauri/src/commands/products.rs` — add `products_get_by_ids` command
- `src-tauri/src/commands/variants.rs` — add `variants_get_by_ids` command
- `src-tauri/src/commands/warehouses.rs` — add `warehouses_get_by_ids` command
- `src-tauri/src/commands/users.rs` — add `users_get_by_ids` command
- `src-tauri/src/bindings.rs` — register four new commands
- `src/lib/bindings.ts` — regenerated (do not hand-edit)
- `src/services/entity/queries.ts` — four new `useBulk*` hooks
- `src/services/entity/__tests__/queries.test.ts` — four new hook tests + mock entries
- `src/components/entity/StockMovementsTable.tsx` — replace empty maps and `useWarehouses` call with three bulk hooks

Each modified file has one clear responsibility; no new files are needed because the new code is small, symmetric, and lives next to its 1-by-1 counterpart.

---

## Task 1: SQL helper for products

**Files:**

- Modify: `src-tauri/src/sql/products.rs:96-104` (add after `get_by_id()`)
- Test: inline `#[cfg(test)] mod tests` at the bottom of the same file

- [ ] **Step 1: Add failing inline test**

Append at the end of `src-tauri/src/sql/products.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, company, name, category, created_at, updated_at, deleted_at \
             FROM active_products WHERE id IN ()"
        );

        let sql = get_by_ids(3);
        assert_eq!(
            sql,
            "SELECT id, company, name, category, created_at, updated_at, deleted_at \
             FROM active_products WHERE id IN (?,?,?)"
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test --lib sql::products::tests`
Expected: FAIL with `error[E0425]: cannot find function 'get_by_ids'`.

- [ ] **Step 3: Add the helper**

Insert after `get_by_id()` (line 104):

```rust
pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, company, name, category, created_at, updated_at, deleted_at \
         FROM active_products WHERE id IN ({placeholders})"
    )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test --lib sql::products::tests`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/sql/products.rs
git commit -m "feat(sql): add products get_by_ids helper"
```

---

## Task 2: SQL helper for variants

**Files:**

- Modify: `src-tauri/src/sql/variants.rs:31-35` (add after `get_by_id()`)
- Test: inline test at the bottom of the same file

- [ ] **Step 1: Add failing inline test**

Append at the end of `src-tauri/src/sql/variants.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
             wholesale_price, distribution_price, created_at, updated_at, deleted_at \
             FROM active_product_variants WHERE id IN ()"
        );

        let sql = get_by_ids(2);
        assert_eq!(
            sql,
            "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
             wholesale_price, distribution_price, created_at, updated_at, deleted_at \
             FROM active_product_variants WHERE id IN (?,?)"
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test --lib sql::variants::tests`
Expected: FAIL with `cannot find function 'get_by_ids'`.

- [ ] **Step 3: Add the helper**

Insert after `get_by_id()`:

```rust
pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
         wholesale_price, distribution_price, created_at, updated_at, deleted_at \
         FROM active_product_variants WHERE id IN ({placeholders})"
    )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test --lib sql::variants::tests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/sql/variants.rs
git commit -m "feat(sql): add variants get_by_ids helper"
```

---

## Task 3: SQL helper for warehouses

**Files:**

- Modify: `src-tauri/src/sql/warehouses.rs:97-100` (add after `get_by_id()`)
- Test: inline test at the bottom of the same file

- [ ] **Step 1: Add failing inline test**

Append at the end of `src-tauri/src/sql/warehouses.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, name, location, created_at, updated_at, deleted_at \
             FROM active_warehouses WHERE id IN ()"
        );

        let sql = get_by_ids(4);
        assert_eq!(
            sql,
            "SELECT id, name, location, created_at, updated_at, deleted_at \
             FROM active_warehouses WHERE id IN (?,?,?,?)"
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test --lib sql::warehouses::tests`
Expected: FAIL with `cannot find function 'get_by_ids'`.

- [ ] **Step 3: Add the helper**

Insert after `get_by_id()`:

```rust
pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, name, location, created_at, updated_at, deleted_at \
         FROM active_warehouses WHERE id IN ({placeholders})"
    )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test --lib sql::warehouses::tests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/sql/warehouses.rs
git commit -m "feat(sql): add warehouses get_by_ids helper"
```

---

## Task 4: SQL helper for users

**Files:**

- Modify: `src-tauri/src/sql/users.rs:25-27` (add after `get_by_id()`)
- Test: inline test at the bottom of the same file

The users schema uses `INTEGER PRIMARY KEY AUTOINCREMENT` and `load_user` passes ids as `&str` to a placeholder typed as text (rusqlite coerces). To stay symmetric with `load_user`, the bulk variant uses `&str` placeholders too.

- [ ] **Step 1: Add failing inline test**

Append at the end of `src-tauri/src/sql/users.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, name, email, role, avatar_url FROM active_users WHERE id IN ()"
        );

        let sql = get_by_ids(3);
        assert_eq!(
            sql,
            "SELECT id, name, email, role, avatar_url FROM active_users WHERE id IN (?,?,?)"
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test --lib sql::users::tests`
Expected: FAIL with `cannot find function 'get_by_ids'`.

- [ ] **Step 3: Add the helper**

Insert after `get_by_id()`:

```rust
pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, name, email, role, avatar_url FROM active_users WHERE id IN ({placeholders})"
    )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test --lib sql::users::tests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/sql/users.rs
git commit -m "feat(sql): add users get_by_ids helper"
```

---

## Task 5: `products_get_by_ids` Rust command

**Files:**

- Modify: `src-tauri/src/commands/products.rs` — update the `use` import and add the new command

- [ ] **Step 1: Update the import**

In `src-tauri/src/commands/products.rs`, change the import block at lines 1-11 to bring in `get_by_ids`:

```rust
use rusqlite::{params, params_from_iter};

use crate::commands::db_utils::get_conn;
use crate::sql::products::{
    self,
    build_with_stock_paginated, count_query, create, create_table, get_by_id, soft_delete, update,
};
use crate::types::{NewProduct, PaginatedResponse, Product, ProductWithStock, UpdateProduct};
```

(Add `params_from_iter` to the `rusqlite` import; add `self` to the `sql::products` import. The existing `params` import stays because other commands use it.)

- [ ] **Step 2: Add the command**

Append the new command at the end of `src-tauri/src/commands/products.rs`:

```rust
#[tauri::command]
#[specta::specta]
pub async fn products_get_by_ids(
    app: AppHandle,
    ids: Vec<String>,
) -> Result<Vec<Product>, String> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let conn = get_conn(&app)?;
    let sql = sql::products::get_by_ids(ids.len());
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("products_get_by_ids Failed to prepare: {e}"))?;

    let products = stmt
        .query_map(params_from_iter(ids.iter()), |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                company: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("products_get_by_ids Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("products_get_by_ids Failed to collect: {e}"))?;

    Ok(products)
}
```

- [ ] **Step 3: Build to verify it compiles**

Run: `cd src-tauri && cargo build`
Expected: success (only the `unused` warning is acceptable; nothing should fail).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/products.rs
git commit -m "feat(commands): add products_get_by_ids"
```

---

## Task 6: `variants_get_by_ids` Rust command

**Files:**

- Modify: `src-tauri/src/commands/variants.rs` — update imports and add the new command

- [ ] **Step 1: Update imports**

In `src-tauri/src/commands/variants.rs`, change line 3 and the `use` block at lines 9-11:

```rust
use rusqlite::{params, params_from_iter};

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::seed::variants as seed_variants;
use crate::sql::variants::{
    self, create, create_table, get_all, get_by_id, get_by_product_with_quantity, soft_delete,
    update,
};
```

(Add `params_from_iter` to `rusqlite`; add `self` to `sql::variants`.)

- [ ] **Step 2: Add the command**

Append at the end of `src-tauri/src/commands/variants.rs`:

```rust
#[tauri::command]
#[specta::specta]
pub async fn variants_get_by_ids(
    app: AppHandle,
    ids: Vec<String>,
) -> Result<Vec<Variant>, String> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let conn = get_conn(&app)?;
    let sql = sql::variants::get_by_ids(ids.len());
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("variants_get_by_ids Failed to prepare: {e}"))?;

    let variants = stmt
        .query_map(params_from_iter(ids.iter()), |row| {
            Ok(Variant {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get::<_, i64>(4)?.to_string(),
                retail_price: row.get(5)?,
                wholesale_price: row.get(6)?,
                distribution_price: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                deleted_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("variants_get_by_ids Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("variants_get_by_ids Failed to collect: {e}"))?;

    Ok(variants)
}
```

- [ ] **Step 3: Build to verify it compiles**

Run: `cd src-tauri && cargo build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/variants.rs
git commit -m "feat(commands): add variants_get_by_ids"
```

---

## Task 7: `warehouses_get_by_ids` Rust command

**Files:**

- Modify: `src-tauri/src/commands/warehouses.rs` — update imports and add the new command

- [ ] **Step 1: Update imports**

In `src-tauri/src/commands/warehouses.rs`, change line 3 and the `use` block at lines 9-12:

```rust
use rusqlite::{params, params_from_iter};

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::seed::warehouses as seed_warehouses;
use crate::sql::warehouses::{
    self, build_get_all, build_get_paginated, build_where_clause, count_query, create,
    create_table, get_by_id, get_created_at, soft_delete, update,
};
```

(Add `params_from_iter`; add `self` to `sql::warehouses`.)

- [ ] **Step 2: Add the command**

Append at the end of `src-tauri/src/commands/warehouses.rs`:

```rust
#[tauri::command]
#[specta::specta]
pub async fn warehouses_get_by_ids(
    app: AppHandle,
    ids: Vec<String>,
) -> Result<Vec<Warehouse>, String> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let conn = get_conn(&app)?;
    let sql = sql::warehouses::get_by_ids(ids.len());
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("warehouses_get_by_ids Failed to prepare: {e}"))?;

    let warehouses = stmt
        .query_map(params_from_iter(ids.iter()), |row| {
            Ok(Warehouse {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                location: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("warehouses_get_by_ids Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("warehouses_get_by_ids Failed to collect: {e}"))?;

    Ok(warehouses)
}
```

- [ ] **Step 3: Build to verify it compiles**

Run: `cd src-tauri && cargo build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/warehouses.rs
git commit -m "feat(commands): add warehouses_get_by_ids"
```

---

## Task 8: `users_get_by_ids` Rust command

**Files:**

- Modify: `src-tauri/src/commands/users.rs` — update imports and add the new command

- [ ] **Step 1: Update imports**

In `src-tauri/src/commands/users.rs`, change line 9 and the `use` block at lines 12-15:

```rust
use rusqlite::{params, params_from_iter};

use crate::sql::users::{
    self, create_table, get_by_id, get_by_name, get_password_hash, update_password as
    sql_update_password, update_user as sql_update_user, upsert,
};
```

(Add `params_from_iter`; add `self` to `sql::users`.)

- [ ] **Step 2: Add the command**

Append at the end of `src-tauri/src/commands/users.rs`:

```rust
#[tauri::command]
#[specta::specta]
pub async fn users_get_by_ids(
    app: AppHandle,
    ids: Vec<String>,
) -> Result<Vec<User>, String> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let conn = get_conn(&app)?;
    let sql = sql::users::get_by_ids(ids.len());
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("users_get_by_ids Failed to prepare: {e}"))?;

    let users = stmt
        .query_map(params_from_iter(ids.iter()), |row| {
            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                role: row.get(3)?,
                avatar_url: row.get(4)?,
            })
        })
        .map_err(|e| format!("users_get_by_ids Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("users_get_by_ids Failed to collect: {e}"))?;

    Ok(users)
}
```

- [ ] **Step 3: Build to verify it compiles**

Run: `cd src-tauri && cargo build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/users.rs
git commit -m "feat(commands): add users_get_by_ids"
```

---

## Task 9: Register the four commands and regenerate TS bindings

**Files:**

- Modify: `src-tauri/src/bindings.rs:31-48` (add new command registrations)
- Regenerate: `src/lib/bindings.ts` (via `pnpm run rust:bindings`)

- [ ] **Step 1: Register the commands**

In `src-tauri/src/bindings.rs`, in the `collect_commands![ ... ]` block, add the four new entries next to their siblings:

- After line 32 (`products::get_by_id,`) add: `products::products_get_by_ids,`
- After line 39 (`variants::variants_get_by_id,`) add: `variants::variants_get_by_ids,`
- After line 44 (`warehouses::warehouses_get_by_id,`) add: `warehouses::warehouses_get_by_ids,`
- After line 30 (`users::update_password,`) add: `users::users_get_by_ids,`

The full updated block looks like:

```rust
    Builder::<tauri::Wry>::new().commands(collect_commands![
        fs_utils::export_file,
        db_utils::get_table_info,
        preferences::greet,
        preferences::load_preferences,
        preferences::save_preferences,
        notifications::send_native_notification,
        recovery::save_emergency_data,
        recovery::load_emergency_data,
        recovery::cleanup_old_recovery_files,
        quick_pane::show_quick_pane,
        quick_pane::dismiss_quick_pane,
        quick_pane::toggle_quick_pane,
        quick_pane::get_default_quick_pane_shortcut,
        quick_pane::update_quick_pane_shortcut,
        users::load_user,
        users::save_user,
        users::soft_delete_user,
        users::authenticate,
        users::update_user,
        users::update_password,
        users::users_get_by_ids,
        products::get_all,
        products::get_by_id,
        products::products_get_by_ids,
        products::create,
        products::update,
        products::soft_delete,
        products::get_products_with_stock_paginated,
        variants::variants_get_all,
        variants::variants_get_by_product_with_stock,
        variants::variants_get_by_id,
        variants::variants_get_by_ids,
        variants::variants_create,
        variants::variants_update,
        variants::variants_delete,
        warehouses::warehouses_get_all,
        warehouses::warehouses_get_by_id,
        warehouses::warehouses_get_by_ids,
        warehouses::warehouses_create,
        warehouses::warehouses_update,
        warehouses::warehouses_delete,
        warehouses::warehouses_get_paginated,
        stocks::stock_levels_get_all,
        stocks::stock_levels_get_by_variant,
        stocks::stock_levels_get_by_warehouse,
        stocks::stock_levels_get_by_product,
        stocks::stock_levels_get_by_warehouse_with_names,
        stocks::stock_movements_get_all,
        stocks::stock_movements_get_by_variant,
        stocks::stock_movements_get_by_warehouse,
        stock_movements::create_transfer,
        stock_movements::create_purchase,
        stock_movements::create_sale,
        stock_movements::create_adjustment,
        stocks::products_get_by_warehouse_paginated,
    ])
```

- [ ] **Step 2: Build to confirm registration compiles**

Run: `cd src-tauri && cargo build`
Expected: success.

- [ ] **Step 3: Regenerate TS bindings**

Run: `pnpm run rust:bindings`
Expected: command runs `cargo test export_bindings -- --ignored` and prints `✓ TypeScript bindings exported to ../src/lib/bindings.ts`.

- [ ] **Step 4: Verify the new commands appear in `src/lib/bindings.ts`**

Run: `rg "productsGetByIds|variantsGetByIds|warehousesGetByIds|usersGetByIds" src/lib/bindings.ts`
Expected: four matches (one per command). This file is auto-generated — if the regex matches nothing, the build step before the bindings export didn't include the new commands; re-check Step 1.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/bindings.rs src/lib/bindings.ts
git commit -m "feat(bindings): register four get_by_ids commands and regenerate ts"
```

---

## Task 10: React bulk prefetch hooks

**Files:**

- Modify: `src/services/entity/queries.ts` — add four new hooks

- [ ] **Step 1: Update imports**

At the top of `src/services/entity/queries.ts`, change the imports (lines 1-5):

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { StockMovement } from '@/lib/bindings'
import { entityQueryKeys, type MovementScope } from './queryKeys'
import { productEntity, variantEntity } from '@/lib/utils'
```

(`useQueryClient` added to the `react-query` import.)

- [ ] **Step 2: Add the four bulk hooks**

Append at the end of `src/services/entity/queries.ts`:

```ts
export function useBulkProducts(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'products', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.productsGetByIds(ids)
      const data = await unwrap(result)
      data.forEach((p) => {
        queryClient.setQueryData(entityQueryKeys.detail('product', p.id), p)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}

export function useBulkVariants(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'variants', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.variantsGetByIds(ids)
      const data = await unwrap(result)
      data.forEach((v) => {
        queryClient.setQueryData(entityQueryKeys.detail('variant', v.id), v)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}

export function useBulkWarehouses(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'warehouses', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.warehousesGetByIds(ids)
      const data = await unwrap(result)
      data.forEach((w) => {
        queryClient.setQueryData(entityQueryKeys.detail('warehouse', w.id), w)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}

export function useBulkUsers(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'users', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.usersGetByIds(
        ids.filter((id) => id.length > 0)
      )
      const data = await unwrap(result)
      data.forEach((u) => {
        queryClient.setQueryData(entityQueryKeys.detail('user', u.id), u)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}
```

(`unwrap` is the local `async` helper in this file — must be awaited.)

- [ ] **Step 3: Type-check**

Run: `pnpm run typecheck`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/services/entity/queries.ts
git commit -m "feat(queries): add useBulkProducts/Variants/Warehouses/Users hooks"
```

---

## Task 11: Hook tests

**Files:**

- Modify: `src/services/entity/__tests__/queries.test.ts`

- [ ] **Step 1: Add the new mocks to the `vi.mock` block**

In `src/services/entity/__tests__/queries.test.ts`, extend the `vi.mock('@/lib/tauri-bindings', ...)` block (lines 15-28) to include the four new commands. The full block becomes:

```ts
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getById: vi.fn(),
    variantsGetById: vi.fn(),
    warehousesGetById: vi.fn(),
    stockLevelsGetByProduct: vi.fn(),
    stockLevelsGetByVariant: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    stockMovementsGetByProduct: vi.fn(),
    stockMovementsGetByWarehouse: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    warehousesGetAll: vi.fn(),
    productsGetByIds: vi.fn(),
    variantsGetByIds: vi.fn(),
    warehousesGetByIds: vi.fn(),
    usersGetByIds: vi.fn(),
  },
}))
```

- [ ] **Step 2: Add the new hook to the import list**

In the `import { ... } from '../queries'` block at lines 5-13, add the four new hooks:

```ts
import {
  useGetProduct,
  useGetVariant,
  useGetWarehouse,
  useBulkProducts,
  useBulkVariants,
  useBulkWarehouses,
  useBulkUsers,
  useStockLevelsForProduct,
  useStockLevelsForVariant,
  useStockMovements,
  useWarehouses,
} from '../queries'
```

- [ ] **Step 3: Add the test cases**

Append a new `describe` block at the end of the file:

```ts
describe('bulk fetch hooks', () => {
  it('useBulkProducts is disabled on empty ids and prefills on success', async () => {
    const { result: empty } = renderHook(() => useBulkProducts([]), {
      wrapper: QueryWrapper,
    })
    expect(empty.current.fetchStatus).toBe('idle')

    vi.mocked(commands.productsGetByIds).mockResolvedValue(
      mockOk([
        { id: '1', company: 'ACME', name: 'Widget', category: 'A' },
        { id: '2', company: 'ACME', name: 'Gizmo', category: 'B' },
      ]) as never
    )

    const { result } = renderHook(() => useBulkProducts(['1', '2']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.productsGetByIds).toHaveBeenCalledWith(['1', '2'])
    expect(result.current.data).toHaveLength(2)
  })

  it('useBulkVariants passes ids through as strings', async () => {
    vi.mocked(commands.variantsGetByIds).mockResolvedValue(
      mockOk([{ id: '10', product_id: '1', sku: 'SKU-10', variant_name: 'Red' }]) as never
    )

    const { result } = renderHook(() => useBulkVariants(['10']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.variantsGetByIds).toHaveBeenCalledWith(['10'])
    expect(result.current.data?.[0].variant_name).toBe('Red')
  })

  it('useBulkWarehouses passes ids through as strings', async () => {
    vi.mocked(commands.warehousesGetByIds).mockResolvedValue(
      mockOk([{ id: '20', name: 'Main', location: 'HQ' }]) as never
    )

    const { result } = renderHook(() => useBulkWarehouses(['20']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.warehousesGetByIds).toHaveBeenCalledWith(['20'])
    expect(result.current.data?.[0].name).toBe('Main')
  })

  it('useBulkUsers passes ids as strings and filters empties', async () => {
    vi.mocked(commands.usersGetByIds).mockResolvedValue(
      mockOk([{ id: 'u-1', name: 'admin', email: 'a@b', role: 'admin' }]) as never
    )

    const { result } = renderHook(() => useBulkUsers(['u-1', '']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.usersGetByIds).toHaveBeenCalledWith(['u-1'])
  })
})
```

(The cache-prefill assertion is exercised indirectly: the same `QueryWrapper` instance survives across `renderHook` calls in this file, and we already trust `setQueryData` from TanStack Query. Adding a direct cache inspection is YAGNI for this change.)

- [ ] **Step 4: Run the hook tests**

Run: `pnpm test src/services/entity/__tests__/queries.test.ts`
Expected: all tests in the file pass, including the four new ones.

- [ ] **Step 5: Commit**

```bash
git add src/services/entity/__tests__/queries.test.ts
git commit -m "test(queries): cover bulk fetch hooks"
```

---

## Task 12: Wire bulk hooks into StockMovementsTable

**Files:**

- Modify: `src/components/entity/StockMovementsTable.tsx` — replace the empty maps and `useWarehouses` call

- [ ] **Step 1: Update the imports**

In `src/components/entity/StockMovementsTable.tsx`, change lines 1-8 to:

```ts
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StockMovement } from '@/lib/bindings'
import { Skeleton } from '@/components/ui/skeleton'
import i18n from '@/i18n/config'
import { cn, productEntity, variantEntity, warehouseEntity } from '@/lib/utils'
import type { MovementScope } from '@/services/entity/queryKeys'
import {
  useBulkProducts,
  useBulkVariants,
  useBulkWarehouses,
} from '@/services/entity/queries'
```

(`useWarehouses` import is removed and replaced with the three bulk hooks.)

- [ ] **Step 2: Replace the maps and add id extraction + bulk hooks**

In the body of `StockMovementsTable` (lines 49-54), replace the placeholder map declarations and the `useWarehouses` call with:

```ts
  const productIds = useMemo(
    () =>
      Array.from(
        new Set(
          movements.flatMap((m) => (m.product_id ? [m.product_id] : []))
        )
      ),
    [movements]
  )
  const variantIds = useMemo(
    () => Array.from(new Set(movements.map((m) => m.variant_id))),
    [movements]
  )
  const warehouseIds = useMemo(
    () =>
      Array.from(
        new Set(
          movements.flatMap((m) =>
            [m.from_warehouse_id, m.to_warehouse_id].filter(
              (id): id is string => !!id
            )
          )
        )
      ),
    [movements]
  )

  const { data: bulkProducts } = useBulkProducts(productIds)
  const { data: bulkVariants } = useBulkVariants(variantIds)
  const { data: bulkWarehouses } = useBulkWarehouses(warehouseIds)

  const productNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of bulkProducts ?? []) m.set(p.id, p.name)
    return m
  }, [bulkProducts])

  const variantNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of bulkVariants ?? []) m.set(v.id, v.variant_name)
    return m
  }, [bulkVariants])

  const warehouseNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const w of bulkWarehouses ?? []) m.set(w.id, w.name)
    return m
  }, [bulkWarehouses])
```

- [ ] **Step 3: Type-check**

Run: `pnpm run typecheck`
Expected: success.

- [ ] **Step 4: Run the project's quality gate**

Run: `pnpm run check:all`
Expected: success. (If lint complains about an unused symbol — e.g. `useBulkUsers` is exported but not yet used here — that's acceptable: the hook is intended for future use. If lint *fails*, allow the unused import explicitly or add a `// eslint-disable-next-line` comment. Run `pnpm run lint -- src/components/entity/StockMovementsTable.tsx` first to see specifics.)

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/StockMovementsTable.tsx
git commit -m "refactor(stock-movements): use bulk-by-id hooks for name maps"
```

---

## Task 13: Final quality gate

**Files:** none.

- [ ] **Step 1: Run full quality gate**

Run: `pnpm run check:all`
Expected: success across typecheck, lint, format, tests, and Rust checks.

- [ ] **Step 2: Smoke test the app (manual)**

This is a user-driven step. From `AGENTS.md`: do **not** start a dev server. Ask the user to run `pnpm tauri dev` and report back whether:

- `StockMovementsTable` shows real product / variant / warehouse names (no raw ids) for rows from `useStockMovements('product', ...)`, `('variant', ...)`, and `('warehouse', ...)`.
- The existing per-id detail caches (`useGetProduct`, etc.) still resolve correctly — the new bulk hooks prefill the same keys, so this should be a no-op verification.

If anything is wrong, report the symptoms and stop; do not attempt to fix in the plan.
