# Warehouse Inventory System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add warehouse inventory tables (warehouses, stock_levels, stock_movements) with Arabic/Egyptian seed data, and regenerate existing products/variants seed data in Arabic.

**Architecture:** Follow existing DatabaseInitializable pattern for table creation + seeding. Split into warehouses.rs (warehouse entity + CRUD) and stock.rs (inventory tracking). Products and variants seed data regenerated in place.

**Tech Stack:** Rust, rusqlite, tauri-specta, rand

---

## File Structure

**Create:**
- `src-tauri/src/commands/warehouses.rs`
- `src-tauri/src/commands/stock.rs`

**Modify:**
- `src-tauri/src/commands/products.rs:42-67` (seed data in Arabic)
- `src-tauri/src/commands/variants.rs:64-76` (variant options in Arabic)
- `src-tauri/src/commands/mod.rs` (register new initializers)

---

## Tasks

### Task 1: Update products.rs seed data to Arabic

**Files:**
- Modify: `src-tauri/src/commands/products.rs:42-67`

**Steps:**

- [ ] **Step 1: Update seed_products function with Arabic product names**

Replace lines 45-59 with:
```rust
    let products = vec![
        "محرك كهربائي صناعي", "وحدة تحكم إلكترونية", "وحدة هيدروليكية",
        "طقم bearings دقيق", "طقم براغي ستانلس ستيل", "لوحة عرض LED",
        "لوح عزل حراري", "حامل ألياف كربون", "حزمة أسلاك نحاسية",
        "ملف ألومنيوم", "ختم مطاطي", "غطاء بلاستيكي",
        "عدسة زجاجية", "موصل نحاسي", "لوحة تيتانيوم",
        "مصفوفة مكثفات سيراميك", "حساس encoder مغناطيسي", "أسطوانة هوائية",
        "صندوق تقاطع ألواح شمسية", "طقم تروس مركب", "موجّه موجات صوتي",
        "حزمة ألياف بصرية", "محول تردد عالي", "بطارية طوارئ",
        "متحكم محرك سيرفو", "سكة توجيه خطية", "صمام تخفيف ضغط",
        "ثرموستات معدن ثنائي", "حامل مضاد للاهتزاز", "وحدة هوائي تردد الراديو",
        "أنبوب ستانلس 316L", "هيكل بولي كربونات", "مبدد حراري جرافيت",
        "طقم مغناطيس نيوديميوم", "محمل بطانة PTFE", "مركب راتنج إيبوكسي",
        "طقم حلقة سيليكون", "أنبوب زجاجي بوريوسيليكات", "صفائح فولاذ ملفوحة",
    ];
```

- [ ] **Step 2: Run cargo check to verify compilation**

Run: `cd /mnt/C/Accountant-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors related to products.rs

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/products.rs
git commit -m "refactor: update products seed data to Arabic"
```

---

### Task 2: Update variants.rs variant options to Arabic

**Files:**
- Modify: `src-tauri/src/commands/variants.rs:64-76`

**Steps:**

- [ ] **Step 1: Update variants_data with Arabic variant options**

Replace lines 64-76 with:
```rust
    let variants_data = vec![
        (vec!["درجة أولى", "درجة صناعية", "درجة اقتصادية", "درجة ممتازة"], "درجة"),
        (vec!["10 وات", "25 وات", "50 وات", "100 وات"], "قدرة"),
        (vec!["120 فولت", "240 فولت", "480 فولت", "جهد مزدوج"], "جهد"),
        (vec!["ذكر", "أنثى", "بارب", "ضغط"], "موصل"),
        (vec!["1 م", "2 م", "5 م", "10 م"], "طول"),
        (vec!["ستانلس ستيل 304", "ستانلس ستيل 316", "ستانلس ستيل 430", "مجلفن"], "مادة"),
        (vec!["شفاف", "ملون", "مرآوي", "مضاد للتوهج"], "تشطيب"),
        (vec!["M3", "M4", "M5", "M6", "M8"], "مقاس"),
        (vec!["صغير", "وسط", "كبير", "كبير جداً"], "حجم"),
        (vec!["2 أمبير", "5 أمبير", "10 أمبير", "20 أمبير"], "أمبير"),
    ];
```

- [ ] **Step 2: Update variant_name generation to use Arabic pattern**

Replace line 85 from:
```rust
let variant_name = format!("{} {} {}", "Product", variant_type.1, options[v % options.len()]);
```
to:
```rust
let variant_name = format!("{} {} {}", "منتج", variant_type.1, options[v % options.len()]);
```

- [ ] **Step 3: Run cargo check to verify compilation**

Run: `cd /mnt/C/Accountant-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors related to variants.rs

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/variants.rs
git commit -m "refactor: update variants seed data to Arabic"
```

