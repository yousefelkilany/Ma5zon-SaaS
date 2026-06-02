use async_trait::async_trait;
use chrono::Local;
use rusqlite::params;
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::seed::variants as seed_variants;
use crate::sql::variants::{
    create, create_table, get_all, get_by_id, get_by_product_with_quantity, soft_delete, update,
};
use crate::types::{NewVariant, ProductVariantWithStock, UpdateVariant, Variant};
use crate::validation::validate_variant;

pub struct VariantsInitializer;

#[async_trait]
impl DatabaseInitializable for VariantsInitializer {
    fn table_name(&self) -> &str {
        "product_variants"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute_batch(create_table())
            .map_err(|e| format!("Failed to create product_variants table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_variants", [], |row| {
                row.get(0)
            })
            .map_err(|e| format!("Failed to count variants: {e}"))?;

        if count == 0 {
            log::info!("[VariantsInitializer] Seeding sample variants");
            seed_variants::seed(&conn)?;
        }

        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn variants_get_all(app: AppHandle) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare(get_all())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map([], |row| {
            Ok(Variant {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get::<_, i64>(4)?.to_string(),
                retail_price: row.get(5)?,
                wholesale_price: row.get(6)?,
                distribution_price: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                deleted_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Failed to query variants: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect variants: {e}"))?;

    Ok(variants)
}

#[tauri::command]
#[specta::specta]
pub async fn variants_get_by_product_with_stock(
    app: AppHandle,
    product_id: String,
) -> Result<Vec<ProductVariantWithStock>, String> {
    let conn = get_conn(&app)?;
    let product_id_i64: i64 = product_id
        .parse()
        .map_err(|e| format!("Invalid product_id: {e}"))?;
    let mut stmt = conn
        .prepare(get_by_product_with_quantity())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map(params![product_id_i64], |row| {
            Ok(ProductVariantWithStock {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                quantity: row.get::<_, i32>(4)?,
                uom_id: row.get::<_, i64>(5)?.to_string(),
                retail_price: row.get(6)?,
                wholesale_price: row.get(7)?,
                distribution_price: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                deleted_at: row.get(11)?,
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
        .prepare(get_by_id())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variant = stmt
        .query_row(params![id_i64], |row| {
            Ok(Variant {
                id: row.get::<_, i64>(0)?.to_string(),
                product_id: row.get::<_, i64>(1)?.to_string(),
                sku: row.get(2)?,
                variant_name: row.get(3)?,
                uom_id: row.get::<_, i64>(4)?.to_string(),
                retail_price: row.get(5)?,
                wholesale_price: row.get(6)?,
                distribution_price: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                deleted_at: row.get(10)?,
            })
        })
        .ok();

    Ok(variant)
}

#[tauri::command]
#[specta::specta]
pub async fn variants_create(app: AppHandle, variant: NewVariant) -> Result<Variant, String> {
    validate_variant(
        &variant.sku,
        &variant.variant_name,
        Some(&variant.uom_id),
        variant.retail_price,
        variant.wholesale_price,
        variant.distribution_price,
    )?;
    let conn = get_conn(&app)?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        create(),
        params![
            variant.product_id,
            variant.sku,
            variant.variant_name,
            variant.uom_id,
            variant.retail_price,
            variant.wholesale_price,
            variant.distribution_price,
            now,
            now
        ],
    )
    .map_err(|e| format!("Failed to create variant: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Variant {
        id,
        product_id: variant.product_id,
        sku: variant.sku,
        variant_name: variant.variant_name,
        uom_id: variant.uom_id,
        retail_price: variant.retail_price,
        wholesale_price: variant.wholesale_price,
        distribution_price: variant.distribution_price,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn variants_update(
    app: AppHandle,
    id: String,
    variant: UpdateVariant,
) -> Result<Variant, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;

    let current = variants_get_by_id(app.clone(), id.clone())
        .await?
        .ok_or_else(|| "Variant not found".to_string())?;

    let new_sku = variant.sku.unwrap_or(current.sku.clone());
    let new_variant_name = variant.variant_name.unwrap_or(current.variant_name.clone());
    let new_uom_id = variant.uom_id.unwrap_or(current.uom_id.clone());
    let new_retail_price = variant.retail_price.unwrap_or(current.retail_price);
    let new_wholesale_price = variant.wholesale_price.unwrap_or(current.wholesale_price);
    let new_distribution_price = variant
        .distribution_price
        .unwrap_or(current.distribution_price);
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    validate_variant(
        &new_sku,
        &new_variant_name,
        Some(&new_uom_id),
        new_retail_price,
        new_wholesale_price,
        new_distribution_price,
    )?;

    conn.execute(
        update(),
        params![
            new_sku,
            new_variant_name,
            new_uom_id,
            new_retail_price,
            new_wholesale_price,
            new_distribution_price,
            now,
            id_i64
        ],
    )
    .map_err(|e| format!("Failed to update variant: {e}"))?;

    Ok(Variant {
        id,
        product_id: current.product_id,
        sku: new_sku,
        variant_name: new_variant_name,
        uom_id: new_uom_id,
        retail_price: new_retail_price,
        wholesale_price: new_wholesale_price,
        distribution_price: new_distribution_price,
        created_at: current.created_at,
        updated_at: Some(now),
        deleted_at: current.deleted_at,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn variants_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(soft_delete(), params![now, id_i64])
        .map_err(|e| format!("Failed to delete variant: {e}"))?;
    Ok(())
}
