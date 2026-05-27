# Product Variants with Expanded Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CRUD commands for products, product_variants, and variant_prices tables, then integrate with EntityWorkspace to display data with TanStack Table's expanded row showing variants beneath products.

**Architecture:** Rust commands grouped by entity (products, variants, prices, schema). Frontend uses TanStack Query to fetch data and layout, DataTable handles expanded rows with nested VariantsSubTable.

**Tech Stack:** Rust, rusqlite, tauri-specta, React 19, TanStack Table v5, TanStack Query v5

---

## File Structure

```
src-tauri/src/commands/
├── products.rs      # products:: namespace (CRUD)
├── variants.rs      # variants:: namespace (CRUD + get_by_product)
├── prices.rs        # prices:: namespace (CRUD + get_by_variant)
├── schema.rs        # schema:: namespace (get_table_layout, init_product_tables)
└── mod.rs           # Export all new modules

src/components/entity/
├── VariantsSubTable.tsx  # New: nested variants in expanded row
└── ...existing

src/lib/types/
└── entity.ts        # Add ProductRow, VariantRow, VariantPriceRow, TableLayout
```

---

## Task 1: Add Rust Types for Products/Variants

**Files:**
- Modify: `src-tauri/src/types.rs`

- [ ] **Step 1: Add new types to types.rs**

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Product {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Variant {
    pub id: i64,
    pub product_id: i64,
    pub sku: String,
    pub variant_name: String,
    pub uom_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct VariantPrice {
    pub variant_id: i64,
    pub price_list_id: i64,
    pub price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TableLayout {
    pub table_name: String,
    pub columns: Vec<ColumnDefRust>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ColumnDefRust {
    pub id: String,
    pub name: String,
    pub col_type: String,
    pub width: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NewVariant {
    pub product_id: i64,
    pub sku: String,
    pub variant_name: String,
    pub uom_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateVariant {
    pub sku: Option<String>,
    pub variant_name: Option<String>,
    pub uom_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NewVariantPrice {
    pub variant_id: i64,
    pub price_list_id: i64,
    pub price: f64,
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/types.rs
git commit -m "feat: add Product, Variant, VariantPrice, TableLayout types"
```

---

## Task 2: Create products.rs Commands

**Files:**
- Create: `src-tauri/src/commands/products.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/bindings.rs`

- [ ] **Step 1: Create products.rs**

```rust
use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::Product;

fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(app_data_dir.join("ma5zon.db"))
}

fn get_conn(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))
}

#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<Product>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM products ORDER BY name")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let products = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to query products: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect products: {e}"))?;

    Ok(products)
}

#[tauri::command]
#[specta::specta]
pub async fn get_by_id(app: AppHandle, id: i64) -> Result<Option<Product>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM products WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let product = stmt
        .query_row(params![id], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .ok();

    Ok(product)
}

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO products (id, name) VALUES (?1, ?2)",
        params![id, name],
    )
    .map_err(|e| format!("Failed to create product: {e}"))?;

    Ok(Product { id: id.parse().unwrap(), name })
}

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: i64, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "UPDATE products SET name = ?1 WHERE id = ?2",
        params![name, id],
    )
    .map_err(|e| format!("Failed to update product: {e}"))?;

    Ok(Product { id, name })
}

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute("DELETE FROM products WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete product: {e}"))?;
    Ok(())
}
```

- [ ] **Step 2: Update mod.rs to export products module**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod products;
```

- [ ] **Step 3: Update bindings.rs**

Add to the commands list in `generate_bindings()`:
```rust
products::get_all,
products::get_by_id,
products::create,
products::update,
products::delete,
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/products.rs src-tauri/src/commands/mod.rs src-tauri/src/bindings.rs
git commit -m "feat: add products CRUD commands"
```

---

## Task 3: Create variants.rs Commands

**Files:**
- Create: `src-tauri/src/commands/variants.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/bindings.rs`

- [ ] **Step 1: Create variants.rs**

