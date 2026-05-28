# Database Auto-Initialization on Startup

## Context

Currently, database initialization is scattered across modules. The `schema.rs::init_product_tables` creates product-related tables and seeds them, while `user.rs::init_db` creates users. This violates single-responsibility: `schema.rs` should not own product-specific init logic.

Additionally, there is no automatic check on startup — each command lazily initializes the database. The `price_lists` and `variant_prices` tables are obsolete (replaced by enum and inline columns).

## Decision

Implement automatic database initialization on app startup using a convention-based approach. Each table module owns its own creation and seeding logic. A registry at startup checks all known tables and initializes any missing ones.

## Schema Changes

### Removed Tables
- `price_lists` — replaced by `PriceList` enum in Rust
- `variant_prices` — no longer needed

### New `product_variants` Schema

```sql
CREATE TABLE product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    variant_name TEXT NOT NULL,
    uom_id INTEGER NOT NULL,
    retail_price REAL NOT NULL DEFAULT 0,
    wholesale_price REAL NOT NULL DEFAULT 0,
    distribution_price REAL NOT NULL DEFAULT 0,
    FOREIGN KEY(product_id) REFERENCES products(id)
)
```

### Table Dependency Order
1. `users` — no dependencies
2. `products` — no dependencies
3. `product_variants` — depends on products

## Design

### 1. DatabaseInitializable Trait

```rust
// src-tauri/src/commands/mod.rs
use tauri::AppHandle;

pub trait DatabaseInitializable {
    fn table_name(&self) -> &str;
    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String>;
}
```

Each module that manages a table implements this trait.

### 2. Module Implementations

#### `user.rs`
- Add `struct UserInitializer`
- Implement `DatabaseInitializable` for `UserInitializer`
- `init_and_seed`: creates `users` table, seeds default admin
- Remove existing `init_db` function (replaced by trait impl)

#### `products.rs`
- Add `struct ProductsInitializer`
- Implement `DatabaseInitializable` for `ProductsInitializer`
- `init_and_seed`: creates `products` table, seeds ~40 sample products
- Move seed data from `schema.rs::seed_product_tables`

#### `variants.rs`
- Add `struct VariantsInitializer`
- Implement `DatabaseInitializable` for `VariantsInitializer`
- `init_and_seed`: creates `product_variants` table with price columns, seeds sample variants with prices
- Move seed data from `schema.rs::seed_product_tables`

### 3. Registry

```rust
// src-tauri/src/commands/mod.rs

const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
];
```

**Convention:** When adding a new table, create an initializer struct and add it to this list. Order matters for foreign key dependencies.

### 4. Startup Initialization (lib.rs)

In `lib.rs::setup()`, after app initialization but before the app is ready:

```rust
async fn initialize_databases(app: &AppHandle) -> Result<(), String> {
    use crate::commands::TABLE_INITIALIZERS;

    for initializer in TABLE_INITIALIZERS {
        let table_name = initializer.table_name();
        if !table_exists(app, table_name).await {
            log::info!("Initializing table: {}", table_name);
            initializer.init_and_seed(app).await?;
        }
    }
    Ok(())
}

async fn table_exists(app: &AppHandle, table_name: &str) -> bool {
    let conn = get_connection(app).map_err(|e| format!("{e}")).unwrap();
    let query = format!(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='{}'",
        table_name
    );
    conn.query_row(&query, [], |row| row.get::<_, String>(0)).is_ok()
}
```

Call `initialize_databases(app.handle())` in `setup()` before returning `Ok(())`.

### 5. Cleanup

#### Removed Files/Code
- `schema.rs::init_product_tables` — delete
- `schema.rs::seed_product_tables` — delete
- `schema.rs::get_table_layout` — delete (hardcoded old schema)
- `prices.rs` — delete (variant_prices table gone)
- `variants.rs` commands — update to use new schema (no price columns in separate table)
- `commands/mod.rs` — remove `pub mod prices`
- `commands/mod.rs` — remove `pub mod schema` if get_table_layout was its only content

## Convention for Future Tables

1. Create `init_and_seed(app: &AppHandle) -> Result<(), String>` function in the table's module
2. Create a `*Initializer` struct and implement `DatabaseInitializable`
3. Add to `TABLE_INITIALIZERS` array in dependency order
4. On next app startup, the table will be auto-created and seeded

## Verification

After implementation:
1. Delete `ma5zon.db`
2. Start app
3. Check logs — should see "Initializing table: users", "Initializing table: products", "Initializing table: product_variants"
4. Query database — all tables should exist with seed data