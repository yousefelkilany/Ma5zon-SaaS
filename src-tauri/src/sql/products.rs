//! SQL statements for products entity.

use crate::{
    sql::{build_filtered_grouped_sorted_paginated_query, build_filtered_sorted_query},
    types::Product,
};
use rusqlite::{Connection, Result as DbErr};

#[allow(dead_code)]
pub fn fetch_all(
    conn: &Connection,
    limit: Option<i32>,
    offset: Option<i32>,
) -> DbErr<(Vec<Product>, i32)> {
    let total: i32 = conn.query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))?;

    let products: Vec<Product> = match (limit, offset) {
        (Some(limit), Some(offset)) => {
            let mut stmt = conn.prepare(
                "SELECT id, company, name, category, created_at, updated_at, deleted_at FROM products LIMIT ? OFFSET ?"
            )?;
            let mut rows = stmt.query([limit, offset])?;
            let mut products = Vec::new();
            while let Some(row) = rows.next()? {
                products.push(Product {
                    id: row.get::<_, i64>(0)?.to_string(),
                    company: row.get(1)?,
                    name: row.get(2)?,
                    category: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                });
            }
            products
        }
        (Some(limit), None) => {
            let mut stmt = conn.prepare(
                "SELECT id, company, name, category, created_at, updated_at, deleted_at FROM products LIMIT ?"
            )?;
            let mut rows = stmt.query([limit])?;
            let mut products = Vec::new();
            while let Some(row) = rows.next()? {
                products.push(Product {
                    id: row.get::<_, i64>(0)?.to_string(),
                    company: row.get(1)?,
                    name: row.get(2)?,
                    category: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                });
            }
            products
        }
        _ => {
            let mut stmt = conn.prepare(
                "SELECT id, company, name, category, created_at, updated_at, deleted_at FROM products"
            )?;
            let mut rows = stmt.query([])?;
            let mut products = Vec::new();
            while let Some(row) = rows.next()? {
                products.push(Product {
                    id: row.get::<_, i64>(0)?.to_string(),
                    company: row.get(1)?,
                    name: row.get(2)?,
                    category: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    deleted_at: row.get(6)?,
                });
            }
            products
        }
    };

    Ok((products, total))
}

pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
    ) STRICT;

    CREATE VIEW IF NOT EXISTS active_products AS
    SELECT * FROM products WHERE deleted_at IS NULL;"
}

#[allow(dead_code)]
pub fn get_all() -> &'static str {
    "SELECT id, company, name, category, created_at, updated_at, deleted_at \
     FROM active_products ORDER BY name"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, company, name, category, created_at, updated_at, deleted_at \
     FROM active_products WHERE id = ?1"
}

pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, company, name, category, created_at, updated_at, deleted_at \
         FROM active_products WHERE id IN ({placeholders})"
    )
}

pub fn create() -> &'static str {
    "INSERT INTO products (company, name, category, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4, ?5)"
}

pub fn update() -> &'static str {
    "UPDATE products SET company = ?1, name = ?2, category = ?3, updated_at = ?4 \
     WHERE id = ?5 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE products SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}

pub fn get_created_at() -> &'static str {
    "SELECT created_at FROM active_products WHERE id = ?1"
}

use crate::types::{FilterState, SortState};

pub fn build_where_clause(filters: &[FilterState]) -> String {
    if filters.is_empty() {
        return String::new();
    }

    let clauses: Vec<String> = filters
        .iter()
        .map(|f| {
            let column = &f.column_id;
            match f.operator.as_str() {
                "eq" => {
                    if let Some(arr) = f.value.as_array() {
                        let vals: Vec<String> = arr
                            .iter()
                            .filter_map(|v| v.as_str().map(|s| format!("'{}'", s)))
                            .collect();
                        format!("{} IN ({})", column, vals.join(", "))
                    } else {
                        let val = f.value.as_str().unwrap_or("");
                        format!("{} = '{}'", column, val)
                    }
                }
                "neq" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} != '{}'", column, val)
                }
                "contains" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} LIKE '%{}%'", column, val)
                }
                "gt" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} > '{}'", column, val)
                }
                "gte" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} >= '{}'", column, val)
                }
                "lt" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} < '{}'", column, val)
                }
                "lte" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} <= '{}'", column, val)
                }
                "between" => {
                    if let Some(arr) = f.value.as_array() {
                        let min = arr.first().and_then(|v| v.as_str()).unwrap_or("");
                        let max = arr.get(1).and_then(|v| v.as_str()).unwrap_or("");
                        format!("{} BETWEEN '{}' AND '{}'", column, min, max)
                    } else {
                        String::new()
                    }
                }
                op => {
                    log::warn!("[build_where_clause] unknown operator: {}", op);
                    String::new()
                }
            }
        })
        .collect();

    if clauses.is_empty() {
        String::new()
    } else {
        format!("({})", clauses.join(" AND "))
    }
}

pub fn build_with_stock_paginated(
    where_clause: &str,
    sort: Option<&SortState>,
    limit: i32,
    offset: i32,
) -> String {
    let base =
        "SELECT p.id, p.company, p.name, COALESCE(SUM(sl.quantity), 0) as quantity, p.category
        FROM active_products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN stock_levels sl ON pv.id = sl.variant_id";
    let group_by = "p.id";

    build_filtered_grouped_sorted_paginated_query(
        &base,
        where_clause,
        &group_by,
        sort,
        limit,
        offset,
    )
}

pub fn build_count(where_clause: &str, _sort: Option<&SortState>) -> String {
    let base = "SELECT COUNT(DISTINCT p.id) FROM active_products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN stock_levels sl ON pv.id = sl.variant_id";

    if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{} WHERE {}", base, where_clause)
    }
}

pub fn build_by_warehouse_count(where_clause: &str, sort: Option<&SortState>) -> String {
    let base = "SELECT COUNT(*), COALESCE(SUM(sl.quantity), 0) as quantity
        FROM active_products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN stock_levels sl ON pv.id = sl.variant_id
        WHERE sl.warehouse_id = ?
        AND quantity > 0";

    build_filtered_sorted_query(base, where_clause, "", sort)
}

pub fn build_with_stock_by_warehouse_paginated(
    where_clause: &str,
    sort: Option<&SortState>,
    limit: i32,
    offset: i32,
) -> String {
    let base =
        "SELECT p.id, p.company, p.name, COALESCE(SUM(sl.quantity), 0) as quantity, p.category
        FROM active_products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN stock_levels sl ON pv.id = sl.variant_id
        WHERE sl.warehouse_id = ?";

    build_filtered_grouped_sorted_paginated_query(base, where_clause, "", sort, limit, offset)
}

pub fn build_get_all(where_clause: &str, sort: Option<&SortState>) -> String {
    let base = "SELECT id, company, name, category, created_at, updated_at, deleted_at FROM active_products";
    let query = if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{base} WHERE {where_clause}")
    };

    match sort {
        Some(s) => format!("{query} ORDER BY {} {}", s.column_id, s.direction),
        None => format!("{query} ORDER BY name"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, company, name, category, created_at, updated_at, deleted_at \
             FROM active_products WHERE id IN ()"
        );

        let sql = get_by_ids(3);
        assert_eq!(
            sql,
            "SELECT id, company, name, category, created_at, updated_at, deleted_at \
             FROM active_products WHERE id IN (?,?,?)"
        );
    }
}
