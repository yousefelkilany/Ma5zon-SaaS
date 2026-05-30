# Database Auto-Initialization on Startup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automatic database initialization on app startup with convention-based approach — each table module owns its creation and seeding via a `DatabaseInitializable` trait.

**Architecture:** A shared `db_utils.rs` provides `get_db_path` and `get_conn`. Each table module (`user.rs`, `products.rs`, `variants.rs`) implements `DatabaseInitializable` with an initializer struct. A registry in `commands/mod.rs` lists all initializers in dependency order. `lib.rs::setup()` iterates the registry, checks if each table exists, and calls `init_and_seed` if missing.

**Tech Stack:** Rust (Tauri), rusqlite, async trait pattern

---

## File Structure

- **Create:** `src-tauri/src/commands/db_utils.rs` — shared database path and connection utilities
- **Create:** `src-tauri/src/commands/init_registry.rs` — empty marker file for convention
- **Modify:** `src-tauri/src/commands/mod.rs` — add `DatabaseInitializable` trait, registry, remove `prices` and `schema` modules
- **Modify:** `src-tauri/src/commands/user.rs` — add `UserInitializer`, remove `init_db`, refactor commands
- **Modify:** `src-tauri/src/commands/products.rs` — add `ProductsInitializer` with seed data
- **Modify:** `src-tauri/src/commands/variants.rs` — add `VariantsInitializer`, update schema with price columns
- **Modify:** `src-tauri/src/commands/prices.rs` — delete entire file
- **Modify:** `src-tauri/src/commands/schema.rs` — remove `init_product_tables`, `seed_product_tables`, `get_table_layout`
- **Modify:** `src-tauri/src/lib.rs` — add `initialize_databases()` in setup()
- **Modify:** `src-tauri/src/types.rs` — update `Variant` to include price fields, remove `VariantPrice`, `NewVariantPrice`

---

## Tasks

### Task 1: Create db_utils.rs (shared database utilities)

**Files:**

- Create: `src-tauri/src/commands/db_utils.rs`

- [ ] **Step 1: Write db_utils.rs**

```rust
use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(app_data_dir.join("ma5zon.db"))
}

pub fn get_conn(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))
}
```

- [ ] **Step 2: Add module to commands/mod.rs**

After creating `db_utils.rs`, add `pub mod db_utils;` to `commands/mod.rs`

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/db_utils.rs src-tauri/src/commands/mod.rs
git commit -m "feat(db): add shared db_utils module"
```

---

### Task 2: Update user.rs with DatabaseInitializable

**Files:**

- Modify: `src-tauri/src/commands/user.rs:1-304`

- [ ] **Step 1: Add imports and trait implementation at top of user.rs**

Replace the `init_db` function (lines 34-61) with:

```rust
use crate::commands::db_utils::{get_conn, get_db_path};

pub struct UserInitializer;

impl commands::DatabaseInitializable for UserInitializer {
    fn table_name(&self) -> &str {
        "users"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                avatar_url TEXT,
                password_hash TEXT
            )",
            [],
        )
        .map_err(|e| format!("Failed to create users table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .map_err(|e| format!("Failed to check users count: {e}"))?;

        if count == 0 {
            log::info!("[UserInitializer] Seeding default admin");
            let password_hash = hash_password("admin").map_err(|e| format!("Failed to hash password: {e}"))?;
            conn.execute(
                "INSERT INTO users (id, name, email, role, avatar_url, password_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    uuid::Uuid::new_v4().to_string(),
                    "admin",
                    "admin@localhost",
                    "Administrator",
                    Option::<String>::None,
                    password_hash
                ],
            )
            .map_err(|e| format!("Failed to seed default admin: {e}"))?;
        }

        Ok(())
    }
}
```

**Note:** Remove the `use crate::types::User;` line and add `use crate::commands::{self, DatabaseInitializable};` and `use tauri::AppHandle;` at the top.

- [ ] **Step 2: Update all command functions to use db_utils::get_conn**

Replace `init_db(&app)?` with `get_conn(&app)?` in `authenticate`, `load_user`, `save_user`, `delete_user`, `update_password`, `update_user` functions.

For example, in `authenticate` (line 125):

```rust
let conn = get_conn(&app)?;  // was: let conn = init_db(&app)?;
```

And remove the `seed_default_admin(&conn)` call from `authenticate` — initialization now happens at startup.

- [ ] **Step 3: Remove init_db and seed_default_admin functions**

Remove lines 34-95 (the `init_db` and `seed_default_admin` functions).

- [ ] **Step 4: Verify file compiles**

Run: `cd src-tauri && cargo check 2>&1 | head -50`

Expected: Should show errors about missing `init_db` calls in commands. We'll fix those in step 5.

- [ ] **Step 5: Fix all init_db references in commands**

Each command that called `init_db(&app)?` should now call `get_conn(&app)?`. Search for `init_db` in user.rs and replace all occurrences.

Specifically:

- `authenticate` line 125: `let conn = init_db(&app)?` → `let conn = get_conn(&app)?`
- `load_user` line 188: `let conn = init_db(&app)?` → `let conn = get_conn(&app)?`
- `save_user` line 212: `let conn = init_db(&app)?` → `let conn = get_conn(&app)?`
- `delete_user` line 227: `let conn = init_db(&app)?` → `let conn = get_conn(&app)?`
- `update_password` line 243: `let conn = init_db(&app)?` → `let conn = get_conn(&app)?`
- `update_user` line 279: `let conn = init_db(&app)?` → `let conn = get_conn(&app)?`

Also remove `seed_default_admin(&conn)` call from `authenticate` (lines 129-132).

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/user.rs
git commit -m "feat(db): implement DatabaseInitializable for user module"
```

