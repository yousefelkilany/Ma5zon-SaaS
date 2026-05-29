use async_trait::async_trait;
use chrono::Local;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::sql::warehouses::{create, create_table, get_by_id, get_created_at, soft_delete, update, build_where_clause, build_get_all};
use crate::sql::warehouses::FilterState;

pub struct WarehousesInitializer;

#[async_trait]
impl DatabaseInitializable for WarehousesInitializer {
    fn table_name(&self) -> &str {
        "warehouses"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(create_table(), [])
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
        let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        conn.execute(
            "INSERT INTO warehouses (name, location, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![name, location, now, now],
        )
        .map_err(|e| format!("Failed to insert warehouse: {e}"))?;
    }

    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Warehouse {
    pub id: String,
    pub name: String,
    pub location: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    _columns: Vec<String>,
) -> Result<Vec<Warehouse>, String> {
    let conn = get_conn(&app)?;
    
    let where_clause = build_where_clause(&filters);
    let query = build_get_all(&where_clause);
    
    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let warehouses = stmt
        .query_map([], |row| {
            Ok(Warehouse {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                location: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                deleted_at: row.get(5)?,
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
        .prepare(get_by_id())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let warehouse = stmt
        .query_row(params![id_i64], |row| {
            Ok(Warehouse {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                location: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })
        .ok();

    Ok(warehouse)
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_create(
    app: AppHandle,
    name: String,
    location: String,
) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        create(),
        params![name, location, now, now],
    )
    .map_err(|e| format!("Failed to create warehouse: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Warehouse {
        id,
        name,
        location,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_update(
    app: AppHandle,
    id: String,
    name: String,
    location: String,
) -> Result<Warehouse, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let created_at: String = conn
        .query_row(get_created_at(), params![id_i64], |row| row.get(0))
        .map_err(|e| format!("Warehouse not found: {e}"))?;

    conn.execute(
        update(),
        params![name, location, &now, id_i64],
    )
    .map_err(|e| format!("Failed to update warehouse: {e}"))?;

    Ok(Warehouse {
        id,
        name,
        location,
        created_at: Some(created_at),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn warehouses_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        soft_delete(),
        params![now, id_i64],
    )
    .map_err(|e| format!("Failed to delete warehouse: {e}"))?;
    Ok(())
}
