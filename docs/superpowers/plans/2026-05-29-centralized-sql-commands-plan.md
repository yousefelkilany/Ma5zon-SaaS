# Centralized SQL Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize all SQL statements into a dedicated `sql/` module with one file per entity.

**Architecture:** Create `src-tauri/src/sql/` directory with `mod.rs` and entity-specific SQL files (`products.rs`, `warehouses.rs`, `variants.rs`, `stock.rs`, `users.rs`). Each entity file exports SQL as `&'static str` functions. Command files import and use these SQL strings.

**Tech Stack:** Rust (rusqlite), Tauri

---

## File Structure

```
src-tauri/src/
├── sql/                    # NEW
│   ├── mod.rs
│   ├── products.rs
│   ├── warehouses.rs
│   ├── variants.rs
│   ├── stock.rs
│   └── users.rs
└── commands/
    ├── products.rs         # MODIFY - use sql::products
    ├── warehouses.rs       # MODIFY - use sql::warehouses
    ├── variants.rs        # MODIFY - use sql::variants
    ├── stock.rs           # MODIFY - use sql::stock
    └── user.rs            # MODIFY - use sql::users
```

---

## Task 1: Create sql/ Module Structure

**Files:**
- Create: `src-tauri/src/sql/mod.rs`

- [ ] **Step 1: Create sql/mod.rs**

```rust
//! Centralized SQL statements for all entities.
//!
//! Each entity has its own module with pure SQL string functions.

pub mod products;
pub mod warehouses;
pub mod variants;
pub mod stock;
pub mod users;
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/sql/mod.rs
git commit -m "feat(sql): create sql module structure"
```

---

## Task 2: Create sql/products.rs

**Files:**
- Create: `src-tauri/src/sql/products.rs`

- [ ] **Step 1: Write sql/products.rs**

```rust
//! SQL statements for products entity.

pub fn get_all() -> &'static str {
    "SELECT id, company, name, category, created_at, updated_at, deleted_at \
     FROM products WHERE deleted_at IS NULL ORDER BY name"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, company, name, category, created_at, updated_at, deleted_at \
     FROM products WHERE id = ?1 AND deleted_at IS NULL"
}

pub fn create() -> &'static str {
    "INSERT INTO products (company, name, category, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4, ?5)"
}

pub fn update() -> &'static str {
    "UPDATE products SET company = ?1, name = ?2, category = ?3, updated_at = ?4 \
     WHERE id = ?5 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE products SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/sql/products.rs
git commit -m "feat(sql): add products SQL statements"
```

---

## Task 3: Create sql/warehouses.rs

**Files:**
- Create: `src-tauri/src/sql/warehouses.rs`

- [ ] **Step 1: Write sql/warehouses.rs**

```rust
//! SQL statements for warehouses entity.

pub fn get_all() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM warehouses WHERE deleted_at IS NULL ORDER BY name"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM warehouses WHERE id = ?1 AND deleted_at IS NULL"
}

pub fn create() -> &'static str {
    "INSERT INTO warehouses (name, location, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4)"
}

pub fn update() -> &'static str {
    "UPDATE warehouses SET name = ?1, location = ?2, updated_at = ?3 \
     WHERE id = ?4 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE warehouses SET deleted_at = ?1 WHERE id = ?2"
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/sql/warehouses.rs
git commit -m "feat(sql): add warehouses SQL statements"
```

---

## Task 4: Create sql/variants.rs

**Files:**
- Create: `src-tauri/src/sql/variants.rs`

- [ ] **Step 1: Write sql/variants.rs**

```rust
//! SQL statements for product_variants entity.

pub fn get_all() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM product_variants WHERE deleted_at IS NULL ORDER BY sku"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM product_variants WHERE id = ?1 AND deleted_at IS NULL"
}

pub fn get_by_product() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM product_variants WHERE product_id = ?1 AND deleted_at IS NULL ORDER BY sku"
}

pub fn create() -> &'static str {
    "INSERT INTO product_variants \
     (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, \
      distribution_price, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
}

pub fn update() -> &'static str {
    "UPDATE product_variants SET \
     sku = ?1, variant_name = ?2, uom_id = ?3, retail_price = ?4, \
     wholesale_price = ?5, distribution_price = ?6, updated_at = ?7 \
     WHERE id = ?8 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE product_variants SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/sql/variants.rs
git commit -m "feat(sql): add variants SQL statements"
```

---

## Task 5: Create sql/stock.rs

**Files:**
- Create: `src-tauri/src/sql/stock.rs`

