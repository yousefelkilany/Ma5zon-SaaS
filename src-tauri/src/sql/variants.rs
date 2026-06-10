//! SQL statements for product_variants entity.

pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        variant_name TEXT NOT NULL,
        uom_id INTEGER NOT NULL,
        retail_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        wholesale_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        distribution_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        FOREIGN KEY(product_id) REFERENCES products(id)
    ) SRTICT;

    CREATE INDEX idx_variant_product_id ON product_variants(product_id);

    CREATE VIEW IF NOT EXISTS active_product_variants AS
    SELECT * FROM product_variants WHERE deleted_at IS NULL;"
}

pub fn get_all() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM active_product_variants ORDER BY sku"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM active_product_variants WHERE id = ?1"
}

pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
         wholesale_price, distribution_price, created_at, updated_at, deleted_at \
         FROM active_product_variants WHERE id IN ({placeholders})"
    )
}

pub fn get_by_product() -> &'static str {
    "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
     wholesale_price, distribution_price, created_at, updated_at, deleted_at \
     FROM active_product_variants WHERE product_id = ?1 ORDER BY sku"
}

pub fn get_by_product_with_quantity() -> &'static str {
    "SELECT id, product_id, sku, variant_name, COALESCE(SUM(s.quantity), 0), uom_id, retail_price, \
    wholesale_price, distribution_price, created_at, updated_at, deleted_at \
    FROM active_product_variants \
    LEFT JOIN stock_levels s ON s.variant_id = id \
    WHERE product_id = ?1 \
    GROUP BY sku \
    ORDER BY sku"
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
             wholesale_price, distribution_price, created_at, updated_at, deleted_at \
             FROM active_product_variants WHERE id IN ()"
        );

        let sql = get_by_ids(2);
        assert_eq!(
            sql,
            "SELECT id, product_id, sku, variant_name, uom_id, retail_price, \
             wholesale_price, distribution_price, created_at, updated_at, deleted_at \
             FROM active_product_variants WHERE id IN (?,?)"
        );
    }
}
