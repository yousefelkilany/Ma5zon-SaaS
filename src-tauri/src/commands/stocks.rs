use async_trait::async_trait;
use rand::{seq::SliceRandom, Rng};
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::commands::warehouses::PaginatedResponse;
use crate::sql::stocks::{
    create_levels_table, create_movements_table, fetch_products_by_warehouse_with_stock,
    get_levels_all, get_levels_by_variant, get_levels_by_warehouse, get_movements_all,
    get_movements_by_variant, get_stock_levels_by_product, get_levels_by_warehouse_with_names,
};

pub struct StockInitializer;

#[async_trait]
impl DatabaseInitializable for StockInitializer {
    fn table_name(&self) -> &str {
        "stock_levels"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(create_levels_table(), [])
            .map_err(|e| format!("Failed to create stock_levels table: {e}"))?;
        conn.execute(create_movements_table(), [])
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
            .prepare("SELECT id FROM active_warehouses ORDER BY id")
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
            let quantity: i64 = (((rng.gen_range(50.0_f64..2000.0_f64) * 100.0).round()) / 100.0) as i64;
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
            .prepare("SELECT id FROM active_warehouses ORDER BY id")
            .map_err(|e| format!("Failed to prepare statement: {e}"))?;
        let rows = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query warehouses: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect warehouse IDs: {e}"))?
    };

    let movement_types = ["TRANSFER", "PURCHASE", "SALE", "ADJUST"];
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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockLevel {
    pub variant_id: String,
    pub warehouse_id: String,
    pub quantity: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockMovement {
    pub id: String,
    pub variant_id: String,
    pub from_warehouse_id: Option<String>,
    pub to_warehouse_id: Option<String>,
    pub quantity: f64,
    pub movement_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockLevelWithVariant {
    pub variant_id: String,
    pub variant_name: String,
    pub sku: String,
    pub warehouse_id: String,
    pub quantity: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ProductWithStock {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct VariantWithStock {
    pub variant_id: String,
    pub variant_name: String,
    pub sku: String,
    pub quantity: f64,
}

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_all(app: AppHandle) -> Result<Vec<StockLevel>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare(get_levels_all())
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
        .prepare(get_levels_by_variant())
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
        .prepare(get_levels_by_warehouse())
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
        .prepare(get_movements_all())
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
        .prepare(get_movements_by_variant())
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

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_product(
    app: AppHandle,
    product_id: String,
) -> Result<Vec<StockLevelWithVariant>, String> {
    let conn = get_conn(&app)?;
    let product_id_i64: i64 = product_id
        .parse()
        .map_err(|e| format!("Invalid product_id: {e}"))?;
    let mut stmt = conn
        .prepare(get_stock_levels_by_product())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let levels = stmt
        .query_map(params![product_id_i64], |row| {
            Ok(StockLevelWithVariant {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                variant_name: row.get::<_, String>(1)?,
                sku: row.get::<_, String>(2)?,
                warehouse_id: row.get::<_, i64>(3)?.to_string(),
                quantity: row.get::<_, f64>(4)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}

#[tauri::command]
#[specta::specta]
pub async fn stock_levels_get_by_warehouse_with_names(
    app: AppHandle,
    warehouse_id: String,
) -> Result<Vec<StockLevelWithVariant>, String> {
    let conn = get_conn(&app)?;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let mut stmt = conn
        .prepare(get_levels_by_warehouse_with_names())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let levels = stmt
        .query_map(params![warehouse_id_i64], |row| {
            Ok(StockLevelWithVariant {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                variant_name: row.get::<_, String>(1)?,
                sku: row.get::<_, String>(2)?,
                warehouse_id: row.get::<_, i64>(3)?.to_string(),
                quantity: row.get::<_, f64>(4)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}

#[tauri::command]
#[specta::specta]
pub async fn products_get_by_warehouse_with_stock(
    app: AppHandle,
    warehouse_id: String,
) -> Result<Vec<ProductWithStock>, String> {
    let conn = get_conn(&app)?;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let mut stmt = conn
        .prepare(crate::sql::stocks::products_get_by_warehouse_with_stock())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;
    let products = stmt
        .query_map(params![warehouse_id_i64], |row| {
            Ok(ProductWithStock {
                id: row.get::<_, i64>(0)?.to_string(),
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
pub async fn products_get_by_warehouse_paginated(
    app: AppHandle,
    warehouse_id: i64,
    page: i64,
    page_size: i64,
) -> Result<PaginatedResponse<ProductWithStock>, String> {
    let offset = (page - 1) * page_size;
    let conn = get_conn(&app)?;
    let (sql_products, total_count) = fetch_products_by_warehouse_with_stock(
       &conn,
        warehouse_id,
        Some(page_size),
        Some(offset),
    )
    .map_err(|e| e.to_string())?;

    let products: Vec<ProductWithStock> = sql_products
        .into_iter()
        .map(|p| ProductWithStock {
            id: p.id,
            name: p.name,
        })
        .collect();

    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResponse {
        data: products,
        total_count,
        total_pages,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn variants_get_by_product_and_warehouse(
    app: AppHandle,
    product_id: String,
    warehouse_id: String,
) -> Result<Vec<VariantWithStock>, String> {
    let conn = get_conn(&app)?;
    let product_id_i64: i64 = product_id
        .parse()
        .map_err(|e| format!("Invalid product_id: {e}"))?;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let mut stmt = conn
        .prepare(crate::sql::stocks::variants_get_by_product_and_warehouse())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;
    let variants = stmt
        .query_map(params![product_id_i64, warehouse_id_i64], |row| {
            Ok(VariantWithStock {
                variant_id: row.get::<_, i64>(0)?.to_string(),
                variant_name: row.get(1)?,
                sku: row.get(2)?,
                quantity: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query variants: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect variants: {e}"))?;
    Ok(variants)
}
