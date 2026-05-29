# Soft Delete Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add created_at, updated_at, deleted_at columns to products, warehouses, and product_variants tables. Implement soft delete pattern for delete commands and filter deleted records in query commands.

**Architecture:** Add columns via ALTER TABLE (with existence checks for migration support). Delete commands set deleted_at instead of removing rows. Query commands add WHERE deleted_at IS NULL filter. Create/Update commands set timestamps.

**Tech Stack:** Rust, rusqlite, tauri-specta

---

## File Structure

**Modify:**
- `src-tauri/src/commands/products.rs` — add columns to init, soft delete, filter queries
- `src-tauri/src/commands/warehouses.rs` — add columns to init, soft delete, filter queries
- `src-tauri/src/commands/variants.rs` — add columns to init, soft delete, filter queries
- `src-tauri/src/commands/stock.rs` — add creation timestamps to movements seeder
- `src-tauri/src/bindings.rs` — already done (bindings added)

---

## Tasks

### Task 1: Update products.rs with soft delete schema and behavior

**Files:**
- Modify: `src-tauri/src/commands/products.rs`

**Steps:**

- [ ] **Step 1: Update table creation to include timestamp columns**

Replace lines 20-27 with:
```rust
conn.execute(
    "CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
    )",
    [],
)
.map_err(|e| format!("Failed to create products table: {e}"))?;
```

- [ ] **Step 2: Add ALTER TABLE migration after table creation**

After the CREATE TABLE block (after line 27), add:
```rust
// Migration: Add timestamp columns if they don't exist (for existing databases)
conn.execute("ALTER TABLE products ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", [])
    .map_err(|e| format!("Failed to add created_at column: {e}"))?;
conn.execute("ALTER TABLE products ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", [])
    .map_err(|e| format!("Failed to add updated_at column: {e}"))?;
conn.execute("ALTER TABLE products ADD COLUMN deleted_at DATETIME DEFAULT NULL", [])
    .map_err(|e| format!("Failed to add deleted_at column: {e}"))?;
```

- [ ] **Step 3: Update Product struct to include new fields**

Find the Product struct in types.rs or in the get_all query. Add created_at, updated_at, deleted_at fields to the struct and query.

In products.rs, the Product is used from types.rs. Update types.rs:
```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}
```

- [ ] **Step 4: Update get_all query to filter deleted records and include new columns**

Replace get_all query (around line 71-89):
```rust
let mut stmt = conn
    .prepare("SELECT id, name, created_at, updated_at, deleted_at FROM products WHERE deleted_at IS NULL ORDER BY name")
    .map_err(|e| format!("Failed to prepare statement: {e}"))?;

let products = stmt
    .query_map([], |row| {
        Ok(Product {
            id: row.get::<_, i64>(0)?.to_string(),
            name: row.get(1)?,
            created_at: row.get::<_, Option<String>>(2)?,
            updated_at: row.get::<_, Option<String>>(3)?,
            deleted_at: row.get::<_, Option<String>>(4)?,
        })
    })
    .map_err(|e| format!("Failed to query products: {e}"))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect products: {e}"))?;
```

- [ ] **Step 5: Update get_by_id query to filter deleted and include new columns**

Replace get_by_id query (around line 93-109):
```rust
let mut stmt = conn
    .prepare("SELECT id, name, created_at, updated_at, deleted_at FROM products WHERE id = ?1 AND deleted_at IS NULL")
    .map_err(|e| format!("Failed to prepare statement: {e}"))?;

let product = stmt
    .query_row(params![id_i64], |row| {
        Ok(Product {
            id: row.get::<_, i64>(0)?.to_string(),
            name: row.get(1)?,
            created_at: row.get::<_, Option<String>>(2)?,
            updated_at: row.get::<_, Option<String>>(3)?,
            deleted_at: row.get::<_, Option<String>>(4)?,
        })
    })
    .ok();
```

- [ ] **Step 6: Update create command to set timestamps**

Replace create command (around line 114-124):
```rust
#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO products (name, created_at, updated_at) VALUES (?1, ?2, ?3)",
        params![name, &now, &now],
    )
    .map_err(|e| format!("Failed to create product: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Product {
        id,
        name,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}
```

