use async_trait::async_trait;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::{self, DatabaseInitializable};

pub struct WarehousesInitializer;

#[async_trait]
impl commands::DatabaseInitializable for WarehousesInitializer {
    fn table_name(&self) -> &str {
        "warehouses"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS warehouses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT
            )",
            [],
        )
        .map_err(|e| format!("Failed to create warehouses table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM warehouses", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count warehouses: {e}"))?;

        if count == 0 {
            log::info!("[WarehousesInitializer] Seeding sample warehouses");
            seed_warehouses(&conn)?;
        }

        Ok(())
    }
}

fn seed_warehouses(conn: &Connection) -> Result<(), String> {
    let warehouses = vec![
        ("مركز التوزيع المركزي", "القاهرة"),
        ("منشأة الساحل الشمالي", "الإسكندرية"),
        ("المخزن الإقليمي الشمالي", "المنصورة"),
        ("المستودع الجنوبي", "أسيوط"),
        ("مركز الصعيد", "سوهاج"),
    ];

    for (name, location) in warehouses {
        conn.execute(
            "INSERT INTO warehouses (name, location) VALUES (?1, ?2)",
            params![name, location],
        )
        .map_err(|e| format!("Failed to insert warehouse: {e}"))?;
    }

    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Warehouse {
    pub id: String,
    pub name: String,
    pub location: String,
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_get_all(app: AppHandle) -> Result<Vec<Warehouse>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, location FROM warehouses ORDER BY name")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let warehouses = stmt
        .query_map([], |row| {
            Ok(Warehouse {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                location: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query warehouses: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect warehouses: {e}"))?;

    Ok(warehouses)
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_get_by_id(app: AppHandle, id: String) -> Result<Option<Warehouse>, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, name, location FROM warehouses WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let warehouse = stmt
        .query_row(params![id_i64], |row| {
            Ok(Warehouse {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                location: row.get(2)?,
            })
        })
        .ok();

    Ok(warehouse)
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_create(app: AppHandle, name: String, location: String) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "INSERT INTO warehouses (name, location) VALUES (?1, ?2)",
        params![name, location],
    )
    .map_err(|e| format!("Failed to create warehouse: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Warehouse { id, name, location })
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_update(app: AppHandle, id: String, name: String, location: String) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute(
        "UPDATE warehouses SET name = ?1, location = ?2 WHERE id = ?3",
        params![name, location, id_i64],
    )
    .map_err(|e| format!("Failed to update warehouse: {e}"))?;

    Ok(Warehouse { id, name, location })
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute("DELETE FROM warehouses WHERE id = ?1", params![id_i64])
        .map_err(|e| format!("Failed to delete warehouse: {e}"))?;
    Ok(())
}