---

### Task 3: Update products.rs with DatabaseInitializable

**Files:**

- Modify: `src-tauri/src/commands/products.rs:1-101`

- [ ] **Step 1: Add imports and initializer at top of products.rs**

After `use crate::types::Product;`, add:

```rust
use crate::commands::db_utils::{get_conn, get_db_path};
use crate::commands::{self, DatabaseInitializable};
use tauri::AppHandle;

pub struct ProductsInitializer;

impl commands::DatabaseInitializable for ProductsInitializer {
    fn table_name(&self) -> &str {
        "products"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| format!("Failed to create products table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count products: {e}"))?;

        if count == 0 {
            log::info!("[ProductsInitializer] Seeding sample products");
            seed_products(&conn)?;
        }

        Ok(())
    }
}

fn seed_products(conn: &Connection) -> Result<(), String> {
    use rand::Rng;

    let products = vec![
        "Industrial Motor Assembly", "Electronic Control Module", "Hydraulic Pump Unit",
        "Precision Bearing Set", "Stainless Steel Fastener Kit", "LED Display Panel",
        "Thermal Insulation Sheet", "Carbon Fiber Bracket", "Copper Wiring Harness",
        "Aluminum Extrusion Profile", "Rubber Gasket Seal", "Plastic Housing Cover",
        "Glass Lens Assembly", "Brass Fitting Connector", "Titanium Implant Plate",
        "Ceramic Capacitor Array", "Magnetic Encoder Sensor", "Pneumatic Cylinder",
        "Solar Panel Junction Box", "Composite Gear Set", "Acoustic Waveguide",
        "Optical Fiber Bundle", "High-Frequency Transformer", "Emergency Battery Pack",
        "Servo Drive Controller", "Linear Guide Rail", "Pressure Relief Valve",
        "Bi-Metal Thermostat", "Anti-Vibration Mount", "RF Antenna Module",
        "316L Stainless Tubing", "Polycarbonate Housing", "Graphite Heat Sink",
        "Neodymium Magnet Assembly", "PTFE Liner Bearing", "Epoxy Resin Compound",
        "Silicone Grommet Set", "Borosilicate Glass Tube", "Rolled Steel Sheet",
    ];

    for product in products {
        conn.execute("INSERT INTO products (name) VALUES (?1)", [product])
            .map_err(|e| format!("Failed to insert product: {e}"))?;
    }

    Ok(())
}
```

- [ ] **Step 2: Update get_db_path and get_conn to use db_utils**

Remove `get_db_path` and `get_conn` functions (lines 7-20), keeping only `use crate::commands::db_utils::{get_conn, get_db_path};`

Update `get_all` (line 25): `let conn = get_conn(&app)?;` (remove `get_db_path` call)

Update `get_by_id` (line 47): `let conn = get_conn(&app)?;`

Update `create` (line 68): `let conn = get_conn(&app)?;`

Update `update` (line 82): `let conn = get_conn(&app)?;`

