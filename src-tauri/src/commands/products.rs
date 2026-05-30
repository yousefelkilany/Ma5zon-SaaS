use async_trait::async_trait;
use chrono::Local;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::sql::products::{
    build_get_all, build_where_clause, create as sql_create, create_table,
    get_by_id as sql_get_by_id, get_created_at as sql_get_created_at,
    soft_delete as sql_soft_delete, update as sql_update,
};
use crate::types::{FilterState, SortState};
use crate::types::Product;

pub struct ProductsInitializer;

#[async_trait]
impl DatabaseInitializable for ProductsInitializer {
    fn table_name(&self) -> &str {
        "products"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute_batch(create_table())
            .map_err(|e| format!("Failed to create products table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM active_products", [], |row| row.get(0))
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
        ("شركة المصاعد العربية", "محرك كهربائي صناعي", "محركات"),
        ("شركة المصاعد العربية", "وحدة تحكم إلكترونية", "إلكترونيات"),
        ("شركة المصاعد العربية", "وحدة هيدروليكية", "هيدروليك"),
        ("مصادر الإنتاج", "طقم bearings دقيق", "قطع غيار"),
        ("مصادر الإنتاج", "طقم براغي ستانلس ستيل", "مثبتات"),
        ("مصادر الإنتاج", "لوحة عرض LED", "إلكترونيات"),
        ("عزل الحلول", "لوح عزل حراري", "عزل"),
        ("كربون تك", "حامل ألياف كربون", "مركبات"),
        ("كهرباء الخليج", "حزمة أسلاك نحاسية", "كهرباء"),
        ("كهرباء الخليج", "ملف ألومنيوم", "كهرباء"),
        ("إدارة المشتريات", "ختم مطاطي", "مطاط"),
        ("إدارة المشتريات", "غطاء بلاستيكي", "بلاستيك"),
        ("أوبتكس", "عدسة زجاجية", "بصريات"),
        ("كهرباء الخليج", "موصل نحاسي", "كهرباء"),
        ("تيتانيوم تك", "لوحة تيتانيوم", "فلزات"),
        ("إلكترونيات المستقبل", "مصفوفة مكثفات سيراميك", "إلكترونيات"),
        ("سنسور تك", "حساس encoder مغناطيسي", "حساسات"),
        ("نيوماتيك العربية", "أسطوانة هوائية", "هوائيات"),
        ("طاقة الشمس", "صندوق تقاطع ألواح شمسية", "طاقة"),
        ("تروس مصر", "طقم تروس مركب", "تروس"),
        ("صوتيات", "موجّه موجات صوتي", "صوتيات"),
        ("فايبر", "حزمة ألياف بصرية", "ألياف"),
        ("فريكون", "محول تردد عالي", "إلكترونيات"),
        ("باور سيستمز", "بطارية طوارئ", "بطاريات"),
        ("سيمنس مصر", "متحكم محرك سيرفو", "تحكم"),
        ("لينير", "سكة توجيه خطية", "حركة خطية"),
        ("فالف", "صمام تخفيف ضغط", "صمامات"),
        ("ثيرمو", "ثرموستات معدن ثنائي", "تحكم حراري"),
        ("م antivibration", "حامل مضاد للاهتزاز", "مثبطات"),
        ("راديو تك", "وحدة هوائي تردد الراديو", "اتصالات"),
        ("ستانلس تك", "أنبوب ستانلس 316L", "فلزات"),
        ("بولي تك", "هيكل بولي كربونات", "بلاستيك"),
        ("جرافيت سوليوشنز", "مبدد حراري جرافيت", "حرارية"),
        ("نيوديميوم", "طقم مغناطيس نيوديميوم", "مغناطيس"),
        ("ت PTFE", "محمل بطانة PTFE", "محامل"),
        ("راتنج مصر", "مركب راتنج إيبوكسي", "راتنجات"),
        ("سيليكون", "طقم حلقة سيليكون", "سيليكون"),
        ("بوريو", "أنبوب زجاجي بوريوسيليكات", "زجاج"),
        ("ستيل برو", "صفائح فولاذ ملفوحة", "فلزات"),
    ];

    for product in products {
        let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        conn.execute(
            "INSERT INTO products (company, name, category, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            [product.0, product.1, product.2, &now, &now],
        )
        .map_err(|e| format!("Failed to insert product: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    _columns: Vec<String>,
    sort: Option<SortState>,
) -> Result<Vec<Product>, String> {
    let conn = get_conn(&app)?;

    let where_clause = build_where_clause(&filters);
    let query = build_get_all(&where_clause, sort.as_ref());

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("get_all Failed to prepare statement: {e}"))?;

    let products = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                company: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
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
        .prepare(sql_get_by_id())
        .map_err(|e| format!("get_by_id Failed to prepare statement: {e}"))?;

    let product = stmt
        .query_row(params![id_i64], |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                company: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
            })
        })
        .ok();

    Ok(product)
}

#[tauri::command]
#[specta::specta]
pub async fn create(
    app: AppHandle,
    company: String,
    name: String,
    category: String,
) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(sql_create(), params![company, name, category, &now, &now])
        .map_err(|e| format!("Failed to create product: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Product {
        id,
        company,
        name,
        category,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn update(
    app: AppHandle,
    id: String,
    company: String,
    name: String,
    category: String,
) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let (created_at,): (String,) = conn
        .query_row(sql_get_created_at(), params![id_i64], |row| {
            Ok((row.get(0)?,))
        })
        .map_err(|e| format!("Product not found: {e}"))?;

    conn.execute(sql_update(), params![company, name, category, &now, id_i64])
        .map_err(|e| format!("Failed to update product: {e}"))?;

    Ok(Product {
        id,
        company,
        name,
        category,
        created_at: Some(created_at),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn soft_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let affected = conn
        .execute(sql_soft_delete(), params![&now, id_i64])
        .map_err(|e| format!("Failed to delete product: {e}"))?;
    if affected == 0 {
        return Err("Product not found".to_string());
    }
    Ok(())
}
