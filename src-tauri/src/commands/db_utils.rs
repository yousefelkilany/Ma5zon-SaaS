use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use unicode_normalization::UnicodeNormalization;

/// Mirror of `normalizeArabic` in `src/lib/utils.ts`. Used by the FTS5 + trigram
/// search subsystem so that indexed text matches user input byte-for-byte
/// after normalization. Must stay in lock-step with the JS function.
pub fn normalize_arabic(input: Option<&str>) -> String {
    let Some(s) = input else {
        return String::new();
    };
    if s.is_empty() {
        return String::new();
    }
    s.nfkd()
        // 1. Remove diacritics (Harakat)
        .filter(|&c| !('\u{064B}'..='\u{065F}').contains(&c))
        // 2. Map and lower-case
        .map(|c| {
            match c {
                // Alifs
                '\u{0622}' | '\u{0623}' | '\u{0625}' | '\u{0671}' => '\u{0627}',
                // Taa Marbuta
                '\u{0629}' => '\u{0647}',
                // Alif Maqsura
                '\u{0649}' => '\u{064A}',
                // Standard case folding for English + Arabic letters
                _ => c.to_ascii_lowercase(),
            }
        })
        .collect()
}

/// Register the `normalize_arabic` UDF on a connection. Must be called once
/// per connection (currently in the `SearchInitializer`) so that the FTS5
/// triggers can pipe source columns through the function.
pub fn register_udfs(conn: &Connection) -> Result<(), String> {
    conn.create_scalar_function(
        "normalize_arabic",
        1,
        rusqlite::functions::FunctionFlags::SQLITE_DETERMINISTIC
            | rusqlite::functions::FunctionFlags::SQLITE_INNOCUOUS,
        |ctx| {
            let arg = ctx.get_raw(0).as_str().ok();
            Ok(normalize_arabic(arg))
        },
    )
    .map_err(|e| format!("Failed to register normalize_arabic UDF: {e}"))?;
    Ok(())
}

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
    log::info!("[get_table_info] Called with table_name: {}", table_name);
    let conn = get_conn(&app)?;
    log::info!("[get_table_info] Connection established");

    let query = format!("PRAGMA table_info({})", table_name);
    log::info!("[get_table_info] Executing query: {}", query);

    let mut stmt = conn
        .prepare(&query)
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

    log::info!("[get_table_info] Found {} columns", columns.len());

    if columns.is_empty() {
        log::warn!(
            "[get_table_info] Table '{}' not found or has no columns",
            table_name
        );
        return Err(format!("Table '{}' not found", table_name));
    }

    log::info!(
        "[get_table_info] Returning TableInfo with {} columns for table '{}'",
        columns.len(),
        table_name
    );

    Ok(TableInfo {
        table_name: table_name.to_string(),
        columns,
    })
}
