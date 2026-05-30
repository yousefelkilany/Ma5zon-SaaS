# Centralized SQL Commands Design

**Date:** 2026-05-29
**Status:** Approved

## Overview

Centralize all SQL statements into a dedicated `sql/` module in `src-tauri/src/`. Each entity (products, warehouses, variants, stock, users) gets its own SQL file containing raw SQL strings for DDL (CREATE TABLE) and DML (SELECT, INSERT, UPDATE, DELETE). Command files import and use these SQL strings, handling execution and result mapping.

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
└── sql/               # SQL statements
    ├── mod.rs         # re-exports all entity modules
    ├── products.rs     # DDL + DML for products
    ├── warehouses.rs   # DDL + DML for warehouses
    ├── variants.rs     # DDL + DML for variants
    ├── stock.rs        # DDL + DML for stock
    └── users.rs        # DDL + DML for users
```

## SQL Module Pattern

Each entity SQL file exports pure SQL string functions for both DDL and DML:

```rust
// src-tauri/src/sql/products.rs

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

## Entity SQL Files

### sql/products.rs

| Function         | Purpose                         |
| ---------------- | ------------------------------- |
| `create_table()` | CREATE TABLE for products       |
| `get_all()`      | SELECT all non-deleted products |
| `get_by_id()`    | SELECT by id                    |
| `create()`       | INSERT new product              |
| `update()`       | UPDATE existing product         |
| `soft_delete()`  | UPDATE deleted_at timestamp     |

### sql/warehouses.rs

| Function         | Purpose                           |
| ---------------- | --------------------------------- |
| `create_table()` | CREATE TABLE for warehouses       |
| `get_all()`      | SELECT all non-deleted warehouses |
| `get_by_id()`    | SELECT by id                      |
| `create()`       | INSERT new warehouse              |
| `update()`       | UPDATE existing warehouse         |
| `soft_delete()`  | UPDATE deleted_at timestamp       |

### sql/variants.rs

| Function           | Purpose                           |
| ------------------ | --------------------------------- |
| `create_table()`   | CREATE TABLE for product_variants |
| `get_all()`        | SELECT all non-deleted variants   |
| `get_by_id()`      | SELECT by id                      |
| `get_by_product()` | SELECT by product_id              |
| `create()`         | INSERT new variant                |
| `update()`         | UPDATE existing variant           |
| `soft_delete()`    | UPDATE deleted_at timestamp       |

### sql/stock.rs

| Function                     | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `create_levels_table()`      | CREATE TABLE for stock_levels        |
| `create_movements_table()`   | CREATE TABLE for stock_movements     |
| `get_levels_all()`           | SELECT all stock_levels              |
| `get_levels_by_variant()`    | SELECT stock_levels by variant_id    |
| `get_levels_by_warehouse()`  | SELECT stock_levels by warehouse_id  |
| `get_movements_all()`        | SELECT all stock_movements           |
| `get_movements_by_variant()` | SELECT stock_movements by variant_id |

### sql/users.rs

| Function              | Purpose                               |
| --------------------- | ------------------------------------- |
| `create_table()`      | CREATE TABLE for users                |
| `get_by_name()`       | SELECT user by name (for auth)        |
| `get_by_id()`         | SELECT user by id                     |
| `upsert()`            | INSERT or UPDATE user                 |
| `delete()`            | DELETE user                           |
| `get_password_hash()` | SELECT password_hash for verification |
| `update_password()`   | UPDATE password_hash                  |

## Command File Refactoring

**Before:**

```rust
// commands/products.rs
conn.execute(
    "CREATE TABLE IF NOT EXISTS products (...)",
    []
)
```

**After:**

```rust
// commands/products.rs
use crate::sql::products::create_table;

conn.execute(create_table(), []).map_err(...)
```

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

## Notes

- **Seed functions remain inline** in command files - they are one-time initialization and may contain complex procedural logic
- **Migration logic** (ALTER TABLE for schema changes) remains in command files as it requires conditional execution
- All DDL (CREATE TABLE) and DML (SELECT, INSERT, UPDATE, DELETE) go into entity SQL files
