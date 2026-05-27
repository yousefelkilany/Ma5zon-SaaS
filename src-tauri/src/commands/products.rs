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
pub async fn get_by_id(app: AppHandle, id: String) -> Result<Option<Product>, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM products WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let product = stmt
        .query_row(params![id_i64], |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
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
    conn.execute(
        "INSERT INTO products (name) VALUES (?1)",
        params![name],
    )
    .map_err(|e| format!("Failed to create product: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Product { id, name })
}

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: String, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute(
        "UPDATE products SET name = ?1 WHERE id = ?2",
        params![name, id_i64],
    )
    .map_err(|e| format!("Failed to update product: {e}"))?;

    Ok(Product { id, name })
}

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute("DELETE FROM products WHERE id = ?1", params![id_i64])
        .map_err(|e| format!("Failed to delete product: {e}"))?;
    Ok(())
}