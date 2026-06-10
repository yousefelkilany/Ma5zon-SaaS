//! SQL statements for the global search subsystem.
//!
//! One FTS5 virtual table per indexed entity, kept in sync by per-entity
//! `ai` / `au` / `aud` triggers, plus a `search_history` table and the
//! `global_search` UNION ALL query.

use rusqlite::{params, Connection, Result as DbErr};

/// DDL for the FTS5 virtual tables. Each virtual table is an "external-content"
/// FTS5 table that mirrors the indexed columns of its source table.
pub fn create_fts_tables() ->&'static str {
    "CREATE VIRTUAL TABLE IF NOT EXISTS fts_products USING fts5(
         name, category, company,
         tokenize='unicode61 remove_diacritics 2'
     );

     CREATE VIRTUAL TABLE IF NOT EXISTS fts_product_variants USING fts5(
         sku, variant_name,
         tokenize='unicode61 remove_diacritics 2'
     );

     CREATE VIRTUAL TABLE IF NOT EXISTS fts_warehouses USING fts5(
         name, location,
         tokenize='unicode61 remove_diacritics 2'
     );"
}

/// Per-entity triggers. `ai` mirrors inserts, `au` re-syncs on update, and
/// `aud` removes the FTS row when `deleted_at` transitions from NULL to a
/// timestamp (the project's soft-delete convention).
pub fn create_triggers() ->&'static str {
    "CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
       INSERT INTO fts_products(rowid, name, category, company)
       VALUES (new.id, new.name, new.category, new.company);
     END;

     CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NULL
     BEGIN
       DELETE FROM fts_products WHERE rowid = old.id;
       INSERT INTO fts_products(rowid, name, category, company)
       VALUES (new.id, new.name, new.category, new.company);
     END;

     CREATE TRIGGER IF NOT EXISTS products_aud AFTER UPDATE ON products
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       DELETE FROM fts_products WHERE rowid = old.id;
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_ai AFTER INSERT ON product_variants BEGIN
       INSERT INTO fts_product_variants(rowid, sku, variant_name)
       VALUES (new.id, new.sku, new.variant_name);
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_au AFTER UPDATE ON product_variants
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NULL
     BEGIN
       DELETE FROM fts_product_variants WHERE rowid = old.id;
       INSERT INTO fts_product_variants(rowid, sku, variant_name)
       VALUES (new.id, new.sku, new.variant_name);
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_aud AFTER UPDATE ON product_variants
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       DELETE FROM fts_product_variants WHERE rowid = old.id;
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_ai AFTER INSERT ON warehouses BEGIN
       INSERT INTO fts_warehouses(rowid, name, location)
       VALUES (new.id, new.name, new.location);
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_au AFTER UPDATE ON warehouses
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NULL
     BEGIN
       DELETE FROM fts_warehouses WHERE rowid = old.id;
       INSERT INTO fts_warehouses(rowid, name, location)
       VALUES (new.id, new.name, new.location);
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_aud AFTER UPDATE ON warehouses
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       DELETE FROM fts_warehouses WHERE rowid = old.id;
     END;"
}

pub fn create_search_history_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS search_history (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id TEXT NOT NULL,
         query TEXT NOT NULL,
         created_at TEXT DEFAULT (datetime('now')),
         deleted_at TEXT DEFAULT NULL
     ) STRICT;

     CREATE INDEX IF NOT EXISTS idx_search_history_user_recent
       ON search_history(user_id, created_at DESC)
       WHERE deleted_at IS NULL;

     CREATE VIEW IF NOT EXISTS active_search_history AS
       SELECT * FROM search_history WHERE deleted_at IS NULL;"
}

/// Rebuild every FTS5 index from its source active_* view. Safe to run any
/// time; the DELETE-then-INSERT pattern is idempotent.
pub fn refresh_index(conn: &Connection) -> DbErr<()> {
    conn.execute_batch(
        "INSERT INTO fts_products(fts_products)
         SELECT 'delete' FROM fts_products;
         INSERT INTO fts_products(rowid, name, category, company)
         SELECT id, name, category, company FROM active_products;

         INSERT INTO fts_product_variants(fts_product_variants)
         SELECT 'delete' FROM fts_product_variants;
         INSERT INTO fts_product_variants(rowid, sku, variant_name)
         SELECT id, sku, variant_name FROM active_product_variants;

         INSERT INTO fts_warehouses(fts_warehouses)
         SELECT 'delete' FROM fts_warehouses;
         INSERT INTO fts_warehouses(rowid, name, location)
         SELECT id, name, location FROM active_warehouses;",
    )?;
    Ok(())
}

