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

pub fn get_movements_all() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at \
     FROM stock_movements ORDER BY created_at DESC"
}

pub fn get_movements_by_variant() -> &'static str {
    "SELECT id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at \
     FROM stock_movements WHERE variant_id = ?1 ORDER BY created_at DESC"
}