- [ ] **Step 1: Write sql/stock.rs**

```rust
//! SQL statements for stock_levels and stock_movements entities.

pub fn get_levels_all() -> &'static str {
    "SELECT variant_id, warehouse_id, quantity \
     FROM stock_levels ORDER BY variant_id, warehouse_id"
}

pub fn get_levels_by_variant() -> &'static str {
    "SELECT variant_id, warehouse_id, quantity \
     FROM stock_levels WHERE variant_id = ?1 ORDER BY warehouse_id"
}

pub fn get_levels_by_warehouse() -> &'static str {
    "SELECT variant_id, warehouse_id, quantity \
     FROM stock_levels WHERE warehouse_id = ?1 ORDER BY variant_id"
}

pub fn upsert_level() -> &'static str {
    "INSERT OR REPLACE INTO stock_levels (variant_id, warehouse_id, quantity) \
     VALUES (?1, ?2, ?3)"
}

pub fn get_movements_all() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at \
     FROM stock_movements ORDER BY created_at DESC"
}

pub fn get_movements_by_variant() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at \
     FROM stock_movements WHERE variant_id = ?1 ORDER BY created_at DESC"
}

pub fn insert_movement() -> &'static str {
    "INSERT INTO stock_movements \
     (variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at) \
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/sql/stock.rs
git commit -m "feat(sql): add stock SQL statements"
```

---

## Task 6: Create sql/users.rs

**Files:**
- Create: `src-tauri/src/sql/users.rs`

- [ ] **Step 1: Write sql/users.rs**

```rust
//! SQL statements for users entity.

pub fn get_by_name() -> &'static str {
    "SELECT id, name, email, role, avatar_url, password_hash \
     FROM users WHERE name = ?1"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, name, email, role, avatar_url FROM users WHERE id = ?1"
}

pub fn upsert() -> &'static str {
    "INSERT INTO users (id, name, role, avatar_url) VALUES (?1, ?2, ?3, ?4) \
     ON CONFLICT(id) DO UPDATE SET name = ?2, role = ?3, avatar_url = ?4"
}

pub fn delete() -> &'static str {
    "DELETE FROM users WHERE id = ?1"
}

pub fn get_password_hash() -> &'static str {
    "SELECT password_hash FROM users WHERE id = ?1"
}

pub fn update_password() -> &'static str {
    "UPDATE users SET password_hash = ?1 WHERE id = ?2"
}

pub fn update_user() -> &'static str {
    "UPDATE users SET name = ?1, email = ?2, avatar_url = ?3 WHERE id = ?4"
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/sql/users.rs
git commit -m "feat(sql): add users SQL statements"
```

---

## Task 7: Update commands/products.rs

**Files:**
- Modify: `src-tauri/src/commands/products.rs`

- [ ] **Step 1: Add import and replace SQL strings**

Add import at top of file:
```rust
use crate::sql::products::{get_all, get_by_id, create, update, soft_delete};
```

Replace each SQL string literal with function call:
- Line 108: `"SELECT ...` → `get_all()`
- Line 136: `"SELECT ... WHERE id = "` → `get_by_id()`
- Line 167: `"INSERT INTO products ...` → `create()`
- Line 206: `"UPDATE products SET ...` → `update()`
- Line 230: `"UPDATE products SET deleted_at` → `soft_delete()`

- [ ] **Step 2: Run build to verify**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/products.rs
git commit -m "refactor(products): use centralized SQL from sql::products"
```

---

## Task 8: Update commands/warehouses.rs

**Files:**
- Modify: `src-tauri/src/commands/warehouses.rs`

- [ ] **Step 1: Add import and replace SQL strings**

Add import at top of file:
```rust
use crate::sql::warehouses::{get_all, get_by_id, create, update, soft_delete};
```

Replace each SQL string literal with function call:
- Line 82: `"SELECT ...` → `get_all()`
- Line 109: `"SELECT ... WHERE id = "` → `get_by_id()`
- Line 138: `"INSERT INTO warehouses ...` → `create()`
- Line 175: `"UPDATE warehouses SET ...` → `update()`
- Line 197: `"UPDATE warehouses SET deleted_at` → `soft_delete()`

