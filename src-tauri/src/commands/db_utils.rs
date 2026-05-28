use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use specta::Type;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ColumnInfo {
    pub cid: i32,
    pub name: String,
    pub col_type: String,
    pub notnull: bool,
    pub dflt_value: Option<String>,
    pub pk: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TableInfo {
    pub table_name: String,
    pub columns: Vec<ColumnInfo>,
}

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(app_data_dir.join("ma5zon.db"))
}

pub fn get_conn(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))
}

#[tauri::command]
#[specta::specta]
pub async fn get_table_info(app: AppHandle, table_name: &str) -> Result<TableInfo, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({})", table_name))
        .map_err(|e| format!("Failed to prepare pragma statement: {e}"))?;

    let columns: Vec<ColumnInfo> = stmt
        .query_map([], |row| {
            Ok(ColumnInfo {
                cid: row.get(0)?,
                name: row.get(1)?,
                col_type: row.get(2)?,
                notnull: row.get::<_, i64>(3)? != 0,
                dflt_value: row.get(4)?,
                pk: row.get::<_, i64>(5)? != 0,
            })
        })
        .map_err(|e| format!("Failed to query table info: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect column info: {e}"))?;

    if columns.is_empty() {
        return Err(format!("Table '{}' not found", table_name));
    }

    Ok(TableInfo {
        table_name: table_name.to_string(),
        columns,
    })
}