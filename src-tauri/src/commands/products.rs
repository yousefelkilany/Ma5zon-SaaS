use async_trait::async_trait;
use chrono::Local;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::types::Product;

pub struct ProductsInitializer;

#[async_trait]
impl DatabaseInitializable for ProductsInitializer {
    fn table_name(&self) -> &str {
        "products"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL
            )",
            [],
        )
        .map_err(|e| format!("Failed to create products table: {e}"))?;

        conn.execute(
            "ALTER TABLE products ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
            [],
        )
        .map_err(|e| format!("Failed to add created_at column (may already exist): {e}"))?;

        conn.execute(
            "ALTER TABLE products ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
            [],
        )
        .map_err(|e| format!("Failed to add updated_at column (may already exist): {e}"))?;

        conn.execute(
            "ALTER TABLE products ADD COLUMN deleted_at DATETIME DEFAULT NULL",
            [],
        )
        .map_err(|e| format!("Failed to add deleted_at column (may already exist): {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count products: {e}"))?;

        if count == 0 {
            log::info!("[ProductsInitializer] Seeding sample products");
            seed_products(&conn)?;
        }

        Ok(())
    }
}

fn seed_products(conn: &Connection) -> Result<(), String> {
    let products = vec![
        "محرك كهربائي صناعي",
        "وحدة تحكم إلكترونية",
        "وحدة هيدروليكية",
        "طقم bearings دقيق",
        "طقم براغي ستانلس ستيل",
        "لوحة عرض LED",
        "لوح عزل حراري",
        "حامل ألياف كربون",
        "حزمة أسلاك نحاسية",
        "ملف ألومنيوم",
        "ختم مطاطي",
        "غطاء بلاستيكي",
        "عدسة زجاجية",
        "موصل نحاسي",
        "لوحة تيتانيوم",
        "مصفوفة مكثفات سيراميك",
        "حساس encoder مغناطيسي",
        "أسطوانة هوائية",
        "صندوق تقاطع ألواح شمسية",
        "طقم تروس مركب",
        "موجّه موجات صوتي",
        "حزمة ألياف بصرية",
        "محول تردد عالي",
        "بطارية طوارئ",
        "متحكم محرك سيرفو",
        "سكة توجيه خطية",
        "صمام تخفيف ضغط",
        "ثرموستات معدن ثنائي",
        "حامل مضاد للاهتزاز",
        "وحدة هوائي تردد الراديو",
        "أنبوب ستانلس 316L",
        "هيكل بولي كربونات",
        "مبدد حراري جرافيت",
        "طقم مغناطيس نيوديميوم",
        "محمل بطانة PTFE",
        "مركب راتنج إيبوكسي",
        "طقم حلقة سيليكون",
        "أنبوب زجاجي بوريوسيليكات",
        "صفائح فولاذ ملفوحة",
    ];

    for product in products {
        let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        conn.execute(
            "INSERT INTO products (name, created_at, updated_at) VALUES (?1, ?2, ?3)",
            [product, &now, &now],
        )
        .map_err(|e| format!("Failed to insert product: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<Product>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, created_at, updated_at, deleted_at FROM products WHERE deleted_at IS NULL ORDER BY name")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let products = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                deleted_at: row.get(4)?,
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
        .prepare("SELECT id, name, created_at, updated_at, deleted_at FROM products WHERE id = ?1 AND deleted_at IS NULL")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let product = stmt
        .query_row(params![id_i64], |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })
        .ok();

    Ok(product)
}

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO products (name, created_at, updated_at) VALUES (?1, ?2, ?3)",
        params![name, &now, &now],
    )
    .map_err(|e| format!("Failed to create product: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Product {
        id,
        name,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: String, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE products SET name = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![name, &now, id_i64],
    )
    .map_err(|e| format!("Failed to update product: {e}"))?;

    Ok(Product {
        id,
        name,
        created_at: None,
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE products SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![&now, id_i64],
    )
    .map_err(|e| format!("Failed to delete product: {e}"))?;
    Ok(())
}