/// The single SQL statement that powers `global_search`. Returns one row per
/// hit, with the entity's own id, the parent id (only for variants), the
/// raw matched title and column, and a rank. The frontend groups these into
/// per-entity buckets.
pub fn union_search_query() ->&'static str {
    "SELECT 'product' AS entity_type,
            CAST(p.id AS TEXT) AS id,
            NULL AS parent_id,
            NULL AS matched_column,
            p.name AS match_title,
            p.name AS highlighted_title,
            p.company AS subtitle,
            p.category AS meta,
            fts.rank
       FROM fts_products fts
       JOIN active_products p ON p.id = fts.rowid
      WHERE fts_products MATCH ?1

     UNION ALL

     SELECT 'variant',
            CAST(v.id AS TEXT),
            CAST(p.id AS TEXT),
            NULL AS matched_column,
            v.variant_name,
            v.variant_name,
            p.name,
            v.sku,
            fts.rank
       FROM fts_product_variants fts
       JOIN active_product_variants v ON v.id = fts.rowid
       JOIN active_products p ON p.id = v.product_id
      WHERE fts_product_variants MATCH ?1

     UNION ALL

     SELECT 'warehouse',
            CAST(w.id AS TEXT),
            NULL AS parent_id,
            NULL AS matched_column,
            w.name,
            w.name,
            COALESCE(w.location, ''),
            NULL,
            fts.rank
       FROM fts_warehouses fts
       JOIN active_warehouses w ON w.id = fts.rowid
      WHERE fts_warehouses MATCH ?1

     ORDER BY rank
     LIMIT ?2 OFFSET ?3;"
}

/// Count query that mirrors `union_search_query` (without `LIMIT`/`OFFSET`).
pub fn union_count_query() -> &'static str {
    "SELECT (
        (SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1)
      + (SELECT COUNT(*) FROM fts_product_variants WHERE fts_product_variants MATCH ?1)
      + (SELECT COUNT(*) FROM fts_warehouses WHERE fts_warehouses MATCH ?1)
     ) AS total;"
}

// ---------------------------------------------------------------------------
// search_history queries
// ---------------------------------------------------------------------------

pub fn history_list() -> &'static str {
    "SELECT id, user_id, query, created_at
       FROM active_search_history
      WHERE user_id = ?1
      ORDER BY created_at DESC
      LIMIT ?2"
}

pub fn history_record() -> &'static str {
    "INSERT INTO search_history (user_id, query, created_at) VALUES (?1, ?2, ?3)"
}

pub fn history_delete() -> &'static str {
    "UPDATE search_history SET deleted_at = ?1
      WHERE id = ?2 AND deleted_at IS NULL"
}

pub fn history_clear() -> &'static str {
    "UPDATE search_history SET deleted_at = ?1
      WHERE user_id = ?2 AND deleted_at IS NULL"
}

pub fn history_soft_delete_now() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

