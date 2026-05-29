//! SQL statements for warehouses entity.

pub fn get_all() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM warehouses WHERE deleted_at IS NULL ORDER BY name"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM warehouses WHERE id = ?1 AND deleted_at IS NULL"
}

pub fn create() -> &'static str {
    "INSERT INTO warehouses (name, location, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4)"
}

pub fn update() -> &'static str {
    "UPDATE warehouses SET name = ?1, location = ?2, updated_at = ?3 \
     WHERE id = ?4 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE warehouses SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}

pub fn get_created_at() -> &'static str {
    "SELECT created_at FROM warehouses WHERE id = ?1 AND deleted_at IS NULL"
}