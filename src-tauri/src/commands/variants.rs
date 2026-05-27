use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::{Variant, NewVariant, UpdateVariant};

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
pub async fn variants_get_all(app: AppHandle) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id FROM product_variants ORDER BY sku")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map([], |row| {
            Ok(Variant {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get::<_, i64>(4)?.to_string(),
            })
        })
        .map_err(|e| format!("Failed to query variants: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect variants: {e}"))?;

    Ok(variants)
}

#[tauri::command]
#[specta::specta]
pub async fn variants_get_by_product(app: AppHandle, product_id: String) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let product_id_i64: i64 = product_id.parse().map_err(|e| format!("Invalid product_id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id FROM product_variants WHERE product_id = ?1 ORDER BY sku")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map(params![product_id_i64], |row| {
            Ok(Variant {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get::<_, i64>(4)?.to_string(),
            })
        })
        .map_err(|e| format!("Failed to query variants: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect variants: {e}"))?;

    Ok(variants)
}

#[tauri::command]
#[specta::specta]
pub async fn variants_get_by_id(app: AppHandle, id: String) -> Result<Option<Variant>, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id FROM product_variants WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variant = stmt
        .query_row(params![id_i64], |row| {
            Ok(Variant {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get::<_, i64>(4)?.to_string(),
            })
        })
        .ok();

    Ok(variant)
}

#[tauri::command]
#[specta::specta]
pub async fn variants_create(app: AppHandle, variant: NewVariant) -> Result<Variant, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "INSERT INTO product_variants (product_id, sku, variant_name, uom_id) VALUES (?1, ?2, ?3, ?4)",
        params![variant.product_id, variant.sku, variant.variant_name, variant.uom_id],
    )
    .map_err(|e| format!("Failed to create variant: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Variant {
        id,
        product_id: variant.product_id,
        sku: variant.sku,
        variant_name: variant.variant_name,
        uom_id: variant.uom_id,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn variants_update(app: AppHandle, id: String, variant: UpdateVariant) -> Result<Variant, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;

    let current = variants_get_by_id(app.clone(), id.clone())
        .await?
        .ok_or_else(|| "Variant not found".to_string())?;

    let new_sku = variant.sku.unwrap_or(current.sku);
    let new_variant_name = variant.variant_name.unwrap_or(current.variant_name);
    let new_uom_id = variant.uom_id.unwrap_or(current.uom_id);

    conn.execute(
        "UPDATE product_variants SET sku = ?1, variant_name = ?2, uom_id = ?3 WHERE id = ?4",
        params![new_sku, new_variant_name, new_uom_id, id_i64],
    )
    .map_err(|e| format!("Failed to update variant: {e}"))?;

    Ok(Variant {
        id,
        product_id: current.product_id,
        sku: new_sku,
        variant_name: new_variant_name,
        uom_id: new_uom_id,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn variants_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute("DELETE FROM product_variants WHERE id = ?1", params![id_i64])
        .map_err(|e| format!("Failed to delete variant: {e}"))?;
    Ok(())
}