---

### Task 3: Create warehouses.rs

**Files:**
- Create: `src-tauri/src/commands/warehouses.rs`

**Steps:**

- [ ] **Step 1: Create warehouses.rs with Warehouse type, initializer, and CRUD commands**

```rust
use async_trait::async_trait;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::{self, DatabaseInitializable};

pub struct WarehousesInitializer;

#[async_trait]
impl commands::DatabaseInitializable for WarehousesInitializer {
    fn table_name(&self) -> &str {
        "warehouses"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS warehouses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT
            )",
            [],
        )
        .map_err(|e| format!("Failed to create warehouses table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM warehouses", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count warehouses: {e}"))?;

        if count == 0 {
            log::info!("[WarehousesInitializer] Seeding sample warehouses");
            seed_warehouses(&conn)?;
        }

        Ok(())
    }
}

fn seed_warehouses(conn: &Connection) -> Result<(), String> {
    let warehouses = vec![
        ("مركز التوزيع المركزي", "القاهرة"),
        ("منشأة الساحل الشمالي", "الإسكندرية"),
        ("المخزن الإقليمي الشمالي", "المنصورة"),
        ("المستودع الجنوبي", "أسيوط"),
        ("مركز الصعيد", "سوهاج"),
    ];

    for (name, location) in warehouses {
        conn.execute(
            "INSERT INTO warehouses (name, location) VALUES (?1, ?2)",
            params![name, location],
        )
        .map_err(|e| format!("Failed to insert warehouse: {e}"))?;
    }

    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Warehouse {
    pub id: String,
    pub name: String,
    pub location: String,
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_get_all(app: AppHandle) -> Result<Vec<Warehouse>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, location FROM warehouses ORDER BY name")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let warehouses = stmt
        .query_map([], |row| {
            Ok(Warehouse {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                location: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query warehouses: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect warehouses: {e}"))?;

    Ok(warehouses)
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_get_by_id(app: AppHandle, id: String) -> Result<Option<Warehouse>, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, name, location FROM warehouses WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let warehouse = stmt
        .query_row(params![id_i64], |row| {
            Ok(Warehouse {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                location: row.get(2)?,
            })
        })
        .ok();

    Ok(warehouse)
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_create(app: AppHandle, name: String, location: String) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "INSERT INTO warehouses (name, location) VALUES (?1, ?2)",
        params![name, location],
    )
    .map_err(|e| format!("Failed to create warehouse: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Warehouse { id, name, location })
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_update(app: AppHandle, id: String, name: String, location: String) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute(
        "UPDATE warehouses SET name = ?1, location = ?2 WHERE id = ?3",
        params![name, location, id_i64],
    )
    .map_err(|e| format!("Failed to update warehouse: {e}"))?;

    Ok(Warehouse { id, name, location })
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute("DELETE FROM warehouses WHERE id = ?1", params![id_i64])
        .map_err(|e| format!("Failed to delete warehouse: {e}"))?;
    Ok(())
}
```

- [ ] **Step 2: Run cargo check to verify compilation**

Run: `cd /mnt/C/Accountant-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors related to warehouses.rs

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/warehouses.rs
git commit -m "feat: add warehouses module with CRUD commands and seeder"
```

---

### Task 4: Create stock.rs

**Files:**
- Create: `src-tauri/src/commands/stock.rs`

**Steps:**

- [ ] **Step 1: Create stock.rs with stock_levels, stock_movements, types, initializer, and CRUD commands**