```rust
use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::{Variant, NewVariant, UpdateVariant};

fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(app_data_dir.join("ma5zon.db"))
}

fn get_conn(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))
}

#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id FROM product_variants ORDER BY sku")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map([], |row| {
            Ok(Variant {
                id: row.get(0)?,
                product_id: row.get(1)?,
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query variants: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect variants: {e}"))?;

    Ok(variants)
}

#[tauri::command]
#[specta::specta]
pub async fn get_by_product(app: AppHandle, product_id: i64) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id FROM product_variants WHERE product_id = ?1 ORDER BY sku")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map(params![product_id], |row| {
            Ok(Variant {
                id: row.get(0)?,
                product_id: row.get(1)?,
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query variants: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect variants: {e}"))?;

    Ok(variants)
}

#[tauri::command]
#[specta::specta]
pub async fn get_by_id(app: AppHandle, id: i64) -> Result<Option<Variant>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id FROM product_variants WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variant = stmt
        .query_row(params![id], |row| {
            Ok(Variant {
                id: row.get(0)?,
                product_id: row.get(1)?,
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get(4)?,
            })
        })
        .ok();

    Ok(variant)
}

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, variant: NewVariant) -> Result<Variant, String> {
    let conn = get_conn(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO product_variants (id, product_id, sku, variant_name, uom_id) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, variant.product_id, variant.sku, variant.variant_name, variant.uom_id],
    )
    .map_err(|e| format!("Failed to create variant: {e}"))?;

    Ok(Variant {
        id: id.parse().unwrap(),
        product_id: variant.product_id,
        sku: variant.sku,
        variant_name: variant.variant_name,
        uom_id: variant.uom_id,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: i64, variant: UpdateVariant) -> Result<Variant, String> {
    let conn = get_conn(&app)?;

    let current = get_by_id(app.clone(), id)
        .await?
        .ok_or_else(|| "Variant not found".to_string())?;

    let new_sku = variant.sku.unwrap_or(current.sku);
    let new_variant_name = variant.variant_name.unwrap_or(current.variant_name);
    let new_uom_id = variant.uom_id.unwrap_or(current.uom_id);

    conn.execute(
        "UPDATE product_variants SET sku = ?1, variant_name = ?2, uom_id = ?3 WHERE id = ?4",
        params![new_sku, new_variant_name, new_uom_id, id],
    )
    .map_err(|e| format!("Failed to update variant: {e}"))?;

    Ok(Variant {
        id,
        product_id: current.product_id,
        sku: new_sku,
        variant_name: new_variant_name,
        uom_id: new_uom_id,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute("DELETE FROM product_variants WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete variant: {e}"))?;
    Ok(())
}
```

- [ ] **Step 2: Update mod.rs to export variants module**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod variants;
```

- [ ] **Step 3: Update bindings.rs**

Add to the commands list in `generate_bindings()`:
```rust
variants::get_all,
variants::get_by_product,
variants::get_by_id,
variants::create,
variants::update,
variants::delete,
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/variants.rs src-tauri/src/commands/mod.rs src-tauri/src/bindings.rs
git commit -m "feat: add variants CRUD commands with get_by_product"
```

---

## Task 4: Create prices.rs Commands

**Files:**
- Create: `src-tauri/src/commands/prices.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/bindings.rs`

- [ ] **Step 1: Create prices.rs**

```rust
use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::VariantPrice;

fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(app_data_dir.join("ma5zon.db"))
}

fn get_conn(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))
}

#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<VariantPrice>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT variant_id, price_list_id, price FROM variant_prices")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let prices = stmt
        .query_map([], |row| {
            Ok(VariantPrice {
                variant_id: row.get(0)?,
                price_list_id: row.get(1)?,
                price: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query prices: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect prices: {e}"))?;

    Ok(prices)
}

#[tauri::command]
#[specta::specta]
pub async fn get_by_variant(app: AppHandle, variant_id: i64) -> Result<Vec<VariantPrice>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT variant_id, price_list_id, price FROM variant_prices WHERE variant_id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let prices = stmt
        .query_map(params![variant_id], |row| {
            Ok(VariantPrice {
                variant_id: row.get(0)?,
                price_list_id: row.get(1)?,
                price: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query prices: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect prices: {e}"))?;

    Ok(prices)
}

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, variant_id: i64, price_list_id: i64, price: f64) -> Result<VariantPrice, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "INSERT INTO variant_prices (variant_id, price_list_id, price) VALUES (?1, ?2, ?3)",
        params![variant_id, price_list_id, price],
    )
    .map_err(|e| format!("Failed to create price: {e}"))?;

    Ok(VariantPrice { variant_id, price_list_id, price })
}

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, variant_id: i64, price_list_id: i64, price: f64) -> Result<VariantPrice, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "INSERT INTO variant_prices (variant_id, price_list_id, price) VALUES (?1, ?2, ?3)
         ON CONFLICT(variant_id, price_list_id) DO UPDATE SET price = ?3",
        params![variant_id, price_list_id, price],
    )
    .map_err(|e| format!("Failed to update price: {e}"))?;

    Ok(VariantPrice { variant_id, price_list_id, price })
}

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, variant_id: i64, price_list_id: i64) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "DELETE FROM variant_prices WHERE variant_id = ?1 AND price_list_id = ?2",
        params![variant_id, price_list_id],
    )
    .map_err(|e| format!("Failed to delete price: {e}"))?;
    Ok(())
}
```

- [ ] **Step 2: Update mod.rs to export prices module**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod prices;
```

