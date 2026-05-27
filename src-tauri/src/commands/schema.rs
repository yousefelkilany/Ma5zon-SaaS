use rusqlite::Connection;
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
    let _conn = get_conn(&app)?;

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