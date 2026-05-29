//! SQL statements for stock_levels and stock_movements entities.

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

pub fn upsert_level() -> &'static str {
    "INSERT OR REPLACE INTO stock_levels (variant_id, warehouse_id, quantity) \
     VALUES (?1, ?2, ?3)"
}

pub fn get_movements_all() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at \
     FROM stock_movements ORDER BY created_at DESC"
}

pub fn get_movements_by_variant() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at \
     FROM stock_movements WHERE variant_id = ?1 ORDER BY created_at DESC"
}

pub fn insert_movement() -> &'static str {
    "INSERT INTO stock_movements \
     (variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at) \
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
}