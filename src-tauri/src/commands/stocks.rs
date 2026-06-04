use async_trait::async_trait;
use rusqlite::params;
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::seed::movements as seed_movements;
use crate::sql::stocks::{
    create_levels_table, create_movements_table, create_triggers,
    fetch_products_by_warehouse_with_stock, get_levels_all, get_levels_by_variant,
    get_levels_by_warehouse, get_levels_by_warehouse_with_names, get_movements_all,
    get_movements_by_variant, get_movements_by_warehouse, get_stock_levels_by_product,
};
use crate::types::{PaginatedResponse, ProductWithStock};

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
        conn.execute_batch(create_triggers())
            .map_err(|e| format!("Failed to create stock triggers: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM stock_movements", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count stock_movements: {e}"))?;

        if count == 0 {
            log::info!("[StockInitializer] Seeding stock movements");
            seed_movements::seed(&conn)?;
        }

        Ok(())
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockLevel {
    pub variant_id: String,
    pub warehouse_id: String,
    pub quantity: i32,
}
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockMovement {
    pub id: String,
    pub variant_id: String,
    pub product_id: String,
    pub from_warehouse_id: Option<String>,
    pub to_warehouse_id: Option<String>,
    pub quantity: i32,
    pub movement_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct StockLevelWithVariant {
    pub variant_id: String,
    pub variant_name: String,
    pub sku: String,
    pub warehouse_id: String,
    pub quantity: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[allow(dead_code)]
pub struct VariantWithStock {
    pub variant_id: String,
    pub variant_name: String,
    pub sku: String,
    pub quantity: i32,
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
                quantity: row.get::<_, i32>(2)?,
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
                quantity: row.get::<_, i32>(2)?,
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
                quantity: row.get::<_, i32>(2)?,
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
                product_id: row.get::<_, i64>(2)?.to_string(),
                from_warehouse_id: row.get::<_, Option<i64>>(3)?.map(|v| v.to_string()),
                to_warehouse_id: row.get::<_, Option<i64>>(4)?.map(|v| v.to_string()),
                quantity: row.get(5)?,
                movement_type: row.get(6)?,
                created_at: row.get(7)?,
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
                product_id: row.get::<_, i64>(2)?.to_string(),
                from_warehouse_id: row.get::<_, Option<i64>>(3)?.map(|v| v.to_string()),
                to_warehouse_id: row.get::<_, Option<i64>>(4)?.map(|v| v.to_string()),
                quantity: row.get(5)?,
                movement_type: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query stock movements: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock movements: {e}"))?;

    Ok(movements)
}

#[tauri::command]
#[specta::specta]
pub async fn stock_movements_get_by_warehouse(
    app: AppHandle,
    warehouse_id: String,
) -> Result<Vec<StockMovement>, String> {
    let conn = get_conn(&app)?;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let mut stmt = conn
        .prepare(get_movements_by_warehouse())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let movements = stmt
        .query_map(params![warehouse_id_i64], |row| {
            Ok(StockMovement {
                id: row.get::<_, i64>(0)?.to_string(),
                variant_id: row.get::<_, i64>(1)?.to_string(),
                product_id: row.get::<_, i64>(2)?.to_string(),
                from_warehouse_id: row.get::<_, Option<i64>>(3)?.map(|v| v.to_string()),
                to_warehouse_id: row.get::<_, Option<i64>>(4)?.map(|v| v.to_string()),
                quantity: row.get(5)?,
                movement_type: row.get(6)?,
                created_at: row.get(7)?,
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
                quantity: row.get::<_, i32>(4)?,
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
                quantity: row.get::<_, i32>(4)?,
            })
        })
        .map_err(|e| format!("Failed to query stock levels: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect stock levels: {e}"))?;

    Ok(levels)
}

#[tauri::command]
#[specta::specta]
pub async fn products_get_by_warehouse_with_stock_paginated(
    app: AppHandle,
    warehouse_id: String,
    page: i32,
    page_size: i32,
) -> Result<PaginatedResponse<ProductWithStock>, String> {
    let conn = get_conn(&app)?;
    let offset: i32 = (page - 1) * page_size;
    let warehouse_id_i64: i64 = warehouse_id
        .parse()
        .map_err(|e| format!("Invalid warehouse_id: {e}"))?;
    let (data, total_count) = fetch_products_by_warehouse_with_stock(
        &conn,
        warehouse_id_i64,
        Some(page_size as i64),
        Some(offset as i64),
    )
    .map_err(|e| format!("Failed to query products: {e}"))?;
    // let data = products
    //     .into_iter()
    //     .map(|p| ProductWithStock {
    //         id: p.id,
    //         company: p.company,
    //         name: p.name,
    //         quantity: p.quantity,
    //     })
    //     .collect();
    Ok(PaginatedResponse {
        data,
        total_count,
        total_pages: ((total_count + page_size - 1) / page_size) as i32,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn products_get_by_warehouse_paginated(
    app: AppHandle,
    warehouse_id: String,
    page: i32,
    page_size: i32,
) -> Result<PaginatedResponse<ProductWithStock>, String> {
    let offset = (page - 1) * page_size;
    let conn = get_conn(&app)?;
    let (data, total_count) = fetch_products_by_warehouse_with_stock(
        &conn,
        warehouse_id
            .parse()
            .map_err(|e| format!("Invalid id: {e}"))?,
        Some(page_size as i64),
        Some(offset as i64),
    )
    .map_err(|e| e.to_string())?;

    // let products: Vec<ProductWithStock> = sql_products
    //     .into_iter()
    //     .map(|p| ProductWithStock {
    //         id: p.id,
    //         company: p.company,
    //         name: p.name,
    //         quantity: p.quantity,
    //     })
    //     .collect();

    Ok(PaginatedResponse {
        data,
        total_count,
        total_pages: ((total_count + page_size - 1) / page_size) as i32,
    })
}

#[tauri::command]
#[specta::specta]
#[allow(dead_code)]
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
