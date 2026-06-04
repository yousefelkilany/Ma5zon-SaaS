//! SQL statements for stock_levels and stock_movements entities.

use rusqlite::{Connection, Result as DbErr};

use crate::types::ProductWithStock;

pub fn fetch_products_by_warehouse_with_stock(
    conn: &Connection,
    warehouse_id: i64,
    limit: Option<i64>,
    offset: Option<i64>,
) -> DbErr<(Vec<ProductWithStock>, i32)> {
    let total: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT p.id) FROM active_products p
         INNER JOIN active_product_variants v ON p.id = v.product_id
         INNER JOIN stock_levels sl ON v.id = sl.variant_id
         WHERE sl.warehouse_id = ?",
        [warehouse_id],
        |row| row.get(0),
    )?;

    let sql =
        "SELECT p.id, p.company, p.name, COALESCE(SUM(sl.quantity), 0) as quantity, p.category
             FROM active_products p
             INNER JOIN active_product_variants v ON p.id = v.product_id
             INNER JOIN stock_levels sl ON v.id = sl.variant_id
             WHERE sl.warehouse_id = ?
             GROUP BY p.id";
    let products: Vec<ProductWithStock> = match (limit, offset) {
        (Some(limit), Some(offset)) => {
            let mut stmt = conn.prepare(&format!("{sql} LIMIT ? OFFSET ?"))?;
            let mut rows = stmt.query([warehouse_id, limit, offset])?;
            let mut products = Vec::new();
            while let Some(row) = rows.next()? {
                products.push(ProductWithStock::from_row(row)?);
            }
            products
        }
        (Some(limit), None) => {
            let mut stmt = conn.prepare(&format!("{sql} LIMIT ?"))?;
            let mut rows = stmt.query([warehouse_id, limit])?;
            let mut products = Vec::new();
            while let Some(row) = rows.next()? {
                products.push(ProductWithStock::from_row(row)?);
            }
            products
        }
        _ => {
            let mut stmt = conn.prepare(sql)?;
            let mut rows = stmt.query([warehouse_id])?;
            let mut products = Vec::new();
            while let Some(row) = rows.next()? {
                products.push(ProductWithStock::from_row(row)?);
            }
            products
        }
    };

    Ok((products, total))
}

pub fn create_levels_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS stock_levels (
        variant_id INTEGER NOT NULL,
        warehouse_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        PRIMARY KEY (variant_id, warehouse_id),
        FOREIGN KEY(variant_id) REFERENCES product_variants(id),
        FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    ) SRTICT"
}

pub fn create_movements_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER NOT NULL,
        from_warehouse_id INTEGER,
        to_warehouse_id INTEGER,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        \"type\" TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(variant_id) REFERENCES product_variants(id),
        FOREIGN KEY(from_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY(to_warehouse_id) REFERENCES warehouses(id)
    ) SRTICT"
}

pub fn get_levels_all() -> &'static str {
    "SELECT variant_id, warehouse_id, quantity \
     FROM stock_levels ORDER BY variant_id, warehouse_id"
}

pub fn get_levels_by_variant() -> &'static str {
    "SELECT variant_id, warehouse_id, quantity \
     FROM stock_levels WHERE variant_id = ?1 ORDER BY warehouse_id"
}

pub fn get_levels_by_warehouse() -> &'static str {
    "SELECT variant_id, warehouse_id, quantity \
     FROM stock_levels WHERE warehouse_id = ?1 ORDER BY variant_id"
}

pub fn get_movements_all() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, \"type\", created_at \
     FROM stock_movements ORDER BY created_at DESC"
}

pub fn get_movements_by_variant() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, \"type\", created_at \
     FROM stock_movements WHERE variant_id = ?1 ORDER BY created_at DESC"
}

pub fn get_stock_levels_by_product() -> &'static str {
    "SELECT
        v.id AS variant_id,
        v.variant_name,
        v.sku,
        COALESCE(s.warehouse_id, 0) AS warehouse_id,
        CAST(COALESCE(s.quantity, 0) AS INTEGER) AS quantity
     FROM active_product_variants v
     LEFT JOIN stock_levels s ON v.id = s.variant_id
     WHERE v.product_id = ?1
     ORDER BY v.variant_name"
}

pub fn get_levels_by_warehouse_with_names() -> &'static str {
    "SELECT
        v.id AS variant_id,
        v.variant_name,
        v.sku,
        COALESCE(s.warehouse_id, 0) AS warehouse_id,
        CAST(COALESCE(s.quantity, 0) AS INTEGER) AS quantity
     FROM active_product_variants v
     JOIN products p ON v.product_id = p.id
     LEFT JOIN stock_levels s ON v.id = s.variant_id AND s.warehouse_id = ?1
     ORDER BY v.variant_name"
}

pub fn products_get_by_warehouse_with_stock() -> &'static str {
    "SELECT DISTINCT p.id, p.name \
     FROM products p \
     JOIN active_product_variants v ON p.id = v.product_id \
     JOIN stock_levels s ON v.id = s.variant_id \
     WHERE s.warehouse_id = ?1 AND s.quantity > 0 \
     ORDER BY p.name"
}

#[allow(dead_code)]
pub fn variants_get_by_product_and_warehouse() -> &'static str {
    "SELECT \
        v.id AS variant_id, \
        v.variant_name, \
        v.sku, \
        CAST(COALESCE(s.quantity, 0) AS INTEGER) AS quantity \
     FROM active_product_variants v \
     LEFT JOIN stock_levels s ON v.id = s.variant_id AND s.warehouse_id = ?2 \
     WHERE v.product_id = ?1 \
     ORDER BY v.variant_name"
}

pub fn create_triggers() -> &'static str {
    r#"
-- Trigger to prevent negative stock on UPDATE
CREATE TRIGGER IF NOT EXISTS prevent_negative_stock_update
BEFORE UPDATE ON stock_levels
FOR EACH ROW
WHEN NEW.quantity < 0
BEGIN
    SELECT RAISE(ABORT, 'Stock cannot be negative');
END;

-- Trigger to prevent negative stock on INSERT
CREATE TRIGGER IF NOT EXISTS prevent_negative_stock_insert
BEFORE INSERT ON stock_levels
FOR EACH ROW
WHEN NEW.quantity < 0
BEGIN
    SELECT RAISE(ABORT, 'Stock cannot be negative');
END;
"#
}