```rust
use async_trait::async_trait;
use rand::Rng;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::{self, DatabaseInitializable};

pub struct StockInitializer;

#[async_trait]
impl commands::DatabaseInitializable for StockInitializer {
    fn table_name(&self) -> &str {
        "stock_levels"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS stock_levels (
                variant_id INTEGER NOT NULL,
                warehouse_id INTEGER NOT NULL,
                quantity REAL NOT NULL DEFAULT 0,
                PRIMARY KEY (variant_id, warehouse_id),
                FOREIGN KEY(variant_id) REFERENCES product_variants(id),
                FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create stock_levels table: {e}"))?;

        conn.execute(
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
            )",
            [],
        )
        .map_err(|e| format!("Failed to create stock_movements table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM stock_levels", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count stock_levels: {e}"))?;

        if count == 0 {
            log::info!("[StockInitializer] Seeding stock levels and movements");
            seed_stock_levels(&conn)?;
            seed_stock_movements(&conn)?;
        }

        Ok(())
    }
}

fn seed_stock_levels(conn: &Connection) -> Result<(), String> {
    let mut rng = rand::thread_rng();

    let variant_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM product_variants ORDER BY id")
            .map_err(|e| format!("Failed to prepare statement: {e}"))?;
        stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query variants: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect variant IDs: {e}"))?
    };

    let warehouse_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM warehouses ORDER BY id")
            .map_err(|e| format!("Failed to prepare statement: {e}"))?;
        stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query warehouses: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect warehouse IDs: {e}"))?
    };

    for variant_id in variant_ids {
        let num_warehouses = rng.gen_range(2..=5);
        let selected_warehouses: Vec<i64> = {
            let mut available = warehouse_ids.clone();
            available.shuffle(&mut rng);
            available.into_iter().take(num_warehouses).collect()
        };

        for warehouse_id in selected_warehouses {
            let quantity: f64 = ((rng.gen_range(50.0_f64..2000.0_f64) * 100.0).round()) / 100.0;
            conn.execute(
                "INSERT INTO stock_levels (variant_id, warehouse_id, quantity) VALUES (?1, ?2, ?3)",
                params![variant_id, warehouse_id, quantity],
            )
            .map_err(|e| format!("Failed to insert stock level: {e}"))?;
        }
    }

    Ok(())
}

fn seed_stock_movements(conn: &Connection) -> Result<(), String> {
    let mut rng = rand::thread_rng();

    let variant_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM product_variants ORDER BY id")
            .map_err(|e| format!("Failed to prepare statement: {e}"))?;
        stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query variants: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect variant IDs: {e}"))?
    };

    let warehouse_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM warehouses ORDER BY id")
            .map_err(|e| format!("Failed to prepare statement: {e}"))?;
        stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query warehouses: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect warehouse IDs: {e}"))?
    };

    let movement_types = vec!["TRANSFER", "PURCHASE", "SALE", "ADJUST"];
    let num_movements = rng.gen_range(30..=35);

    let base_date = chrono::NaiveDate::from_ymd_opt(2026, 2, 28).unwrap();
    let days_span = 90;

    for _ in 0..num_movements {
        let variant_id = variant_ids[rng.gen_range(0..variant_ids.len())];
        let movement_type = movement_types[rng.gen_range(0..movement_types.len())];

        let (from_warehouse_id, to_warehouse_id, quantity): (Option<i64>, Option<i64>, f64) = match movement_type {
            "TRANSFER" => {
                let from = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
                let mut to = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
                while to == from {
                    to = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
                }
                let qty: f64 = ((rng.gen_range(5.0_f64..200.0_f64) * 100.0).round()) / 100.0;
                (Some(from), Some(to), qty)
            }
            "PURCHASE" => {
                let to = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
                let qty: f64 = ((rng.gen_range(10.0_f64..500.0_f64) * 100.0).round()) / 100.0;
                (None, Some(to), qty)
            }
            "SALE" => {
                let from = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
                let qty: f64 = ((rng.gen_range(1.0_f64..100.0_f64) * 100.0).round()) / 100.0;
                (Some(from), None, qty)
            }
            "ADJUST" => {
                let warehouse_id = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
                let is_positive = rng.gen_bool(0.5);
                let qty: f64 = ((rng.gen_range(1.0_f64..50.0_f64) * 100.0).round()) / 100.0;
                if is_positive {
                    (None, Some(warehouse_id), qty)
                } else {
                    (Some(warehouse_id), None, qty)
                }
            }
            _ => unreachable!(),
        };

        let days_offset = rng.gen_range(0..days_span);
        let date = base_date + chrono::Duration::days(days_offset);
        let datetime = format!("{} 12:00:00", date.format("%Y-%m-%d"));

        conn.execute(
            "INSERT INTO stock_movements (variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![variant_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, datetime],
        )
        .map_err(|e| format!("Failed to insert stock movement: {e}"))?;
    }

    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StockLevel {
    pub variant_id: String,
    pub warehouse_id: String,
    pub quantity: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StockMovement {
    pub id: String,
    pub variant_id: String,
    pub from_warehouse_id: Option<String>,
    pub to_warehouse_id: Option<String>,
    pub quantity: f64,
    pub movement_type: String,
    pub created_at: String,
}

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_all(app: AppHandle) -> Result<Vec<StockLevel>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT variant_id, warehouse_id, quantity FROM stock_levels ORDER BY variant_id, warehouse_id")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let levels = stmt
        .query_map([], |row| {
            Ok(StockLevel {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                warehouse_id: row.get::<_, i64>(1)?.to_string(),
                quantity: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_variant(app: AppHandle, variant_id: String) -> Result<Vec<StockLevel>, String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT variant_id, warehouse_id, quantity FROM stock_levels WHERE variant_id = ?1 ORDER BY warehouse_id")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let levels = stmt
        .query_map(params![variant_id_i64], |row| {
            Ok(StockLevel {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                warehouse_id: row.get::<_, i64>(1)?.to_string(),
                quantity: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_warehouse(app: AppHandle, warehouse_id: String) -> Result<Vec<StockLevel>, String> {
    let conn = get_conn(&app)?;
    let warehouse_id_i64: i64 = warehouse_id.parse().map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT variant_id, warehouse_id, quantity FROM stock_levels WHERE warehouse_id = ?1 ORDER BY variant_id")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let levels = stmt
        .query_map(params![warehouse_id_i64], |row| {
            Ok(StockLevel {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                warehouse_id: row.get::<_, i64>(1)?.to_string(),
                quantity: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}

#[tauri::command]
#[specta::specta]
pub async fn stock_movements_get_all(app: AppHandle) -> Result<Vec<StockMovement>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at FROM stock_movements ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let movements = stmt
        .query_map([], |row| {
            Ok(StockMovement {
                id: row.get::<_, i64>(0)?.to_string(),
                variant_id: row.get::<_, i64>(1)?.to_string(),
                from_warehouse_id: row.get::<_, Option<i64>>(2)?.map(|v| v.to_string()),
                to_warehouse_id: row.get::<_, Option<i64>>(3)?.map(|v| v.to_string()),
                quantity: row.get(4)?,
                movement_type: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query stock movements: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock movements: {e}"))?;

    Ok(movements)
}

#[tauri::command]
#[specta::specta]
pub async fn stock_movements_get_by_variant(app: AppHandle, variant_id: String) -> Result<Vec<StockMovement>, String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at FROM stock_movements WHERE variant_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let movements = stmt
        .query_map(params![variant_id_i64], |row| {
            Ok(StockMovement {
                id: row.get::<_, i64>(0)?.to_string(),
                variant_id: row.get::<_, i64>(1)?.to_string(),
                from_warehouse_id: row.get::<_, Option<i64>>(2)?.map(|v| v.to_string()),
                to_warehouse_id: row.get::<_, Option<i64>>(3)?.map(|v| v.to_string()),
                quantity: row.get(4)?,
                movement_type: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query stock movements: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock movements: {e}"))?;

    Ok(movements)
}
```