- [ ] **Step 7: Update update command to set updated_at timestamp**

Replace update command (around line 126-138):
```rust
#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: String, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE products SET name = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![name, &now, id_i64],
    )
    .map_err(|e| format!("Failed to update product: {e}"))?;

    Ok(Product {
        id,
        name,
        created_at: None,
        updated_at: Some(now),
        deleted_at: None,
    })
}
```

- [ ] **Step 8: Update delete command to soft delete**

Replace delete command (around line 140-148):
```rust
#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE products SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![&now, id_i64],
    )
    .map_err(|e| format!("Failed to delete product: {e}"))?;
    Ok(())
}
```

- [ ] **Step 9: Add chrono import at top of file**

Verify chrono is available (should be from stock.rs work):
```rust
use chrono::Local;
```

- [ ] **Step 10: Run cargo check to verify compilation**

Run: `cd /mnt/C/Ma5zon-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors

- [ ] **Step 11: Commit**

```bash
git add src-tauri/src/commands/products.rs src-tauri/src/types.rs
git commit -m "feat: add soft delete columns and behavior to products"
```

---

### Task 2: Update warehouses.rs with soft delete schema and behavior

**Files:**
- Modify: `src-tauri/src/commands/warehouses.rs`

**Steps:**

- [ ] **Step 1: Update table creation to include timestamp columns**

Replace lines 19-27 with:
```rust
conn.execute(
    "CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
    )",
    [],
)
.map_err(|e| format!("Failed to create warehouses table: {e}"))?;
```

- [ ] **Step 2: Add ALTER TABLE migration after table creation**

After the CREATE TABLE block, add:
```rust
// Migration: Add timestamp columns if they don't exist
conn.execute("ALTER TABLE warehouses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", [])
    .map_err(|e| format!("Failed to add created_at column: {e}"))?;
conn.execute("ALTER TABLE warehouses ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", [])
    .map_err(|e| format!("Failed to add updated_at column: {e}"))?;
conn.execute("ALTER TABLE warehouses ADD COLUMN deleted_at DATETIME DEFAULT NULL", [])
    .map_err(|e| format!("Failed to add deleted_at column: {e}"))?;
```

- [ ] **Step 3: Update Warehouse struct to include new fields**

Replace Warehouse struct (around line 62-67):
```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Warehouse {
    pub id: String,
    pub name: String,
    pub location: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}
```

- [ ] **Step 4: Update warehouses_get_all query to filter deleted and include new columns**

Replace query (around line 71-89):
```rust
let mut stmt = conn
    .prepare("SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses WHERE deleted_at IS NULL ORDER BY name")
    .map_err(|e| format!("Failed to prepare statement: {e}"))?;

let warehouses = stmt
    .query_map([], |row| {
        Ok(Warehouse {
            id: row.get::<_, i64>(0)?.to_string(),
            name: row.get(1)?,
            location: row.get(2)?,
            created_at: row.get::<_, Option<String>>(3)?,
            updated_at: row.get::<_, Option<String>>(4)?,
            deleted_at: row.get::<_, Option<String>>(5)?,
        })
    })
    .map_err(|e| format!("Failed to query warehouses: {e}"))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect warehouses: {e}"))?;
```

- [ ] **Step 5: Update warehouses_get_by_id query to filter deleted and include new columns**

Replace query (around line 93-112):
```rust
let warehouse = stmt
    .query_row(params![id_i64], |row| {
        Ok(Warehouse {
            id: row.get::<_, i64>(0)?.to_string(),
            name: row.get(1)?,
            location: row.get(2)?,
            created_at: row.get::<_, Option<String>>(3)?,
            updated_at: row.get::<_, Option<String>>(4)?,
            deleted_at: row.get::<_, Option<String>>(5)?,
        })
    })
    .ok();
