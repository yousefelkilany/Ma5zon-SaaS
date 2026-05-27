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
    conn.execute(
        "INSERT INTO products (name) VALUES (?1)",
        params![name],
    )
    .map_err(|e| format!("Failed to create product: {e}"))?;

    let id = conn.last_insert_rowid();
    Ok(Product { id, name })
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