Update `delete` (line 96): `let conn = get_conn(&app)?;`

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/products.rs
git commit -m "feat(db): implement DatabaseInitializable for products module"
```

---

### Task 4: Update variants.rs with DatabaseInitializable

**Files:**

- Modify: `src-tauri/src/commands/variants.rs:1-154`

- [ ] **Step 1: Update Variant type in types.rs first**

Modify `Variant` struct to include price fields:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Variant {
    pub id: String,
    pub product_id: String,
    pub sku: String,
    pub variant_name: String,
    pub uom_id: String,
    pub retail_price: f64,
    pub wholesale_price: f64,
    pub distribution_price: f64,
}
```

Also remove `VariantPrice` and `NewVariantPrice` structs since they're no longer needed.

- [ ] **Step 2: Add imports and initializer to variants.rs**

Add after `use crate::types::{Variant, NewVariant, UpdateVariant};`:

```rust
use crate::commands::db_utils::{get_conn, get_db_path};
use crate::commands::{self, DatabaseInitializable};
use tauri::AppHandle;

pub struct VariantsInitializer;

impl commands::DatabaseInitializable for VariantsInitializer {
    fn table_name(&self) -> &str {
        "product_variants"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS product_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                sku TEXT UNIQUE NOT NULL,
                variant_name TEXT NOT NULL,
                uom_id INTEGER NOT NULL,
                retail_price REAL NOT NULL DEFAULT 0,
                wholesale_price REAL NOT NULL DEFAULT 0,
                distribution_price REAL NOT NULL DEFAULT 0,
                FOREIGN KEY(product_id) REFERENCES products(id)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create product_variants table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_variants", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count variants: {e}"))?;

        if count == 0 {
            log::info!("[VariantsInitializer] Seeding sample variants");
            seed_variants(&conn)?;
        }

        Ok(())
    }
}

fn seed_variants(conn: &Connection) -> Result<(), String> {
    use rand::Rng;

    let mut rng = rand::thread_rng();

    // Get all product IDs
    let mut stmt = conn
        .prepare("SELECT id FROM products ORDER BY id")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let product_ids: Vec<i64> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to query products: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect product IDs: {e}"))?;

    let variants_data = vec![
        (vec!["Standard Grade", "Heavy Duty", "Economy", "Premium"], "Grade"),
        (vec!["10W", "25W", "50W", "100W"], "Power"),
        (vec!["120V", "240V", "480V", "Dual Voltage"], "Voltage"),
        (vec!["Male", "Female", "Barbed", "Compression"], "Connector"),
        (vec!["1m", "2m", "5m", "10m"], "Length"),
        (vec!["SS304", "SS316", "SS430", "Galvanized"], "Material"),
        (vec!["Clear", "Tinted", "Mirrored", "Anti-Glare"], "Finish"),
        (vec!["M3", "M4", "M5", "M6", "M8"], "Size"),
        (vec!["Small", "Medium", "Large", "XL"], "Size"),
        (vec!["2A", "5A", "10A", "20A"], "Rating"),
    ];

    let uom_names = vec!["pcs", "m", "kg", "L", "box", "roll", "set"];

    for (i, product_id) in product_ids.iter().enumerate() {
        let num_variants = rng.gen_range(2..5);
        let variant_type = &variants_data[i % variants_data.len()];
        let options = &variant_type.0;

        for v in 0..num_variants {
            let variant_name = format!("{} {} {}", "Product", variant_type.1, options[v % options.len()]);
            let sku = format!("SKU-{:04}-{:02}", product_id, v + 1);
            let uom_id = (rng.gen_range(0..uom_names.len()) + 1) as i64;

            let retail_price: f64 = (rng.gen_range(5.0..500.0) * 100.0).round() / 100.0;
            let wholesale_price: f64 = (retail_price * 0.75 * 100.0).round() / 100.0;
            let distribution_price: f64 = (retail_price * 0.6 * 100.0).round() / 100.0;

            conn.execute(
                "INSERT INTO product_variants (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price],
            )
            .map_err(|e| format!("Failed to insert variant: {e}"))?;
        }
    }

    Ok(())
}
```

- [ ] **Step 3: Update get_db_path and get_conn to use db_utils**

Remove `get_db_path` and `get_conn` functions (lines 7-20).

Update all commands: `get_all`, `variants_get_by_product`, `variants_get_by_id`, `variants_create`, `variants_update`, `variants_delete` to use `get_conn(&app)?` directly.

- [ ] **Step 4: Update NewVariant and UpdateVariant in types.rs**

