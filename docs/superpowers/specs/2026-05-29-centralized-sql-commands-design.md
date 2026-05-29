# Centralized SQL Commands Design

**Date:** 2026-05-29
**Status:** Approved

## Overview

Centralize all SQL statements into a dedicated `sql/` module in `src-tauri/src/`. Each entity (products, warehouses, variants, stock, users) gets its own SQL file containing raw SQL strings. Command files import and use these SQL strings, handling execution and result mapping.

## Module Structure

```
src-tauri/src/
├── commands/           # Command handlers
│   ├── mod.rs
│   ├── products.rs     # imports from sql::products
│   ├── warehouses.rs  # imports from sql::warehouses
│   ├── variants.rs    # imports from sql::variants
│   ├── stock.rs       # imports from sql::stock
│   ├── user.rs        # imports from sql::users
│   └── ...
└── sql/               # SQL statements (NEW)
    ├── mod.rs         # re-exports all entity modules
    ├── products.rs    # SELECT, INSERT, UPDATE, DELETE for products
    ├── warehouses.rs  # SELECT, INSERT, UPDATE, DELETE for warehouses
    ├── variants.rs    # SELECT, INSERT, UPDATE, DELETE for variants
    ├── stock.rs       # stock_levels and stock_movements queries
    ├── users.rs       # user auth and profile queries
    └── db_utils.rs    # Keep in commands/ - not SQL statements
```

## SQL Module Pattern

Each entity SQL file exports pure SQL string constants or functions:

```rust
// src-tauri/src/sql/products.rs

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
     VALUES (?1, ?2, ?3, $4, $5)"
}

pub fn update() -> &'static str {
    "UPDATE products SET company = ?1, name = ?2, category = ?3, updated_at = ?4 \
     WHERE id = ?5 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE products SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}
```

## Entity SQL Files

### sql/products.rs

| Function | Purpose |
|----------|---------|
| `get_all()` | SELECT all non-deleted products |
| `get_by_id()` | SELECT by id |
| `create()` | INSERT new product |
| `update()` | UPDATE existing product |
| `soft_delete()` | UPDATE deleted_at timestamp |

### sql/warehouses.rs

| Function | Purpose |
|----------|---------|
| `get_all()` | SELECT all non-deleted warehouses |
| `get_by_id()` | SELECT by id |
| `create()` | INSERT new warehouse |
| `update()` | UPDATE existing warehouse |
| `soft_delete()` | UPDATE deleted_at timestamp |

### sql/variants.rs

| Function | Purpose |
|----------|---------|
| `get_all()` | SELECT all non-deleted variants |
| `get_by_id()` | SELECT by id |
| `get_by_product()` | SELECT by product_id |
| `create()` | INSERT new variant |
| `update()` | UPDATE existing variant |
| `soft_delete()` | UPDATE deleted_at timestamp |

### sql/stock.rs

| Function | Purpose |
|----------|---------|
| `get_levels_all()` | SELECT all stock_levels |
| `get_levels_by_variant()` | SELECT stock_levels by variant_id |
| `get_levels_by_warehouse()` | SELECT stock_levels by warehouse_id |
| `get_movements_all()` | SELECT all stock_movements |
| `get_movements_by_variant()` | SELECT stock_movements by variant_id |
| `upsert_level()` | INSERT or REPLACE stock_level |
| `insert_movement()` | INSERT stock_movement |

### sql/users.rs

| Function | Purpose |
|----------|---------|
| `get_by_name()` | SELECT user by name (for auth) |
| `get_by_id()` | SELECT user by id |
| `upsert()` | INSERT or UPDATE user |
| `delete()` | DELETE user |
| `get_password_hash()` | SELECT password_hash for verification |
| `update_password()` | UPDATE password_hash |

## Command File Refactoring

**Before:**
```rust
// commands/products.rs
conn.prepare("SELECT id, company, name, category, ... FROM products WHERE deleted_at IS NULL ORDER BY name")
```

**After:**
```rust
// commands/products.rs
use crate::sql::products::{get_all, get_by_id, create, update, soft_delete};

conn.prepare(get_all())
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `src-tauri/src/sql/mod.rs` | Create - module root with re-exports |
| `src-tauri/src/sql/products.rs` | Create |
| `src-tauri/src/sql/warehouses.rs` | Create |
| `src-tauri/src/sql/variants.rs` | Create |
| `src-tauri/src/sql/stock.rs` | Create |
| `src-tauri/src/sql/users.rs` | Create |
| `src-tauri/src/commands/products.rs` | Modify - use sql::products::* |
| `src-tauri/src/commands/warehouses.rs` | Modify - use sql::warehouses::* |
| `src-tauri/src/commands/variants.rs` | Modify - use sql::variants::* |
| `src-tauri/src/commands/stock.rs` | Modify - use sql::stock::* |
| `src-tauri/src/commands/user.rs` | Modify - use sql::users::* |

## Benefits

- **Single source of truth** — all SQL in one place per entity
- **Discoverable** — `sql::products::get_all` clearly indicates purpose
- **Portable** — SQL can be reused outside commands if needed
- **Maintainable** — column list changes only in one place per entity
- **Consistent** — same pattern across all entities

## Implementation Notes

- SQL files stay in `src/sql/` - not moved to `src/commands/`
- `db_utils.rs` stays in `commands/` - it provides runtime functions, not SQL
- Prepared statement execution and result mapping remain in command files
- No changes to SQL parameter ordering (keep `?1, ?2` style)