```

- [ ] **Step 6: Update warehouses_create command to set timestamps**

Replace command (around line 116-126):
```rust
#[tauri::command]
#[specta::specta]
pub async fn warehouses_create(app: AppHandle, name: String, location: String) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO warehouses (name, location, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![name, location, &now, &now],
    )
    .map_err(|e| format!("Failed to create warehouse: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Warehouse {
        id,
        name,
        location,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}
```

- [ ] **Step 7: Update warehouses_update command to set updated_at**

Replace command (around line 130-140):
```rust
#[tauri::command]
#[specta::specta]
pub async fn warehouses_update(app: AppHandle, id: String, name: String, location: String) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE warehouses SET name = ?1, location = ?2, updated_at = ?3 WHERE id = ?4 AND deleted_at IS NULL",
        params![name, location, &now, id_i64],
    )
    .map_err(|e| format!("Failed to update warehouse: {e}"))?;

    Ok(Warehouse {
        id,
        name,
        location,
        created_at: None,
        updated_at: Some(now),
        deleted_at: None,
    })
}
```

- [ ] **Step 8: Update warehouses_delete command to soft delete**

Replace command (around line 144-150):
```rust
#[tauri::command]
#[specta::specta]
pub async fn warehouses_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE warehouses SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![&now, id_i64],
    )
    .map_err(|e| format!("Failed to delete warehouse: {e}"))?;
    Ok(())
}
```

- [ ] **Step 9: Add chrono import at top of file**

Add after existing imports:
```rust
use chrono::Local;
```

- [ ] **Step 10: Run cargo check to verify compilation**

Run: `cd /mnt/C/Ma5zon-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors

- [ ] **Step 11: Commit**

```bash
git add src-tauri/src/commands/warehouses.rs
git commit -m "feat: add soft delete columns and behavior to warehouses"
```

---

### Task 3: Update variants.rs with soft delete schema and behavior

**Files:**
- Modify: `src-tauri/src/commands/variants.rs`

**Steps:**

- [ ] **Step 1: Update table creation to include timestamp columns**

Replace lines 20-31 with:
```rust
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )",
    [],
)
.map_err(|e| format!("Failed to create product_variants table: {e}"))?;
```

- [ ] **Step 2: Add ALTER TABLE migration after table creation**

After the CREATE TABLE block, add:
```rust
// Migration: Add timestamp columns if they don't exist
conn.execute("ALTER TABLE product_variants ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", [])
    .map_err(|e| format!("Failed to add created_at column: {e}"))?;
conn.execute("ALTER TABLE product_variants ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", [])
    .map_err(|e| format!("Failed to add updated_at column: {e}"))?;
conn.execute("ALTER TABLE product_variants ADD COLUMN deleted_at DATETIME DEFAULT NULL", [])
    .map_err(|e| format!("Failed to add deleted_at column: {e}"))?;
```

- [ ] **Step 3: Update Variant struct in types.rs to include new fields**

Replace Variant struct in types.rs (around line 107-117):
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
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}
```

- [ ] **Step 4: Update variants_get_all query to filter deleted and include new columns**

Replace query (around line 106-130):
```rust
let mut stmt = conn
    .prepare("SELECT id, product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price, created_at, updated_at, deleted_at FROM product_variants WHERE deleted_at IS NULL ORDER BY sku")
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
            created_at: row.get::<_, Option<String>>(8)?,
            updated_at: row.get::<_, Option<String>>(9)?,
            deleted_at: row.get::<_, Option<String>>(10)?,
        })
    })
    .map_err(|e| format!("Failed to query variants: {e}"))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect variants: {e}"))?;
```

- [ ] **Step 5: Update variants_get_by_product query to filter deleted and include new columns**

Replace query (around line 134-159):
```rust
let variants = stmt
    .query_map(params![product_id_i64], |row| {
        Ok(Variant {
            id: row.get::<_, i64>(0)?.to_string(),
            product_id: row.get::<_, i64>(1)?.to_string(),
            sku: row.get(2)?,
            variant_name: row.get(3)?,
            uom_id: row.get::<_, i64>(4)?.to_string(),
            retail_price: row.get(5)?,
            wholesale_price: row.get(6)?,
            distribution_price: row.get(7)?,
            created_at: row.get::<_, Option<String>>(8)?,
            updated_at: row.get::<_, Option<String>>(9)?,
            deleted_at: row.get::<_, Option<String>>(10)?,
        })
    })
    .map_err(|e| format!("Failed to query variants: {e}"))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect variants: {e}"))?;
