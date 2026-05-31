//! Stock movement commands - maintains both stock_levels and stock_movements
//!
//! Uses transactional pattern to ensure consistency between current state
//! and audit log.

use rusqlite::{params, Connection};
use tauri::AppHandle;
use chrono::Local;

use crate::commands::db_utils::get_conn;

pub fn execute_movement(
    conn: &Connection,
    variant_id: i64,
    from_warehouse_id: Option<i64>,
    to_warehouse_id: Option<i64>,
    quantity: f64,
    movement_type: &str,
) -> Result<(), String> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Failed to begin transaction: {e}"))?;

    match movement_type {
        "PURCHASE" => {
            let to_warehouse = to_warehouse_id.ok_or("PURCHASE requires to_warehouse")?;
            upsert_stock_level(conn, variant_id, to_warehouse, quantity)?;
        }
        "SALE" => {
            let from_warehouse = from_warehouse_id.ok_or("SALE requires from_warehouse")?;
            update_stock_level(conn, variant_id, from_warehouse, -quantity)?;
        }
        "TRANSFER" => {
            let from_warehouse = from_warehouse_id.ok_or("TRANSFER requires from_warehouse")?;
            let to_warehouse = to_warehouse_id.ok_or("TRANSFER requires to_warehouse")?;
            update_stock_level(conn, variant_id, from_warehouse, -quantity)?;
            upsert_stock_level(conn, variant_id, to_warehouse, quantity)?;
        }
        "ADJUST" => {
            if let Some(to_warehouse) = to_warehouse_id {
                upsert_stock_level(conn, variant_id, to_warehouse, quantity)?;
            } else if let Some(from_warehouse) = from_warehouse_id {
                update_stock_level(conn, variant_id, from_warehouse, -quantity)?;
            } else {
                return Err("ADJUST requires either to_warehouse or from_warehouse".to_string());
            }
        }
        _ => return Err(format!("Unknown movement type: {}", movement_type)),
    }

    conn.execute(
        "INSERT INTO stock_movements (variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![variant_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, now],
    )
    .map_err(|e| format!("Failed to insert movement: {e}"))?;

    conn.execute("COMMIT", [])
        .map_err(|e| format!("Failed to commit transaction: {e}"))?;

    Ok(())
}

fn update_stock_level(conn: &Connection, variant_id: i64, warehouse_id: i64, delta: f64) -> Result<(), String> {
    let affected = conn.execute(
        "UPDATE stock_levels SET quantity = quantity + ?1 WHERE variant_id = ?2 AND warehouse_id = ?3",
        params![delta, variant_id, warehouse_id],
    )
    .map_err(|e| format!("Failed to update stock level: {e}"))?;

    if affected == 0 {
        return Err(format!("No stock level found for variant {} at warehouse {}", variant_id, warehouse_id));
    }

    Ok(())
}

fn upsert_stock_level(conn: &Connection, variant_id: i64, warehouse_id: i64, delta: f64) -> Result<(), String> {
    let affected = conn.execute(
        "UPDATE stock_levels SET quantity = quantity + ?1 WHERE variant_id = ?2 AND warehouse_id = ?3",
        params![delta, variant_id, warehouse_id],
    )
    .map_err(|e| format!("Failed to update stock level: {e}"))?;

    if affected == 0 {
        conn.execute(
            "INSERT INTO stock_levels (variant_id, warehouse_id, quantity) VALUES (?1, ?2, ?3)",
            params![variant_id, warehouse_id, delta],
        )
        .map_err(|e| format!("Failed to insert stock level: {e}"))?;
    }

    Ok(())
}

// Movement commands

#[tauri::command]
#[specta::specta]
pub async fn create_transfer(
    app: AppHandle,
    variant_id: String,
    from_warehouse: String,
    to_warehouse: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let from_wh_i64: i64 = from_warehouse.parse().map_err(|e| format!("Invalid from_warehouse: {e}"))?;
    let to_wh_i64: i64 = to_warehouse.parse().map_err(|e| format!("Invalid to_warehouse: {e}"))?;

    execute_movement(&conn, variant_id_i64, Some(from_wh_i64), Some(to_wh_i64), quantity, "TRANSFER")?;
    log::info!("[create_transfer] Transferred {} of variant {} from {} to {}", quantity, variant_id, from_warehouse, to_warehouse);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn create_purchase(
    app: AppHandle,
    variant_id: String,
    to_warehouse: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let to_wh_i64: i64 = to_warehouse.parse().map_err(|e| format!("Invalid to_warehouse: {e}"))?;

    execute_movement(&conn, variant_id_i64, None, Some(to_wh_i64), quantity, "PURCHASE")?;
    log::info!("[create_purchase] Purchased {} of variant {} to warehouse {}", quantity, variant_id, to_warehouse);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn create_sale(
    app: AppHandle,
    variant_id: String,
    from_warehouse: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let from_wh_i64: i64 = from_warehouse.parse().map_err(|e| format!("Invalid from_warehouse: {e}"))?;

    execute_movement(&conn, variant_id_i64, Some(from_wh_i64), None, quantity, "SALE")?;
    log::info!("[create_sale] Sold {} of variant {} from warehouse {}", quantity, variant_id, from_warehouse);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn create_adjustment(
    app: AppHandle,
    variant_id: String,
    warehouse_id: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let wh_i64: i64 = warehouse_id.parse().map_err(|e| format!("Invalid warehouse_id: {e}"))?;

    if quantity >= 0.0 {
        execute_movement(&conn, variant_id_i64, None, Some(wh_i64), quantity, "ADJUST")?;
    } else {
        execute_movement(&conn, variant_id_i64, Some(wh_i64), None, quantity.abs(), "ADJUST")?;
    }
    log::info!("[create_adjustment] Adjusted {} of variant {} at warehouse {}", quantity, variant_id, warehouse_id);
    Ok(())
}