# Add CREATE TABLE to SQL Module - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `create_table()` functions to each entity SQL file and update command initializers to use them.

**Architecture:** Add DDL functions alongside existing DML in each entity SQL file. Update `DatabaseInitializable::init_and_seed` implementations to use centralized `create_table()`.

---

## Task 1: Add create_table to sql/products.rs

**Files:**

- Modify: `src-tauri/src/sql/products.rs`

- [ ] **Step 1: Read current file and add create_table()**

Add at the beginning of the file (before get_all):

```rust
pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
    )"
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/products.rs
git commit -m "feat(sql): add create_table to products"
```

---

## Task 2: Add create_table to sql/warehouses.rs

**Files:**

- Modify: `src-tauri/src/sql/warehouses.rs`

- [ ] **Step 1: Read current file and add create_table()**

Add at the beginning of the file (before get_all):

```rust
pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
    )"
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/warehouses.rs
git commit -m "feat(sql): add create_table to warehouses"
```

---

## Task 3: Add create_table to sql/variants.rs

**Files:**

- Modify: `src-tauri/src/sql/variants.rs`

- [ ] **Step 1: Read current file and add create_table()**

Add at the beginning of the file (before get_all):

```rust
pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        variant_name TEXT NOT NULL,
        uom_id INTEGER NOT NULL,
        retail_price REAL NOT NULL DEFAULT 0,
        wholesale_price REAL NOT NULL DEFAULT 0,
        distribution_price REAL NOT NULL DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )"
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/variants.rs
git commit -m "feat(sql): add create_table to variants"
```

---

## Task 4: Add create_table to sql/stock.rs

**Files:**

- Modify: `src-tauri/src/sql/stock.rs`

- [ ] **Step 1: Read current file and add create_tables()**

Add at the beginning of the file (before get_levels_all):

```rust
pub fn create_levels_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS stock_levels (
        variant_id INTEGER NOT NULL,
        warehouse_id INTEGER NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (variant_id, warehouse_id),
        FOREIGN KEY(variant_id) REFERENCES product_variants(id),
        FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    )"
}

pub fn create_movements_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER NOT NULL,
        from_warehouse_id INTEGER,
        to_warehouse_id INTEGER,
        quantity REAL NOT NULL,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(variant_id) REFERENCES product_variants(id),
        FOREIGN KEY(from_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY(to_warehouse_id) REFERENCES warehouses(id)
    )"
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/stock.rs
git commit -m "feat(sql): add create_tables to stock"
```

---

## Task 5: Add create_table to sql/users.rs

**Files:**

- Modify: `src-tauri/src/sql/users.rs`

- [ ] **Step 1: Read current file and add create_table()**

Add at the beginning of the file (before get_by_name):

```rust
pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        avatar_url TEXT,
        password_hash TEXT
    )"
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/sql/users.rs
git commit -m "feat(sql): add create_table to users"
```

---

## Task 6: Update commands/products.rs to use create_table()

**Files:**

- Modify: `src-tauri/src/commands/products.rs`

- [ ] **Step 1: Update import and replace CREATE TABLE**

Add to import:

```rust
use crate::sql::products::{create_table, get_all, get_by_id, create, update, soft_delete, get_created_at};
```

Replace inline CREATE TABLE in `ProductsInitializer::init_and_seed` with:

```rust
conn.execute(create_table(), []).map_err(|e| format!("Failed to create products table: {e}"))?;
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/products.rs
git commit -m "refactor(products): use create_table from sql::products"
```

---

## Task 7: Update commands/warehouses.rs to use create_table()

**Files:**

- Modify: `src-tauri/src/commands/warehouses.rs`

- [ ] **Step 1: Update import and replace CREATE TABLE**

Add to import:

```rust
use crate::sql::warehouses::{create_table, get_all, get_by_id, create, update, soft_delete, get_created_at};
```

Replace inline CREATE TABLE in `WarehousesInitializer::init_and_seed` with:

```rust
conn.execute(create_table(), []).map_err(|e| format!("Failed to create warehouses table: {e}"))?;
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/warehouses.rs
git commit -m "refactor(warehouses): use create_table from sql::warehouses"
```

---

## Task 8: Update commands/variants.rs to use create_table()

**Files:**

- Modify: `src-tauri/src/commands/variants.rs`

- [ ] **Step 1: Update import and replace CREATE TABLE**

Add to import:

```rust
use crate::sql::variants::{create_table, get_all, get_by_id, get_by_product, create, update, soft_delete};
```

Replace inline CREATE TABLE in `VariantsInitializer::init_and_seed` with:

```rust
conn.execute(create_table(), []).map_err(|e| format!("Failed to create product_variants table: {e}"))?;
```

Also remove the ALTER TABLE columns (migrate logic stays inline as it requires conditional execution).

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/variants.rs
git commit -m "refactor(variants): use create_table from sql::variants"
```

---

## Task 9: Update commands/stock.rs to use create_tables()

**Files:**

- Modify: `src-tauri/src/commands/stock.rs`

- [ ] **Step 1: Update import and replace CREATE TABLEs**

Add to import:

```rust
use crate::sql::stock::{
    create_levels_table, create_movements_table,
    get_levels_all, get_levels_by_variant, get_levels_by_warehouse,
    get_movements_all, get_movements_by_variant,
};
```

Replace inline CREATE TABLE statements in `StockInitializer::init_and_seed` with:

```rust
conn.execute(create_levels_table(), []).map_err(|e| format!("Failed to create stock_levels table: {e}"))?;
conn.execute(create_movements_table(), []).map_err(|e| format!("Failed to create stock_movements table: {e}"))?;
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/stock.rs
git commit -m "refactor(stock): use create_tables from sql::stock"
```

---

## Task 10: Update commands/user.rs to use create_table()

**Files:**

- Modify: `src-tauri/src/commands/user.rs`

- [ ] **Step 1: Update import and replace CREATE TABLE**

Add to import:

```rust
use crate::sql::users::{
    create_table, get_by_name, get_by_id, upsert, delete, get_password_hash,
    update_password as sql_update_password, update_user as sql_update_user,
};
```

Replace inline CREATE TABLE in `UserInitializer::init_and_seed` with:

```rust
conn.execute(create_table(), []).map_err(|e| format!("Failed to create users table: {e}"))?;
```

- [ ] **Step 2: Verify build passes**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/user.rs
git commit -m "refactor(user): use create_table from sql::users"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run full build**

```bash
cd src-tauri && cargo build 2>&1 | head -50
```

- [ ] **Step 2: Run clippy**

```bash
cd src-tauri && cargo clippy -- -D warnings 2>&1 | head -50
```

- [ ] **Step 3: Verify no inline CREATE TABLE in commands**

```bash
rg '"CREATE TABLE' src-tauri/src/commands/ -l
```

Expected: Only files in `src-tauri/src/sql/` should contain CREATE TABLE.

---

## Summary

| Task | Description                           |
| ---- | ------------------------------------- |
| 1    | Add create_table to sql/products.rs   |
| 2    | Add create_table to sql/warehouses.rs |
| 3    | Add create_table to sql/variants.rs   |
| 4    | Add create_tables to sql/stock.rs     |
| 5    | Add create_table to sql/users.rs      |
| 6    | Update commands/products.rs           |
| 7    | Update commands/warehouses.rs         |
| 8    | Update commands/variants.rs           |
| 9    | Update commands/stock.rs              |
| 10   | Update commands/user.rs               |
| 11   | Final verification                    |

**Total: 11 tasks**