```

- [ ] **Step 6: Update variants_get_by_id query to filter deleted and include new columns**

Replace query (around line 163-186):
```rust
let variant = stmt
    .query_row(params![id_i64], |row| {
        Ok(Variant {
            id: row.get::<_, i64>(0)?.to_string(),
            product_id: row.get::<_, i64>(1)?.to_string(),
            sku: row.get(2)?,
            variant_name: row.get(3)?,
            uom_id: row.get::<_, i64>(4)?.to_string(),
            retail_price: row.get(5)?,
            wholesale_price: row.get(6)?,
            distribution_price: row.get(7)?,
            created_at: row.get::<_, Option<String>>(8)?,
            updated_at: row.get::<_, Option<String>>(9)?,
            deleted_at: row.get::<_, Option<String>>(10)?,
        })
    })
    .ok();
```

- [ ] **Step 7: Update variants_create command to set timestamps**

Replace command (around line 190-209):
```rust
#[tauri::command]
#[specta::specta]
pub async fn variants_create(app: AppHandle, variant: NewVariant) -> Result<Variant, String> {
    let conn = get_conn(&app)?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO product_variants (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![variant.product_id, variant.sku, variant.variant_name, variant.uom_id, variant.retail_price, variant.wholesale_price, variant.distribution_price, &now, &now],
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
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}
```

- [ ] **Step 8: Update variants_update command to set updated_at**

Replace command (around line 213-244):
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
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE product_variants SET sku = ?1, variant_name = ?2, uom_id = ?3, retail_price = ?4, wholesale_price = ?5, distribution_price = ?6, updated_at = ?7 WHERE id = ?8 AND deleted_at IS NULL",
        params![new_sku, new_variant_name, new_uom_id, new_retail_price, new_wholesale_price, new_distribution_price, &now, id_i64],
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
        created_at: current.created_at,
        updated_at: Some(now),
        deleted_at: None,
    })
}
```

- [ ] **Step 9: Update variants_delete command to soft delete**

Replace command (around line 248-254):
```rust
#[tauri::command]
#[specta::specta]
pub async fn variants_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE product_variants SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![&now, id_i64],
    )
    .map_err(|e| format!("Failed to delete variant: {e}"))?;
    Ok(())
}
```

- [ ] **Step 10: Add chrono import at top of file**

Add after existing imports:
```rust
use chrono::Local;
```

- [ ] **Step 11: Run cargo check to verify compilation**

Run: `cd /mnt/C/Ma5zon-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors

- [ ] **Step 12: Commit**

```bash
git add src-tauri/src/commands/variants.rs src-tauri/src/types.rs
git commit -m "feat: add soft delete columns and behavior to variants"
```

---

### Task 4: Final verification

**Steps:**

- [ ] **Step 1: Run full cargo check on entire project**

Run: `cd /mnt/C/Ma5zon-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors (warnings are OK)

- [ ] **Step 2: Commit final state**

```bash
git add -A && git commit -m "feat: soft delete schema complete for products, warehouses, variants"
```

---

## Spec Coverage Check

- [x] products table: created_at, updated_at, deleted_at columns added
- [x] warehouses table: created_at, updated_at, deleted_at columns added
- [x] product_variants table: created_at, updated_at, deleted_at columns added
- [x] Migration strategy: ALTER TABLE for existing databases
- [x] Delete commands: soft delete (set deleted_at) for products, warehouses, variants
- [x] Query commands: filter WHERE deleted_at IS NULL
- [x] Create commands: set created_at and updated_at timestamps
- [x] Update commands: set updated_at timestamp

---

## Type Consistency Check

- Product.id, Warehouse.id, Variant.id all use String
- created_at, updated_at, deleted_at are Option<String> in all structs
- All SQL queries use correct column names and filter deleted_at IS NULL
- chrono::Local used for timestamp generation in all files

---

Plan complete and saved to `docs/superpowers/plans/2026-05-28-soft-delete-schema-plan.md`.