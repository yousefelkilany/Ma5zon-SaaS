use async_trait::async_trait;
use chrono::Local;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::types::{NewVariant, UpdateVariant, Variant};

pub struct VariantsInitializer;

#[async_trait]
impl DatabaseInitializable for VariantsInitializer {
    fn table_name(&self) -> &str {
        "product_variants"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS product_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                sku TEXT UNIQUE NOT NULL,
                variant_name TEXT NOT NULL,
                uom_id INTEGER NOT NULL,
                retail_price REAL NOT NULL DEFAULT 0,
                wholesale_price REAL NOT NULL DEFAULT 0,
                distribution_price REAL NOT NULL DEFAULT 0,
                created_at TEXT,
                updated_at TEXT,
                deleted_at TEXT,
                FOREIGN KEY(product_id) REFERENCES products(id)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create product_variants table: {e}"))?;

        let alter_result = conn.execute(
            "ALTER TABLE product_variants ADD COLUMN created_at TEXT",
            [],
        );
        if alter_result.is_err() {
            log::trace!("product_variants created_at column may already exist");
        }
        let alter_result = conn.execute(
            "ALTER TABLE product_variants ADD COLUMN updated_at TEXT",
            [],
        );
        if alter_result.is_err() {
            log::trace!("product_variants updated_at column may already exist");
        }
        let alter_result = conn.execute(
            "ALTER TABLE product_variants ADD COLUMN deleted_at TEXT",
            [],
        );
        if alter_result.is_err() {
            log::trace!("product_variants deleted_at column may already exist");
        }

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_variants", [], |row| {
                row.get(0)
            })
            .map_err(|e| format!("Failed to count variants: {e}"))?;

        if count == 0 {
            log::info!("[VariantsInitializer] Seeding sample variants");
            seed_variants(&conn)?;
        }

        Ok(())
    }
}

fn seed_variants(conn: &Connection) -> Result<(), String> {
    use rand::Rng;

    let mut rng = rand::thread_rng();

    let mut stmt = conn
        .prepare("SELECT id FROM products ORDER BY id")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let product_ids: Vec<i64> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to query products: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect product IDs: {e}"))?;

    let variants_data = vec![
        (
            vec!["درجة أولى", "درجة صناعية", "درجة اقتصادية", "درجة ممتازة"],
            "درجة",
        ),
        (vec!["10 وات", "25 وات", "50 وات", "100 وات"], "قدرة"),
        (vec!["120 فولت", "240 فولت", "480 فولت", "جهد مزدوج"], "جهد"),
        (vec!["ذكر", "أنثى", "بارب", "ضغط"], "موصل"),
        (vec!["1 م", "2 م", "5 م", "10 م"], "طول"),
        (
            vec![
                "ستانلس ستيل 304",
                "ستانلس ستيل 316",
                "ستانلس ستيل 430",
                "مجلفن",
            ],
            "مادة",
        ),
        (vec!["شفاف", "ملون", "مرآوي", "مضاد للتوهج"], "تشطيب"),
        (vec!["M3", "M4", "M5", "M6", "M8"], "مقاس"),
        (vec!["صغير", "وسط", "كبير", "كبير جداً"], "حجم"),
        (vec!["2 أمبير", "5 أمبير", "10 أمبير", "20 أمبير"], "أمبير"),
    ];

    let uom_names = ["pcs", "m", "kg", "L", "box", "roll", "set"];

    for (i, product_id) in product_ids.iter().enumerate() {
        let num_variants = rng.gen_range(2..5);
        let variant_type = &variants_data[i % variants_data.len()];
        let options = &variant_type.0;

        for v in 0..num_variants {
            let variant_name = format!(
                "{} {} {}",
                "منتج",
                variant_type.1,
                options[v % options.len()]
            );
            let sku = format!("SKU-{:04}-{:02}", product_id, v + 1);
            let uom_id = (rng.gen_range(0..uom_names.len()) + 1) as i64;

            let retail_price: f64 = ((rng.gen_range(5.0_f64..500.0_f64) * 100.0).round()) / 100.0;
            let wholesale_price: f64 = (retail_price * 0.75 * 100.0).round() / 100.0;
            let distribution_price: f64 = (retail_price * 0.6 * 100.0).round() / 100.0;

            conn.execute(
                "INSERT INTO product_variants (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price],
            )
            .map_err(|e| format!("Failed to insert variant: {e}"))?;
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn variants_get_all(app: AppHandle) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price, created_at, updated_at, deleted_at FROM product_variants WHERE deleted_at IS NULL ORDER BY sku")
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
pub async fn variants_get_by_product(
    app: AppHandle,
    product_id: String,
) -> Result<Vec<Variant>, String> {
    let conn = get_conn(&app)?;
    let product_id_i64: i64 = product_id
        .parse()
        .map_err(|e| format!("Invalid product_id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price, created_at, updated_at, deleted_at FROM product_variants WHERE product_id = ?1 AND deleted_at IS NULL ORDER BY sku")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let variants = stmt
        .query_map(params![product_id_i64], |row| {
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
pub async fn variants_get_by_id(app: AppHandle, id: String) -> Result<Option<Variant>, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price, created_at, updated_at, deleted_at FROM product_variants WHERE id = ?1 AND deleted_at IS NULL")
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
    let conn = get_conn(&app)?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO product_variants (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![variant.product_id, variant.sku, variant.variant_name, variant.uom_id, variant.retail_price, variant.wholesale_price, variant.distribution_price, now, now],
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

    conn.execute(
        "UPDATE product_variants SET sku = ?1, variant_name = ?2, uom_id = ?3, retail_price = ?4, wholesale_price = ?5, distribution_price = ?6, updated_at = ?7 WHERE id = ?8 AND deleted_at IS NULL",
        params![new_sku, new_variant_name, new_uom_id, new_retail_price, new_wholesale_price, new_distribution_price, now, id_i64],
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
    conn.execute(
        "UPDATE product_variants SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id_i64],
    )
    .map_err(|e| format!("Failed to delete variant: {e}"))?;
    Ok(())
}
