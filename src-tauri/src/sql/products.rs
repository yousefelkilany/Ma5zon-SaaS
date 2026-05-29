//! SQL statements for products entity.

pub fn get_all() -> &'static str {
    "SELECT id, company, name, category, created_at, updated_at, deleted_at \
     FROM products WHERE deleted_at IS NULL ORDER BY name"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, company, name, category, created_at, updated_at, deleted_at \
     FROM products WHERE id = ?1 AND deleted_at IS NULL"
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
    "SELECT created_at FROM products WHERE id = ?1 AND deleted_at IS NULL"
}