#[allow(dead_code)]
pub fn now_string() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn open_memory() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE products (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 name TEXT NOT NULL,
                 category TEXT NOT NULL,
                 company TEXT NOT NULL,
                 deleted_at DATETIME DEFAULT NULL
             );
             CREATE VIEW active_products AS SELECT * FROM products WHERE deleted_at IS NULL;

             CREATE TABLE product_variants (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 product_id INTEGER NOT NULL,
                 sku TEXT NOT NULL,
                 variant_name TEXT NOT NULL,
                 deleted_at DATETIME DEFAULT NULL
             );
             CREATE VIEW active_product_variants AS SELECT * FROM product_variants WHERE deleted_at IS NULL;

             CREATE TABLE warehouses (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 name TEXT NOT NULL,
                 location TEXT,
                 deleted_at DATETIME DEFAULT NULL
             );
             CREATE VIEW active_warehouses AS SELECT * FROM warehouses WHERE deleted_at IS NULL;",
        )
        .unwrap();
        conn
    }

    #[test]
    fn insert_trigger_indexes_product() {
        let conn = open_memory();
        conn.execute_batch(create_fts_tables()).unwrap();
        conn.execute_batch(create_triggers()).unwrap();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Laptop Stand', 'Accessories', 'Acme')",
            [],
        )
        .unwrap();
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH 'Laptop'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn update_trigger_re_syncs_text() {
        let conn = open_memory();
        conn.execute_batch(create_fts_tables()).unwrap();
        conn.execute_batch(create_triggers()).unwrap();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Old', 'A', 'B')", []).unwrap();
        conn.execute("UPDATE products SET name = 'NewName' WHERE id = 1", []).unwrap();
        let old_hits: i32 = conn
            .query_row("SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH 'Old'", [], |r| r.get(0))
            .unwrap();
        let new_hits: i32 = conn
            .query_row("SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH 'NewName'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(old_hits, 0);
        assert_eq!(new_hits, 1);
    }

    #[test]
    fn soft_delete_trigger_removes_fts_row() {
        let conn = open_memory();
        conn.execute_batch(create_fts_tables()).unwrap();
        conn.execute_batch(create_triggers()).unwrap();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Gadget', 'A', 'B')", []).unwrap();
        conn.execute("UPDATE products SET deleted_at = '2026-01-01 00:00:00' WHERE id = 1", []).unwrap();
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH 'Gadget'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn soft_delete_then_update_is_noop() {
        let conn = open_memory();
        conn.execute_batch(create_fts_tables()).unwrap();
        conn.execute_batch(create_triggers()).unwrap();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Thing', 'A', 'B')", []).unwrap();
        conn.execute("UPDATE products SET deleted_at = '2026-01-01 00:00:00' WHERE id = 1", []).unwrap();
        conn.execute("UPDATE products SET deleted_at = '2026-02-01 00:00:00' WHERE id = 1", []).unwrap();
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM fts_products", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn refresh_index_rebuilds_after_wipe() {
        let conn = open_memory();
        conn.execute_batch(create_fts_tables()).unwrap();
        conn.execute_batch(create_triggers()).unwrap();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Alpha', 'A', 'B')", []).unwrap();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Beta',  'A', 'B')", []).unwrap();
        conn.execute("DELETE FROM fts_products", []).unwrap();
        refresh_index(&conn).unwrap();
        let count: i32 = conn.query_row("SELECT COUNT(*) FROM fts_products", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn union_query_returns_ranked_hits() {
        let conn = open_memory();
        conn.execute_batch(create_fts_tables()).unwrap();
        conn.execute_batch(create_triggers()).unwrap();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Laptop Stand', 'Accessories', 'Acme')", []).unwrap();
        conn.execute("INSERT INTO product_variants (product_id, sku, variant_name) VALUES (1, 'LS-LAPTOP-RED', 'Laptop Red')", []).unwrap();
        conn.execute("INSERT INTO warehouses (name, location) VALUES ('Laptop Hub', 'Cairo')", []).unwrap();
        let mut stmt = conn.prepare(union_search_query()).unwrap();
        let hits: Vec<String> = stmt
            .query_map(params!["Laptop", 100i32, 0i32], |r| r.get::<_, String>(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        assert!(hits.iter().any(|e| e == "product"));
        assert!(hits.iter().any(|e| e == "variant"));
        assert!(hits.iter().any(|e| e == "warehouse"));
    }

    #[test]
    fn search_history_soft_delete_and_per_user() {
        let conn = open_memory();
        conn.execute_batch(create_search_history_table()).unwrap();
        conn.execute(history_record(), params!["u1", "hello", "2026-01-01 00:00:00"]).unwrap();
        conn.execute(history_record(), params!["u2", "world", "2026-01-02 00:00:00"]).unwrap();
        let mut stmt = conn.prepare(history_list()).unwrap();
        let u1: Vec<String> = stmt
            .query_map(params!["u1", 10i32], |r| r.get::<_, String>(2))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        let u2: Vec<String> = stmt
            .query_map(params!["u2", 10i32], |r| r.get::<_, String>(2))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        assert_eq!(u1, vec!["hello".to_string()]);
        assert_eq!(u2, vec!["world".to_string()]);
    }
}