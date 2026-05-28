use async_trait::async_trait;
use rand::{seq::SliceRandom, Rng};
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;

pub struct StockInitializer;

#[async_trait]
impl DatabaseInitializable for StockInitializer {
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
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query variants: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect variant IDs: {e}"))?
    };

    let warehouse_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM warehouses ORDER BY id")
            .map_err(|e| format!("Failed to prepare statement: {e}"))?;
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query warehouses: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
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
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query variants: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect variant IDs: {e}"))?
    };

    let warehouse_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM warehouses ORDER BY id")
            .map_err(|e| format!("Failed to prepare statement: {e}"))?;
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query warehouses: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect warehouse IDs: {e}"))?
    };

    let movement_types = vec!["TRANSFER", "PURCHASE", "SALE", "ADJUST"];
    let num_movements = rng.gen_range(30..=35);

    let base_date = chrono::NaiveDate::from_ymd_opt(2026, 2, 28).unwrap();
    let days_span = 90;

    for _ in 0..num_movements {
        let variant_id = variant_ids[rng.gen_range(0..variant_ids.len())];
        let movement_type = movement_types[rng.gen_range(0..movement_types.len())];

        let (from_warehouse_id, to_warehouse_id, quantity): (Option<i64>, Option<i64>, f64) =
            match movement_type {
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
pub async fn stock_levels_get_by_variant(
    app: AppHandle,
    variant_id: String,
) -> Result<Vec<StockLevel>, String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id
        .parse()
        .map_err(|e| format!("Invalid variant_id: {e}"))?;
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
pub async fn stock_levels_get_by_warehouse(
    app: AppHandle,
    warehouse_id: String,
) -> Result<Vec<StockLevel>, String> {
    let conn = get_conn(&app)?;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
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
pub async fn stock_movements_get_by_variant(
    app: AppHandle,
    variant_id: String,
) -> Result<Vec<StockMovement>, String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id
        .parse()
        .map_err(|e| format!("Invalid variant_id: {e}"))?;
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
