//! SQL statements for product_variants entity.

pub fn create_table() -> &'static str {
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
    )"
}

pub fn get_all() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM product_variants WHERE deleted_at IS NULL ORDER BY sku"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM product_variants WHERE id = ?1 AND deleted_at IS NULL"
}

pub fn get_by_product() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM product_variants WHERE product_id = ?1 AND deleted_at IS NULL ORDER BY sku"
}

pub fn create() -> &'static str {
    "INSERT INTO product_variants \
     (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, \
      distribution_price, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
}

pub fn update() -> &'static str {
    "UPDATE product_variants SET \
     sku = ?1, variant_name = ?2, uom_id = ?3, retail_price = ?4, \
     wholesale_price = ?5, distribution_price = ?6, updated_at = ?7 \
     WHERE id = ?8 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE product_variants SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}
