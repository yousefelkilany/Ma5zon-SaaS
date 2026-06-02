use async_trait::async_trait;
use chrono::Local;
use rusqlite::params;
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::seed::products as seed_products;
use crate::sql::products::{
    build_count, build_get_all, build_where_clause, build_with_stock_paginated,
    create as sql_create, create_table, get_by_id as sql_get_by_id,
    get_created_at as sql_get_created_at, soft_delete as sql_soft_delete, update as sql_update,
};
use crate::types::{FilterState, PaginatedResponse, SortState};
use crate::types::{Product, ProductWithStock};
use crate::validation::{validate_product, validate_warehouse};

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
            seed_products::seed(&conn)?;
        }

        Ok(())
    }
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
pub async fn get_products_with_stock_paginated(
    app: AppHandle,
    filters: Vec<FilterState>,
    _columns: Vec<String>,
    sort: Option<SortState>,
    page: i32,
    page_size: i32,
) -> Result<PaginatedResponse<ProductWithStock>, String> {
    let offset = (page - 1) * page_size;
    let conn = get_conn(&app)?;

    let where_clause = build_where_clause(&filters);
    let count_sql = build_count(&where_clause, sort.as_ref());
    let total_count: i32 = conn
        .query_row(&count_sql, [], |row| row.get(0))
        .map_err(|e| format!("Failed to count products: {e}"))?;

    let query = build_with_stock_paginated(&where_clause, sort.as_ref(), page_size, offset);
    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("products_get_paginated Failed to prepare: {e}"))?;

    let products = stmt
        .query_map([], |row| {
            Ok(ProductWithStock {
                id: row.get::<_, i64>(0)?.to_string(),
                company: row.get(1)?,
                name: row.get(2)?,
                quantity: row.get(3)?,
                category: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query products: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect products: {e}"))?;

    Ok(PaginatedResponse {
        data: products,
        total_count,
        total_pages: (total_count + page_size - 1) / page_size,
    })
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
    validate_product(&company, &name, &category)?;
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
    validate_product(&company, &name, &category)?;
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