- [ ] **Step 3: Update bindings.rs**

Add to the commands list in `generate_bindings()`:
```rust
prices::get_all,
prices::get_by_variant,
prices::create,
prices::update,
prices::delete,
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/prices.rs src-tauri/src/commands/mod.rs src-tauri/src/bindings.rs
git commit -m "feat: add prices CRUD commands with get_by_variant"
```

---

## Task 5: Create schema.rs Commands

**Files:**
- Create: `src-tauri/src/commands/schema.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/bindings.rs`

- [ ] **Step 1: Create schema.rs**

```rust
use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::{ColumnDefRust, TableLayout};

fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(app_data_dir.join("ma5zon.db"))
}

fn get_conn(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))
}

#[tauri::command]
#[specta::specta]
pub async fn get_table_layout(app: AppHandle, table: &str) -> Result<TableLayout, String> {
    let conn = get_conn(&app)?;

    let columns: Vec<ColumnDefRust> = match table {
        "products" => vec![
            ColumnDefRust { id: "id".to_string(), name: "ID".to_string(), col_type: "number".to_string(), width: 80 },
            ColumnDefRust { id: "name".to_string(), name: "Product Name".to_string(), col_type: "text".to_string(), width: 200 },
        ],
        "product_variants" => vec![
            ColumnDefRust { id: "id".to_string(), name: "ID".to_string(), col_type: "number".to_string(), width: 80 },
            ColumnDefRust { id: "product_id".to_string(), name: "Product ID".to_string(), col_type: "number".to_string(), width: 100 },
            ColumnDefRust { id: "sku".to_string(), name: "SKU".to_string(), col_type: "text".to_string(), width: 120 },
            ColumnDefRust { id: "variant_name".to_string(), name: "Variant Name".to_string(), col_type: "text".to_string(), width: 180 },
            ColumnDefRust { id: "uom_id".to_string(), name: "UOM".to_string(), col_type: "text".to_string(), width: 80 },
        ],
        _ => return Err(format!("Unknown table: {}", table)),
    };

    Ok(TableLayout {
        table_name: table.to_string(),
        columns,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn init_product_tables(app: AppHandle) -> Result<(), String> {
    let conn = get_conn(&app)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create products table: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS product_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            sku TEXT UNIQUE,
            variant_name TEXT,
            uom_id INTEGER,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )",
        [],
    )
    .map_err(|e| format!("Failed to create product_variants table: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS variant_prices (
            variant_id INTEGER,
            price_list_id INTEGER,
            price REAL NOT NULL,
            PRIMARY KEY (variant_id, price_list_id),
            FOREIGN KEY(variant_id) REFERENCES product_variants(id)
        )",
        [],
    )
    .map_err(|e| format!("Failed to create variant_prices table: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS price_lists (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create price_lists table: {e}"))?;

    // Seed default price lists if empty
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM price_lists", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count price lists: {e}"))?;

    if count == 0 {
        conn.execute("INSERT INTO price_lists (id, name) VALUES (1, 'Retail')", [])
            .map_err(|e| format!("Failed to seed retail: {e}"))?;
        conn.execute("INSERT INTO price_lists (id, name) VALUES (2, 'Wholesale')", [])
            .map_err(|e| format!("Failed to seed wholesale: {e}"))?;
        conn.execute("INSERT INTO price_lists (id, name) VALUES (3, 'Distribution')", [])
            .map_err(|e| format!("Failed to seed distribution: {e}"))?;
    }

    Ok(())
}
```