- [ ] **Step 2: Run cargo check to verify compilation**

Run: `cd /mnt/C/Accountant-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors related to stock.rs. Note: may need to add chrono to Cargo.toml if not present.

- [ ] **Step 3: If chrono not in Cargo.toml, add it**

Check: `grep -n "chrono" src-tauri/Cargo.toml`
If not found, add to Cargo.toml:
```toml
chrono = "0.4"
```

- [ ] **Step 4: Run cargo check again to verify compilation**

Run: `cd /mnt/C/Accountant-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/stock.rs src-tauri/Cargo.toml
git commit -m "feat: add stock module with stock_levels, stock_movements, seeders"
```

---

### Task 5: Update mod.rs to register new initializers

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`

**Steps:**

- [ ] **Step 1: Add warehouses and stock modules to mod.rs**

Replace lines 9-16:
```rust
pub mod db_utils;
pub mod notifications;
pub mod preferences;
pub mod products;
pub mod quick_pane;
pub mod recovery;
pub mod user;
pub mod variants;
pub mod warehouses;
pub mod stock;
```

Replace lines 24-28:
```rust
use self::{
    products::ProductsInitializer,
    user::UserInitializer,
    variants::VariantsInitializer,
    warehouses::WarehousesInitializer,
    stock::StockInitializer,
};

pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
    &WarehousesInitializer,
    &StockInitializer,
];
```

- [ ] **Step 2: Run cargo check to verify compilation**

Run: `cd /mnt/C/Accountant-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/mod.rs
git commit -m "feat: register WarehousesInitializer and StockInitializer"
```

---

## Spec Coverage Check

- [x] warehouses table creation + seeder (5 Arabic warehouses)
- [x] stock_levels table creation + seeder (every variant in 2-5 random warehouses)
- [x] stock_movements table creation + seeder (30-35 movements, 25% each type, 90 days)
- [x] Products seed data updated to Arabic (40 items)
- [x] Variants seed data updated to Arabic (10 option sets)
- [x] CRUD commands for warehouses
- [x] Read commands for stock_levels and stock_movements
- [x] All initialization order correct (warehouses before stock)

---

## Type Consistency Check

- Warehouse.id, StockLevel.variant_id, StockLevel.warehouse_id, StockMovement.id all use `String`
- StockMovement.from_warehouse_id and to_warehouse_id are `Option<String>`
- All CRUD commands follow existing patterns from products.rs and variants.rs
- Initializers implement DatabaseInitializable correctly

---

Plan complete and saved to `docs/superpowers/plans/2026-05-28-warehouse-inventory-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**