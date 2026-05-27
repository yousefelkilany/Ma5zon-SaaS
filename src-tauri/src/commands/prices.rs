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
pub async fn prices_get_all(app: AppHandle) -> Result<Vec<VariantPrice>, String> {
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
pub async fn prices_get_by_variant(app: AppHandle, variant_id: i64) -> Result<Vec<VariantPrice>, String> {
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
pub async fn prices_create(app: AppHandle, variant_id: i64, price_list_id: i64, price: f64) -> Result<VariantPrice, String> {
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
pub async fn prices_update(app: AppHandle, variant_id: i64, price_list_id: i64, price: f64) -> Result<VariantPrice, String> {
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
pub async fn prices_delete(app: AppHandle, variant_id: i64, price_list_id: i64) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "DELETE FROM variant_prices WHERE variant_id = ?1 AND price_list_id = ?2",
        params![variant_id, price_list_id],
    )
    .map_err(|e| format!("Failed to delete price: {e}"))?;
    Ok(())
}