- [ ] **Step 2: Run build to verify**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/warehouses.rs
git commit -m "refactor(warehouses): use centralized SQL from sql::warehouses"
```

---

## Task 9: Update commands/variants.rs

**Files:**
- Modify: `src-tauri/src/commands/variants.rs`

- [ ] **Step 1: Add import and replace SQL strings**

Add import at top of file:
```rust
use crate::sql::variants::{get_all, get_by_id, get_by_product, create, update, soft_delete};
```

Replace each SQL string literal with function call:
- Line 153: `"SELECT ...` → `get_all()`
- Line 190: `"SELECT ... WHERE product_id = "` → `get_by_product()`
- Line 222: `"SELECT ... WHERE id = "` → `get_by_id()`
- Line 252: `"INSERT INTO product_variants ...` → `create()`
- Line 298: `"UPDATE product_variants SET ...` → `update()`
- Line 325: `"UPDATE product_variants SET deleted_at` → `soft_delete()`

- [ ] **Step 2: Run build to verify**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/variants.rs
git commit -m "refactor(variants): use centralized SQL from sql::variants"
```

---

## Task 10: Update commands/stock.rs

**Files:**
- Modify: `src-tauri/src/commands/stock.rs`

- [ ] **Step 1: Add import and replace SQL strings**

Add import at top of file:
```rust
use crate::sql::stock::{
    get_levels_all, get_levels_by_variant, get_levels_by_warehouse,
    get_movements_all, get_movements_by_variant, upsert_level, insert_movement,
};
```

Replace each SQL string literal with function call:
- Line 216: `"SELECT variant_id, warehouse_id, quantity FROM stock_levels ...` → `get_levels_all()`
- Line 245: `"SELECT variant_id, warehouse_id, quantity FROM stock_levels WHERE variant_id = "` → `get_levels_by_variant()`
- Line 274: `"SELECT variant_id, warehouse_id, quantity FROM stock_levels WHERE warehouse_id = "` → `get_levels_by_warehouse()`
- Line 297: `"SELECT id, variant_id, from_warehouse_id, ... FROM stock_movements ...` → `get_movements_all()`
- Line 330: `"SELECT id, variant_id, from_warehouse_id, ... WHERE variant_id = "` → `get_movements_by_variant()`

- [ ] **Step 2: Run build to verify**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/stock.rs
git commit -m "refactor(stock): use centralized SQL from sql::stock"
```

---

## Task 11: Update commands/user.rs

**Files:**
- Modify: `src-tauri/src/commands/user.rs`

- [ ] **Step 1: Add import and replace SQL strings**

Add import at top of file:
```rust
use crate::sql::users::{
    get_by_name, get_by_id, upsert, delete, get_password_hash, update_password, update_user,
};
```

Replace each SQL string literal with function call:
- Line 106: `"SELECT id, name, email, role, avatar_url, password_hash FROM users WHERE name = "` → `get_by_name()`
- Line 163: `"SELECT id, name, email, role, avatar_url FROM users WHERE id = "` → `get_by_id()`
- Line 187: `"INSERT INTO users ... ON CONFLICT(id) DO UPDATE SET ...` → `upsert()`
- Line 201: `"DELETE FROM users WHERE id = "` → `delete()`
- Line 218: `"SELECT password_hash FROM users WHERE id = "` → `get_password_hash()`
- Line 234: `"UPDATE users SET password_hash = "` → `update_password()`
- Line 254: `"UPDATE users SET name = ?1, email = ?2, avatar_url = ?3 WHERE id = ?4"` → `update_user()`

- [ ] **Step 2: Run build to verify**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/user.rs
git commit -m "refactor(user): use centralized SQL from sql::users"
```

---

## Task 12: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full build**

```bash
cd src-tauri && cargo build 2>&1 | head -50
```

- [ ] **Step 2: Run cargo clippy**

```bash
cd src-tauri && cargo clippy -- -D warnings 2>&1 | head -50
```

- [ ] **Step 3: Verify all SQL imports are used**

Check that no raw SQL string literals remain in the command files after refactoring:
```bash
rg '"SELECT|"INSERT|"UPDATE|"DELETE|"CREATE' src-tauri/src/commands/ -l
```

Expected: Only files in `src-tauri/src/sql/` should contain SQL.

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create sql/mod.rs |
| 2 | Create sql/products.rs |
| 3 | Create sql/warehouses.rs |
| 4 | Create sql/variants.rs |
| 5 | Create sql/stock.rs |
| 6 | Create sql/users.rs |
| 7 | Update commands/products.rs |
| 8 | Update commands/warehouses.rs |
| 9 | Update commands/variants.rs |
| 10 | Update commands/stock.rs |
| 11 | Update commands/user.rs |
| 12 | Final verification |

**Total: 12 tasks, 12 commits**
