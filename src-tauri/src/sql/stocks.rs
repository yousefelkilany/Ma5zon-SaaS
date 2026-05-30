//! SQL statements for stock_levels and stock_movements entities.

pub fn create_levels_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS stock_levels (
        variant_id INTEGER NOT NULL,
        warehouse_id INTEGER NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (variant_id, warehouse_id),
        FOREIGN KEY(variant_id) REFERENCES product_variants(id),
        FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    )"
}

pub fn create_movements_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER NOT NULL,
        from_warehouse_id INTEGER,
        to_warehouse_id INTEGER,
        quantity REAL NOT NULL,
        \"type\" TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(variant_id) REFERENCES product_variants(id),
        FOREIGN KEY(from_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY(to_warehouse_id) REFERENCES warehouses(id)
    )"
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
        COALESCE(s.quantity, 0) AS current_qty
     FROM product_variants v
     LEFT JOIN stock_levels s ON v.id = s.variant_id
     WHERE v.product_id = ?1
     ORDER BY v.variant_name"
}

pub fn get_levels_by_warehouse_with_names() -> &'static str {
    // update this statement and corresponding UI table to be expanding rows
    "SELECT
        v.id AS variant_id,
        p.company,
        p.category,
        p.name,
        v.variant_name,
        v.sku,
        COALESCE(s.warehouse_id, 0) AS warehouse_id,
        COALESCE(s.quantity, 0) AS current_qty
     FROM product_variants v
     JOIN products p ON v.product_id = p.id
     LEFT JOIN stock_levels s ON v.id = s.variant_id AND s.warehouse_id = ?1
     ORDER BY v.variant_name"
}

pub fn products_get_by_warehouse_with_stock() -> &'static str {
    "SELECT DISTINCT p.id, p.name \
     FROM products p \
     JOIN product_variants v ON p.id = v.product_id \
     JOIN stock_levels s ON v.id = s.variant_id \
     WHERE s.warehouse_id = ?1 AND s.quantity > 0 \
     ORDER BY p.name"
}

pub fn variants_get_by_product_and_warehouse() -> &'static str {
    "SELECT \
        v.id AS variant_id, \
        v.variant_name, \
        v.sku, \
        COALESCE(s.quantity, 0) AS quantity \
     FROM product_variants v \
     LEFT JOIN stock_levels s ON v.id = s.variant_id AND s.warehouse_id = ?2 \
     WHERE v.product_id = ?1 \
     ORDER BY v.variant_name"
}