Add price fields to `NewVariant`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NewVariant {
    pub product_id: String,
    pub sku: String,
    pub variant_name: String,
    pub uom_id: String,
    pub retail_price: f64,
    pub wholesale_price: f64,
    pub distribution_price: f64,
}
```

Add price fields to `UpdateVariant`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateVariant {
    pub sku: Option<String>,
    pub variant_name: Option<String>,
    pub uom_id: Option<String>,
    pub retail_price: Option<f64>,
    pub wholesale_price: Option<f64>,
    pub distribution_price: Option<f64>,
}
```

- [ ] **Step 5: Update variants_create to accept prices**

```rust
#[tauri::command]
#[specta::specta]
pub async fn variants_create(app: AppHandle, variant: NewVariant) -> Result<Variant, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "INSERT INTO product_variants (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![variant.product_id, variant.sku, variant.variant_name, variant.uom_id, variant.retail_price, variant.wholesale_price, variant.distribution_price],
    )
    .map_err(|e| format!("Failed to create variant: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Variant {
        id,
        product_id: variant.product_id,
        sku: variant.sku,
        variant_name: variant.variant_name,
        uom_id: variant.uom_id,
        retail_price: variant.retail_price,
        wholesale_price: variant.wholesale_price,
        distribution_price: variant.distribution_price,
    })
}
```

- [ ] **Step 6: Update variants_update to handle price updates**

```rust
#[tauri::command]
#[specta::specta]
pub async fn variants_update(app: AppHandle, id: String, variant: UpdateVariant) -> Result<Variant, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;

    let current = variants_get_by_id(app.clone(), id.clone())
        .await?
        .ok_or_else(|| "Variant not found".to_string())?;

    let new_sku = variant.sku.unwrap_or(current.sku);
    let new_variant_name = variant.variant_name.unwrap_or(current.variant_name);
    let new_uom_id = variant.uom_id.unwrap_or(current.uom_id);
    let new_retail_price = variant.retail_price.unwrap_or(current.retail_price);
    let new_wholesale_price = variant.wholesale_price.unwrap_or(current.wholesale_price);
    let new_distribution_price = variant.distribution_price.unwrap_or(current.distribution_price);

    conn.execute(
        "UPDATE product_variants SET sku = ?1, variant_name = ?2, uom_id = ?3, retail_price = ?4, wholesale_price = ?5, distribution_price = ?6 WHERE id = ?7",
        params![new_sku, new_variant_name, new_uom_id, new_retail_price, new_wholesale_price, new_distribution_price, id_i64],
    )
    .map_err(|e| format!("Failed to update variant: {e}"))?;

    Ok(Variant {
        id,
        product_id: current.product_id,
        sku: new_sku,
        variant_name: new_variant_name,
        uom_id: new_uom_id,
        retail_price: new_retail_price,
        wholesale_price: new_wholesale_price,
        distribution_price: new_distribution_price,
    })
}
```

- [ ] **Step 7: Update variants_get_all to include prices in return type**

```rust
#[tauri::command]
#[specta::specta]
pub async fn variants_get_all(app: AppHandle) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price FROM product_variants ORDER BY sku")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map([], |row| {
            Ok(Variant {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get::<_, i64>(4)?.to_string(),
                retail_price: row.get(5)?,
                wholesale_price: row.get(6)?,
                distribution_price: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query variants: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect variants: {e}"))?;

    Ok(variants)
}
```

Similarly update `variants_get_by_product` and `variants_get_by_id`.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/types.rs src-tauri/src/commands/variants.rs
git commit -m "feat(db): implement DatabaseInitializable for variants module with price columns"
```

---

### Task 5: Update commands/mod.rs (trait and registry)

**Files:**

- Modify: `src-tauri/src/commands/mod.rs:1-14`

- [ ] **Step 1: Add trait, registry, and update module list**

Replace entire file contents:

```rust
//! Tauri command handlers organized by domain.
//!
//! Each submodule contains related commands and their helper functions.
//! Import specific commands via their submodule (e.g., `commands::preferences::greet`).

use tauri::AppHandle;

pub mod db_utils;
pub mod notifications;
pub mod preferences;
pub mod products;
pub mod quick_pane;
pub mod recovery;
pub mod user;
pub mod variants;

pub trait DatabaseInitializable {
    fn table_name(&self) -> &str;
    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String>;
}

use self::{
    products::ProductsInitializer,
    user::UserInitializer,
    variants::VariantsInitializer,
};

pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
];
```

**Note:** Removed `pub mod prices;` and `pub mod schema;`

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/commands/mod.rs
git commit -m "feat(db): add DatabaseInitializable trait and registry"
```

