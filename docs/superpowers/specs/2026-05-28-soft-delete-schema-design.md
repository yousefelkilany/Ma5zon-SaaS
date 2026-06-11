# Soft Delete Schema Update Design

## Overview

Add `created_at`, `updated_at`, `deleted_at` columns to `products`, `warehouses`, and `product_variants` tables. Implement soft delete pattern: delete commands set `deleted_at` timestamp instead of removing records. All query commands filter out soft-deleted records.

Also fix missing bindings in `bindings.rs` for warehouse and stock commands.

## Schema Changes

### products table

```sql
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Set at creation, updated on UPDATE
    deleted_at DATETIME DEFAULT NULL               -- NULL = active, timestamp = soft deleted
);
```

### warehouses table

```sql
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);
```

### product_variants table

Prices are stored as INTEGER (cents) for precise sorting and arithmetic. Convert to dollars by dividing by 100.

```sql
CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    variant_name TEXT NOT NULL,
    uom_id INTEGER NOT NULL,
    retail_price INTEGER NOT NULL DEFAULT 0,
    wholesale_price INTEGER NOT NULL DEFAULT 0,
    distribution_price INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch('now')),
    updated_at INTEGER DEFAULT (unixepoch('now')),
    deleted_at INTEGER DEFAULT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id)
);
```

## Soft Delete Behavior

### Delete Command Changes

- `products::delete` → sets `deleted_at = CURRENT_TIMESTAMP` instead of DELETE
- `warehouses::delete` → sets `deleted_at = CURRENT_TIMESTAMP` instead of DELETE
- `variants::delete` → sets `deleted_at = CURRENT_TIMESTAMP` instead of DELETE (apply to variants too for consistency)

### Query Changes (all read commands)

All `get_all`, `get_by_id`, `get_by_product` commands filter: `WHERE deleted_at IS NULL`

Example:

```rust
// Before
"SELECT id, name FROM products ORDER BY name"

// After
"SELECT id, name FROM products WHERE deleted_at IS NULL ORDER BY name"
```

### Create/Update Changes

- `create` commands: set `created_at = CURRENT_TIMESTAMP`, `updated_at = CURRENT_TIMESTAMP`
- `update` commands: set `updated_at = CURRENT_TIMESTAMP`

## Migration Strategy

Use `ALTER TABLE` to add new columns to existing tables. Check if column exists before adding to support re-initialization.

```rust
// Add columns if they don't exist (for existing databases)
// Products
conn.execute("ALTER TABLE products ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);
conn.execute("ALTER TABLE products ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);
conn.execute("ALTER TABLE products ADD COLUMN deleted_at DATETIME DEFAULT NULL", []);

// Warehouses
conn.execute("ALTER TABLE warehouses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);
conn.execute("ALTER TABLE warehouses ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);
conn.execute("ALTER TABLE warehouses ADD COLUMN deleted_at DATETIME DEFAULT NULL", []);

// Variants
conn.execute("ALTER TABLE product_variants ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);
conn.execute("ALTER TABLE product_variants ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);
conn.execute("ALTER TABLE product_variants ADD COLUMN deleted_at DATETIME DEFAULT NULL", []);
```

## Missing Bindings

Add to `bindings.rs`:

**Warehouse commands:**

- `warehouses::warehouses_get_all`
- `warehouses::warehouses_get_by_id`
- `warehouses::warehouses_create`
- `warehouses::warehouses_update`
- `warehouses::warehouses_delete`

**Stock commands:**

- `stock::stock_levels_get_all`
- `stock::stock_levels_get_by_variant`
- `stock::stock_levels_get_by_warehouse`
- `stock::stock_movements_get_all`
- `stock::stock_movements_get_by_variant`

## Files to Modify

1. `src-tauri/src/commands/products.rs` — add columns, soft delete, update queries
2. `src-tauri/src/commands/warehouses.rs` — add columns, soft delete, update queries
3. `src-tauri/src/commands/variants.rs` — add soft delete to delete command, update queries
4. `src-tauri/src/bindings.rs` — add warehouse and stock commands
5. `src-tauri/src/commands/stock.rs` — no changes needed (read-only, no delete)

## Implementation Order

1. Add missing bindings to `bindings.rs` (verify compilation)
2. Update `products.rs` with new columns + soft delete
3. Update `warehouses.rs` with new columns + soft delete
4. Update `variants.rs` with soft delete on delete command
5. Run full build verification