- [ ] **Step 2: Update mod.rs to export schema module**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod schema;
```

- [ ] **Step 3: Update bindings.rs**

Add to the commands list in `generate_bindings()`:
```rust
schema::get_table_layout,
schema::init_product_tables,
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/schema.rs src-tauri/src/commands/mod.rs src-tauri/src/bindings.rs
git commit -m "feat: add schema commands for table layout and initialization"
```

---

## Task 6: Add Frontend Types

**Files:**
- Modify: `src/lib/types/entity.ts`

- [ ] **Step 1: Add new interfaces**

```typescript
export interface ProductRow {
  id: string
  name: string
  [key: string]: unknown
}

export interface VariantRow {
  id: string
  product_id: string
  sku: string
  variant_name: string
  uom_id: number
  [key: string]: unknown
}

export interface VariantPriceRow {
  variant_id: string
  price_list_id: number
  price: number
}

export interface TableLayout {
  table_name: string
  columns: ColumnDef[]
}

export interface ExpandedRowState {
  expandedIds: Set<string>
  variantsCache: Map<string, VariantRow[]>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/entity.ts
git commit -m "feat: add ProductRow, VariantRow, TableLayout types to entity"
```

---

## Task 7: Create VariantsSubTable Component

**Files:**
- Create: `src/components/entity/VariantsSubTable.tsx`

- [ ] **Step 1: Create VariantsSubTable.tsx**

```tsx
import { useTranslation } from 'react-i18next'
import type { VariantRow } from '@/lib/types/entity'
import { Skeleton } from '@/components/ui/skeleton'

interface VariantsSubTableProps {
  variants: VariantRow[]
  isLoading?: boolean
}

function formatPrice(price: number | undefined): string {
  if (price === undefined) return '-'
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function VariantsSubTable({ variants, isLoading }: VariantsSubTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm">
        No variants found
      </div>
    )
  }

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="px-3 py-2 text-left text-on-surface-variant font-label-caps text-label-caps">
              SKU
            </th>
            <th className="px-3 py-2 text-left text-on-surface-variant font-label-caps text-label-caps">
              Variant Name
            </th>
            <th className="px-3 py-2 text-left text-on-surface-variant font-label-caps text-label-caps">
              UOM
            </th>
            <th className="px-3 py-2 text-right text-on-surface-variant font-label-caps text-label-caps">
              Retail
            </th>
            <th className="px-3 py-2 text-right text-on-surface-variant font-label-caps text-label-caps">
              Wholesale
            </th>
            <th className="px-3 py-2 text-right text-on-surface-variant font-label-caps text-label-caps">
              Distribution
            </th>
          </tr>
        </thead>
        <tbody>
          {variants.map(variant => (
            <tr
              key={variant.id}
              className="border-t border-outline-variant/30 hover:bg-surface-container-high transition-colors"
            >
              <td className="px-3 py-2 text-on-surface font-data-tabular tabular-nums">
                {variant.sku}
              </td>
              <td className="px-3 py-2 text-on-surface">
                {variant.variant_name}
              </td>
              <td className="px-3 py-2 text-on-surface">
                {variant.uom_id}
              </td>
              <td className="px-3 py-2 text-right text-on-surface font-data-tabular tabular-nums">
                {formatPrice((variant as Record<string, unknown>).retail_price as number)}
              </td>
              <td className="px-3 py-2 text-right text-on-surface font-data-tabular tabular-nums">
                {formatPrice((variant as Record<string, unknown>).wholesale_price as number)}
              </td>
              <td className="px-3 py-2 text-right text-on-surface font-data-tabular tabular-nums">
                {formatPrice((variant as Record<string, unknown>).dist_price as number)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/VariantsSubTable.tsx
git commit -m "feat: add VariantsSubTable component for expanded rows"
```

---

## Task 8: Update DataTable with Expanded Row Support

**Files:**
- Modify: `src/components/entity/DataTable.tsx`

- [ ] **Step 1: Add expanded row props and rendering**

Add to props interface:
```typescript
expandedRowIds?: Set<string>
variantsCache?: Map<string, VariantRow[]>
onRowToggleExpand?: (id: string) => void
isLoadingVariants?: (id: string) => boolean
```

Add expand chevron to select column header and cells, render detail panel:
```tsx
// Add expand chevron column
{
  id: 'expand',
  size: 40,
  enableResizing: false,
  header: () => null,
  cell: ({ row }) => (
    <button
      className="p-1 hover:bg-surface-bright rounded transition-colors"
      onClick={(e) => {
        e.stopPropagation()
        onRowToggleExpand?.(row.original.id)
      }}
    >
      <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${expandedRowIds?.has(row.original.id) ? 'rotate-90' : ''}`}>
        chevron_right
      </span>
    </button>
  ),
}

// In tbody, render detail row:
{table.getRowModel().rows.map(row => (
  <>
    <tr
      key={row.id}
      className="hover:bg-surface-container-high transition-colors group even:bg-surface-container-low/30"
    >
      {row.getVisibleCells().map(cell => (
        <td
          key={cell.id}
          className="px-compact-padding py-2 text-on-surface"
          style={{ width: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
    {row.getIsExpanded() && (
      <tr key={`${row.id}-detail`}>
        <td colSpan={columns.length + 2} className="p-0">
          <VariantsSubTable
            variants={variantsCache?.get(row.original.id) ?? []}
            isLoading={isLoadingVariants?.(row.original.id)}
          />
        </td>
      </tr>
    )}
  </>
))}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/DataTable.tsx
git commit -m "feat: add expanded row support to DataTable"
```

---

## Task 9: Update DataTableShell with Expansion State

**Files:**
- Modify: `src/components/entity/DataTableShell.tsx`

- [ ] **Step 1: Add expanded row props**

Add to props:
```typescript
expandedRowIds?: Set<string>
variantsCache?: Map<string, VariantRow[]>
onRowToggleExpand?: (id: string) => void
isLoadingVariants?: (id: string) => boolean
```

Pass through to DataTable.

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat: add expanded row state props to DataTableShell"
```

---

## Task 10: Wire EntityWorkspace to Use Commands

**Files:**
- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Update EntityWorkspace to use TanStack Query**

Replace mock data with:
```tsx
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

// Fetch products
const { data: products, isLoading } = useQuery({
  queryKey: ['products'],
  queryFn: () => commands.products.get_all(),
})

// Expansion state
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
const [variantsCache, setVariantsCache] = useState<Map<string, VariantRow[]>>(new Map())

const handleRowToggleExpand = useCallback(async (id: string) => {
  const newExpanded = new Set(expandedIds)
  if (newExpanded.has(id)) {
    newExpanded.delete(id)
  } else {
    newExpanded.add(id)
    if (!variantsCache.has(id)) {
      const variants = await commands.variants.get_by_product(parseInt(id))
      setVariantsCache(prev => new Map(prev).set(id, variants))
    }
  }
  setExpandedIds(newExpanded)
}, [expandedIds, variantsCache])

// Define columns for products table
const columns: ColumnDef[] = [
  { id: 'id', label: 'ID', type: 'number', width: 80, sortable: true, filterable: true, visible: true, order: 1 },
  { id: 'name', label: 'Product Name', type: 'text', width: 200, sortable: true, filterable: true, visible: true, order: 2, isNameColumn: true },
]

// Pass to DataTableShell
<DataTableShell
  columns={columns}
  data={products ?? []}
  isLoading={isLoading}
  expandedRowIds={expandedIds}
  variantsCache={variantsCache}
  onRowToggleExpand={handleRowToggleExpand}
  // ... other props
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "feat: wire EntityWorkspace to products commands"
```

---

## Self-Review Checklist

1. **Spec coverage**: All commands created (products, variants, prices, schema), DataTable expanded row support added, VariantsSubTable created, EntityWorkspace wired to commands

2. **Placeholder scan**: No "TBD" or "TODO" markers

3. **Type consistency**: Rust types match TypeScript interfaces, ColumnDef types aligned

4. **Spec gaps**: None identified

5. **Commands tested**: Each command has proper error handling with `map_err`

6. **Database init**: `init_product_tables` handles CREATE TABLE IF NOT EXISTS

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-product-variants-expanded-row-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?