---

### Task 6: Update lib.rs (startup initialization)

**Files:**

- Modify: `src-tauri/src/lib.rs:104-143`

- [ ] **Step 1: Add initialize_databases function**

Add before the `Ok(())` in setup():

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
    let conn = crate::commands::db_utils::get_conn(app).map_err(|e| format!("{e}")).unwrap();
    let query = format!(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='{}'",
        table_name
    );
    conn.query_row(&query, [], |row| row.get::<_, String>(0)).is_ok()
}
```

- [ ] **Step 2: Call initialize_databases in setup()**

Add after `log::info!("Application starting up");`:

```rust
if let Err(e) = initialize_databases(app.handle()).await {
    log::error!("Failed to initialize databases: {e}");
    return Err(e.into());
}
```

The setup closure becomes:

```rust
.setup(|app| {
    log::info!("Application starting up");

    // Initialize databases
    let init_result = tokio::runtime::Handle::current().block_on(async {
        initialize_databases(app.handle()).await
    });
    if let Err(e) = init_result {
        log::error!("Failed to initialize databases: {e}");
        return Err(e.into());
    }

    // ... rest of setup
```

**Note:** If using `async fn` in setup causes issues, use `block_on`:

```rust
.setup(|app| {
    log::info!("Application starting up");

    // Initialize databases synchronously
    if let Err(e) = initialize_databases_sync(app.handle()) {
        log::error!("Failed to initialize databases: {e}");
        return Err(e.into());
    }

    // ... rest
```

Where `initialize_databases_sync` is a non-async version that calls `get_conn` directly.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(db): add database initialization on startup"
```

---

### Task 7: Delete prices.rs

**Files:**

- Delete: `src-tauri/src/commands/prices.rs`

- [ ] **Step 1: Delete prices.rs**

```bash
rm src-tauri/src/commands/prices.rs
git add src-tauri/src/commands/prices.rs
git commit -m "feat(db): remove prices module (variant_prices table obsolete)"
```

---

### Task 8: Clean up schema.rs

**Files:**

- Modify: `src-tauri/src/commands/schema.rs`

- [ ] **Step 1: Remove init_product_tables, seed_product_tables, get_table_layout**

Delete `init_product_tables` (lines 49-119), `seed_product_tables` (lines 121-209), and `get_table_layout` (lines 23-47).

Keep only the `get_db_path` and `get_conn` helper functions (or remove them since they're now in db_utils).

If keeping the file, it should be nearly empty. Consider removing `pub mod schema;` from `commands/mod.rs` if schema.rs only had helpers moved to db_utils.

Actually, since schema.rs now only contains helper functions duplicated by db_utils, and the spec says to remove init_product_tables and seed_product_tables, the file becomes empty or near-empty. Remove `pub mod schema;` from commands/mod.rs and optionally delete schema.rs entirely.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(db): remove schema module (moved to individual initializers)"
```

---

### Task 9: Verification

- [ ] **Step 1: Delete ma5zon.db and run app**

```bash
# Find and delete the database
find ~ -name "ma5zon.db" 2>/dev/null  # or use system file browser

# Run the app
npm run tauri dev
```

- [ ] **Step 2: Check logs for initialization messages**

Look for:

- `[UserInitializer] Seeding default admin`
- `[ProductsInitializer] Seeding sample products`
- `[VariantsInitializer] Seeding sample variants`

- [ ] **Step 3: Verify data with sqlite3**

```bash
sqlite3 ~/.local/share/com.tauri.ma5zon/ma5zon.db "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM products; SELECT COUNT(*) FROM product_variants;"
```

Expected output:

- users: 1 (admin)
- products: 40
- product_variants: varies (~80-160 based on seeding logic)

---

## Spec Coverage Check

- [x] DatabaseInitializable trait — Task 5
- [x] UserInitializer in user.rs — Task 2
- [x] ProductsInitializer in products.rs — Task 3
- [x] VariantsInitializer in variants.rs — Task 4
- [x] TABLE_INITIALIZERS registry — Task 5
- [x] initialize_databases in lib.rs — Task 6
- [x] Removed price_lists table — Task 1-4 (not created in new schema)
- [x] Removed variant_prices table — Task 1-4 (not created in new schema)
- [x] product_variants with inline price columns — Task 4
- [x] Deleted prices.rs — Task 7
- [x] Cleaned up schema.rs — Task 8

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-28-database-auto-init-plan.md`.**
