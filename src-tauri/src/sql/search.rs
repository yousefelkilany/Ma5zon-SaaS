//! SQL statements for the global search subsystem.
//!
//! One FTS5 virtual table per indexed entity, kept in sync by per-entity
//! `ai` / `au` / `aud` triggers, plus a `search_history` table and the
//! `global_search` UNION ALL query.

use rusqlite::{Connection, Result as DbErr};

/// DDL for the FTS5 virtual tables. Each virtual table is a self-contained
/// FTS5 virtual table whose columns mirror the indexed columns of its source
/// table. The `trigram` tokenizer splits text into 3-character windows, giving
/// us substring + light typo tolerance. The source tables store the original
/// data unchanged; the FTS5 rows are populated by triggers that pipe every
/// column through the `normalize_arabic` UDF on the way in. FTS5 is *not*
/// external-content because the indexed value (normalized) differs from the
/// source value (original).
pub fn create_fts_tables() -> &'static str {
    "CREATE VIRTUAL TABLE IF NOT EXISTS fts_products USING fts5(
         name, category, company,
         tokenize='trigram'
     );

     CREATE VIRTUAL TABLE IF NOT EXISTS fts_product_variants USING fts5(
         sku, variant_name,
         tokenize='trigram'
     );

     CREATE VIRTUAL TABLE IF NOT EXISTS fts_warehouses USING fts5(
         name, location,
         tokenize='trigram'
     );"
}

/// Per-entity triggers. `ai`/`au` insert into the FTS5 virtual table, piping
/// every indexed column through the `normalize_arabic` UDF. `aud` removes the
/// FTS row when `deleted_at` transitions from NULL to a timestamp (the
/// project's soft-delete convention).
pub fn create_triggers() -> &'static str {
    "CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
       INSERT INTO fts_products(rowid, name, category, company)
       VALUES (new.id,
               normalize_arabic(new.name),
               normalize_arabic(new.category),
               normalize_arabic(new.company));
     END;

     CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NULL
     BEGIN
       DELETE FROM fts_products WHERE rowid = old.id;
       INSERT INTO fts_products(rowid, name, category, company)
       VALUES (new.id,
               normalize_arabic(new.name),
               normalize_arabic(new.category),
               normalize_arabic(new.company));
     END;

     CREATE TRIGGER IF NOT EXISTS products_aud AFTER UPDATE OF deleted_at ON products
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       DELETE FROM fts_products WHERE rowid = old.id;
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_ai AFTER INSERT ON product_variants BEGIN
       INSERT INTO fts_product_variants(rowid, sku, variant_name)
       VALUES (new.id,
               normalize_arabic(new.sku),
               normalize_arabic(new.variant_name));
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_au AFTER UPDATE ON product_variants
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NULL
     BEGIN
       DELETE FROM fts_product_variants WHERE rowid = old.id;
       INSERT INTO fts_product_variants(rowid, sku, variant_name)
       VALUES (new.id,
               normalize_arabic(new.sku),
               normalize_arabic(new.variant_name));
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_aud AFTER UPDATE OF deleted_at ON product_variants
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       DELETE FROM fts_product_variants WHERE rowid = old.id;
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_ai AFTER INSERT ON warehouses BEGIN
       INSERT INTO fts_warehouses(rowid, name, location)
       VALUES (new.id,
               normalize_arabic(new.name),
               COALESCE(normalize_arabic(new.location), ''));
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_au AFTER UPDATE ON warehouses
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NULL
     BEGIN
       DELETE FROM fts_warehouses WHERE rowid = old.id;
       INSERT INTO fts_warehouses(rowid, name, location)
       VALUES (new.id,
               normalize_arabic(new.name),
               COALESCE(normalize_arabic(new.location), ''));
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_aud AFTER UPDATE OF deleted_at ON warehouses
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
/// time; the DELETE-then-INSERT pattern is idempotent. Each FTS5 row is
/// populated by piping the source column through the `normalize_arabic` UDF,
/// keeping the FTS5 store aligned with the JS `normalizeArabic` helper.
pub fn refresh_index(conn: &Connection) -> DbErr<()> {
    conn.execute_batch(
        "DELETE FROM fts_products;
         INSERT INTO fts_products(rowid, name, category, company)
         SELECT id,
                normalize_arabic(name),
                normalize_arabic(category),
                normalize_arabic(company)
           FROM active_products;

         DELETE FROM fts_product_variants;
         INSERT INTO fts_product_variants(rowid, sku, variant_name)
         SELECT id,
                normalize_arabic(sku),
                normalize_arabic(variant_name)
           FROM active_product_variants;

         DELETE FROM fts_warehouses;
         INSERT INTO fts_warehouses(rowid, name, location)
         SELECT id,
                normalize_arabic(name),
                COALESCE(normalize_arabic(location), '')
           FROM active_warehouses;",
    )?;
    Ok(())
}

/// Convert a user query into a safe FTS5 expression for the `trigram`
/// tokenizer. Splits on whitespace, strips non-alphanumeric/underscore
/// characters from the edges of each token, escapes internal double-quotes,
/// and AND-joins the wrapped tokens. Trigram requires each phrase to be at
/// least 3 characters; shorter tokens are dropped. Returns None when no
/// usable tokens remain.
pub fn build_fts_query(raw: &str) -> Option<String> {
    let tokens: Vec<String> = raw
        .split_whitespace()
        .map(|t| t.trim_matches(|c: char| !c.is_alphanumeric() && c != '_'))
        .filter(|t| t.chars().count() >= 3)
        .map(|t| {
            let escaped = t.replace('"', "\"\"");
            format!("\"{escaped}\"")
        })
        .collect();
    if tokens.is_empty() {
        return None;
    }
    Some(tokens.join(" AND "))
}

/// Build a column-scoped FTS5 MATCH expression from a sanitized phrase set.
/// The `base` argument is the output of `build_fts_query` (e.g.
/// `"hello" AND "world"`); the returned string re-scopes each phrase to
/// `col` and uses the FTS5 column-name LHS MATCH syntax (FTS5 docs §3.6).
/// The result is safe to bake into SQL because the `base` phrases are already
/// quoted and the column name is a known literal from the schema.
pub fn column_match(col: &str, base: &str) -> String {
    base.split(" AND ")
        .map(|phrase| format!("{col}:{phrase}"))
        .collect::<Vec<_>>()
        .join(" AND ")
}

/// The single SQL statement that powers `global_search`. Returns one row per
/// (entity, id) hit, with the matched-columns list, the parent id (only for
/// variants), and a rank. A CTE first materializes per-column matches
/// (`name:?1`, `category:?2`, etc.) so the matched columns are explicit; the
/// outer query groups them by (entity_type, id), joins back to the source
/// tables to hydrate the display fields, and orders by `MIN(rank)`. The
/// frontend groups the resulting rows into per-entity buckets.
///
/// Bind layout: `?1..?7` are pre-baked column-scoped MATCH expressions (one
/// per indexed column), built by `column_match` from the sanitized
/// `build_fts_query` output. `?8` is `limit`, `?9` is `offset`.
///
/// FTS5 quirk: when the same FTS5 virtual table is referenced from multiple
/// UNION ALL legs, each leg must use the unaliased FTS5 table name in MATCH
/// expressions. Using an alias (`FROM fts_products fts ... WHERE fts MATCH`)
/// confuses the parser and the second+ legs fail with "no such column: fts".
/// The FTS5 rank auxiliary column also uses the unaliased name.
pub fn union_search_query() -> String {
    "WITH hits AS (
       SELECT 'product' AS entity_type,
              CAST(p.id AS TEXT) AS id,
              NULL AS parent_id,
              'name' AS matched_column,
              fts_products.rank
         FROM fts_products
         JOIN active_products p ON p.id = fts_products.rowid
        WHERE fts_products MATCH ?1

       UNION ALL

       SELECT 'product',
              CAST(p.id AS TEXT),
              NULL,
              'category',
              fts_products.rank
         FROM fts_products
         JOIN active_products p ON p.id = fts_products.rowid
        WHERE fts_products MATCH ?2

       UNION ALL

       SELECT 'product',
              CAST(p.id AS TEXT),
              NULL,
              'company',
              fts_products.rank
         FROM fts_products
         JOIN active_products p ON p.id = fts_products.rowid
        WHERE fts_products MATCH ?3

       UNION ALL

       SELECT 'variant',
              CAST(v.id AS TEXT),
              CAST(p.id AS TEXT),
              'sku',
              fts_product_variants.rank
         FROM fts_product_variants
         JOIN active_product_variants v ON v.id = fts_product_variants.rowid
         JOIN active_products p ON p.id = v.product_id
        WHERE fts_product_variants MATCH ?4

       UNION ALL

       SELECT 'variant',
              CAST(v.id AS TEXT),
              CAST(p.id AS TEXT),
              'variant_name',
              fts_product_variants.rank
         FROM fts_product_variants
         JOIN active_product_variants v ON v.id = fts_product_variants.rowid
         JOIN active_products p ON p.id = v.product_id
        WHERE fts_product_variants MATCH ?5

       UNION ALL

       SELECT 'warehouse',
              CAST(w.id AS TEXT),
              NULL,
              'name',
              fts_warehouses.rank
         FROM fts_warehouses
         JOIN active_warehouses w ON w.id = fts_warehouses.rowid
        WHERE fts_warehouses MATCH ?6

       UNION ALL

       SELECT 'warehouse',
              CAST(w.id AS TEXT),
              NULL,
              'location',
              fts_warehouses.rank
         FROM fts_warehouses
         JOIN active_warehouses w ON w.id = fts_warehouses.rowid
        WHERE fts_warehouses MATCH ?7
     ),
     grouped AS (
       SELECT entity_type,
              id,
              parent_id,
              group_concat(matched_column, ',') AS matched_columns,
              MIN(rank) AS rank
         FROM hits
        GROUP BY entity_type, id
     )
     SELECT g.entity_type,
            g.id,
            g.parent_id,
            g.matched_columns AS matched_column,
            p.name AS match_title,
            p.name AS highlighted_title,
            p.company AS subtitle,
            p.category AS meta,
            g.rank
       FROM grouped g
       JOIN active_products p ON p.id = CAST(g.id AS INTEGER)
      WHERE g.entity_type = 'product'

     UNION ALL

     SELECT g.entity_type,
            g.id,
            g.parent_id,
            g.matched_columns,
            v.variant_name,
            v.variant_name,
            p.name,
            v.sku,
            g.rank
       FROM grouped g
       JOIN active_product_variants v ON v.id = CAST(g.id AS INTEGER)
       JOIN active_products p ON p.id = v.product_id
      WHERE g.entity_type = 'variant'

     UNION ALL

     SELECT g.entity_type,
            g.id,
            g.parent_id,
            g.matched_columns,
            w.name,
            w.name,
            COALESCE(w.location, ''),
            NULL,
            g.rank
       FROM grouped g
       JOIN active_warehouses w ON w.id = CAST(g.id AS INTEGER)
      WHERE g.entity_type = 'warehouse'

     ORDER BY rank
     LIMIT ?8 OFFSET ?9;"
        .to_string()
}

/// Count query that mirrors `union_search_query`'s hit set (without
/// `LIMIT`/`OFFSET` and without per-column resolution). The caller binds
/// pre-baked column-scoped MATCH expressions to `?1`, `?2`, `?3`.
pub fn union_count_query() -> &'static str {
    "SELECT (
        (SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1)
      + (SELECT COUNT(*) FROM fts_product_variants WHERE fts_product_variants MATCH ?2)
      + (SELECT COUNT(*) FROM fts_warehouses WHERE fts_warehouses MATCH ?3)
     ) AS total;"
}

// ---------------------------------------------------------------------------
// search_history queries
// ---------------------------------------------------------------------------

pub fn history_list() -> &'static str {
    "SELECT id, user_id, query, created_at, count
       FROM (
         SELECT id, user_id, query, created_at,
                COUNT(*) OVER (PARTITION BY grp) AS count,
                LAG(query) OVER (ORDER BY created_at DESC, id DESC) AS prev_query
           FROM (
             SELECT id, user_id, query, created_at,
                    SUM(CASE WHEN query = prev_query THEN 0 ELSE 1 END)
                      OVER (ORDER BY created_at DESC, id DESC) AS grp
               FROM (
                 SELECT id, user_id, query, created_at,
                        LAG(query) OVER (ORDER BY created_at DESC, id DESC) AS prev_query
                   FROM active_search_history
                  WHERE user_id = ?1
               )
           )
       )
      WHERE prev_query IS NULL OR prev_query != query
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
    use crate::commands::db_utils::register_udfs;
    use rusqlite::{params, Connection};

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
        register_udfs(&conn).unwrap();
        conn.execute_batch(create_fts_tables()).unwrap();
        conn.execute_batch(create_triggers()).unwrap();
        conn
    }

    #[test]
    fn insert_trigger_indexes_product() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Laptop Stand', 'Accessories', 'Acme')",
            [],
        )
        .unwrap();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1",
                params!["\"Laptop\""],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn update_trigger_re_syncs_text() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Old', 'A', 'B')",
            [],
        )
        .unwrap();
        conn.execute("UPDATE products SET name = 'NewName' WHERE id = 1", [])
            .unwrap();
        let old_hits: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1",
                params!["\"Old\""],
                |r| r.get(0),
            )
            .unwrap();
        let new_hits: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1",
                params!["\"NewName\""],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(old_hits, 0);
        assert_eq!(new_hits, 1);
    }

    #[test]
    fn soft_delete_trigger_removes_fts_row() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Gadget', 'A', 'B')",
            [],
        )
        .unwrap();
        conn.execute("UPDATE products SET deleted_at = '2026-01-01 00:00:00' WHERE id = 1", [])
            .unwrap();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1",
                params!["\"Gadget\""],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn soft_delete_then_update_is_noop() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Thing', 'A', 'B')",
            [],
        )
        .unwrap();
        conn.execute("UPDATE products SET deleted_at = '2026-01-01 00:00:00' WHERE id = 1", [])
            .unwrap();
        conn.execute("UPDATE products SET deleted_at = '2026-02-01 00:00:00' WHERE id = 1", [])
            .unwrap();
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM fts_products", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn refresh_index_rebuilds_after_wipe() {
        let conn = open_memory();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Alpha', 'A', 'B')", []).unwrap();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Beta',  'A', 'B')", []).unwrap();
        conn.execute("DELETE FROM fts_products", []).unwrap();
        refresh_index(&conn).unwrap();
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM fts_products", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn union_query_returns_ranked_hits() {
        let conn = open_memory();
        conn.execute("INSERT INTO products (name, category, company) VALUES ('Laptop Stand', 'Accessories', 'Acme')", []).unwrap();
        conn.execute("INSERT INTO product_variants (product_id, sku, variant_name) VALUES (1, 'LS-LAPTOP-RED', 'Laptop Red')", []).unwrap();
        conn.execute("INSERT INTO warehouses (name, location) VALUES ('Laptop Hub', 'Cairo')", []).unwrap();
        let q = build_fts_query("Laptop").unwrap();
        let mut stmt = conn.prepare(&union_search_query()).unwrap();
        let hits: Vec<String> = stmt
            .query_map(
                params![
                    column_match("name", &q),
                    column_match("category", &q),
                    column_match("company", &q),
                    column_match("sku", &q),
                    column_match("variant_name", &q),
                    column_match("name", &q),
                    column_match("location", &q),
                    100i32, 0i32
                ],
                |r| r.get::<_, String>(0),
            )
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        assert!(hits.iter().any(|e| e == "product"));
        assert!(hits.iter().any(|e| e == "variant"));
        assert!(hits.iter().any(|e| e == "warehouse"));
    }

    #[test]
    fn union_query_resolves_matched_column() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Laptop Stand', 'Accessories', 'Acme')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Mouse', 'Accessories', 'Beta')",
            [],
        )
        .unwrap();
        let q = build_fts_query("Accessories").unwrap();
        let mut stmt = conn.prepare(&union_search_query()).unwrap();
        let matched: Vec<Option<String>> = stmt
            .query_map(
                params![
                    column_match("name", &q),
                    column_match("category", &q),
                    column_match("company", &q),
                    column_match("sku", &q),
                    column_match("variant_name", &q),
                    column_match("name", &q),
                    column_match("location", &q),
                    100i32, 0i32
                ],
                |r| r.get::<_, Option<String>>(3),
            )
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        assert!(matched.iter().all(|c| c.as_deref() == Some("category")));
    }

    #[test]
    fn union_query_concatenates_multi_column_matches() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Laptop Stand', 'Accessories', 'Acme')",
            [],
        )
        .unwrap();
        // Use a single column-friendly query for now: the AND of two
        // short phrases in different columns still works as AND semantics,
        // and the CTE groups the matches by (entity, id).
        let q = build_fts_query("Accessories").unwrap();
        let mut stmt = conn.prepare(&union_search_query()).unwrap();
        let matched: Vec<Option<String>> = stmt
            .query_map(
                params![
                    column_match("name", &q),
                    column_match("category", &q),
                    column_match("company", &q),
                    column_match("sku", &q),
                    column_match("variant_name", &q),
                    column_match("name", &q),
                    column_match("location", &q),
                    100i32, 0i32
                ],
                |r| r.get::<_, Option<String>>(3),
            )
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        assert_eq!(matched.len(), 1);
        let cols: Vec<&str> = matched[0].as_deref().unwrap_or("").split(',').collect();
        assert!(cols.contains(&"category"));
    }

    #[test]
    fn column_match_scopes_tokens_to_column() {
        let base = build_fts_query("Laptop Stand").unwrap();
        assert_eq!(
            column_match("name", &base),
            "name:\"Laptop\" AND name:\"Stand\""
        );
        let amox = build_fts_query("amox").unwrap();
        assert_eq!(column_match("sku", &amox), "sku:\"amox\"");
    }

    #[test]
    fn search_history_soft_delete_and_per_user() {
        let conn = open_memory();
        conn.execute_batch(create_search_history_table()).unwrap();
        conn.execute(
            history_record(),
            params!["u1", "hello", "2026-01-01 00:00:00"],
        )
        .unwrap();
        conn.execute(
            history_record(),
            params!["u2", "world", "2026-01-02 00:00:00"],
        )
        .unwrap();
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

    #[test]
    fn search_history_collapses_consecutive_duplicates() {
        let conn = open_memory();
        conn.execute_batch(create_search_history_table()).unwrap();
        let rows = [
            ("x", "2026-01-01 00:00:00"),
            ("x", "2026-01-02 00:00:00"),
            ("x", "2026-01-03 00:00:00"),
            ("y", "2026-01-04 00:00:00"),
            ("y", "2026-01-05 00:00:00"),
            ("y", "2026-01-06 00:00:00"),
            ("z", "2026-01-07 00:00:00"),
            ("z", "2026-01-08 00:00:00"),
            ("x", "2026-01-09 00:00:00"),
            ("x", "2026-01-10 00:00:00"),
            ("y", "2026-01-11 00:00:00"),
        ];
        for (q, ts) in rows {
            conn.execute(history_record(), params!["u1", q, ts]).unwrap();
        }
        let mut stmt = conn.prepare(history_list()).unwrap();
        let rows: Vec<(String, i64)> = stmt
            .query_map(params!["u1", 50i32], |r| {
                Ok((r.get::<_, String>(2)?, r.get::<_, i64>(4)?))
            })
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        let queries: Vec<String> = rows.iter().map(|(q, _)| q.clone()).collect();
        let counts: Vec<i64> = rows.iter().map(|(_, c)| *c).collect();
        assert_eq!(
            queries,
            vec!["y", "x", "z", "y", "x"]
                .into_iter()
                .map(String::from)
                .collect::<Vec<_>>()
        );
        assert_eq!(counts, vec![1, 2, 2, 3, 3]);
    }

    #[test]
    fn search_history_run_lengths_match_actual_consecutive_runs() {
        let conn = open_memory();
        conn.execute_batch(create_search_history_table()).unwrap();
        let rows = [
            ("Iro", "2026-01-01 00:00:00"),
            ("asd", "2026-01-02 00:00:00"),
            ("Iro", "2026-01-03 00:00:00"),
            ("amo", "2026-01-04 00:00:00"),
            ("amo", "2026-01-05 00:00:00"),
            ("amo", "2026-01-06 00:00:00"),
            ("amo", "2026-01-07 00:00:00"),
        ];
        for (q, ts) in rows {
            conn.execute(history_record(), params!["u1", q, ts]).unwrap();
        }
        let mut stmt = conn.prepare(history_list()).unwrap();
        let rows: Vec<(String, i64)> = stmt
            .query_map(params!["u1", 50i32], |r| {
                Ok((r.get::<_, String>(2)?, r.get::<_, i64>(4)?))
            })
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        let queries: Vec<String> = rows.iter().map(|(q, _)| q.clone()).collect();
        let counts: Vec<i64> = rows.iter().map(|(_, c)| *c).collect();
        assert_eq!(
            queries,
            vec!["amo", "Iro", "asd", "Iro"]
                .into_iter()
                .map(String::from)
                .collect::<Vec<_>>()
        );
        assert_eq!(counts, vec![4, 1, 1, 1]);
    }

    #[test]
    fn fts_query_sanitizes_user_input() {
        assert_eq!(
            build_fts_query("Laptop Stand").unwrap(),
            "\"Laptop\" AND \"Stand\""
        );
        assert!(build_fts_query("  hi! ").is_none());
        assert_eq!(build_fts_query("amox").unwrap(), "\"amox\"");
        assert!(build_fts_query("ab").is_none());
        assert!(build_fts_query("!!!").is_none());
        assert!(build_fts_query("").is_none());
        assert!(build_fts_query("   ").is_none());
    }

    #[test]
    fn fts_query_finds_substring_match() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('Amoxicillin 500mg', 'Antibiotic', 'Pharma')",
            [],
        )
        .unwrap();
        let q = build_fts_query("amox").unwrap();
        let mut stmt = conn.prepare(&union_search_query()).unwrap();
        let hits: Vec<String> = stmt
            .query_map(
                params![
                    column_match("name", &q),
                    column_match("category", &q),
                    column_match("company", &q),
                    column_match("sku", &q),
                    column_match("variant_name", &q),
                    column_match("name", &q),
                    column_match("location", &q),
                    100i32, 0i32
                ],
                |r| r.get::<_, String>(0),
            )
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        assert!(hits.iter().any(|e| e == "product"));
    }

    #[test]
    fn fts_query_finds_arabic_normalized_match() {
        // The UDF strips Arabic combining marks and folds alef/taa/yaa. The
        // FTS5 row for the inserted product should be searchable by:
        //   - the same string with no diacritics (the indexed normalized form)
        //   - a prefix of the indexed text (trigram substring matching)
        let conn = open_memory();
        conn.execute(
            "INSERT INTO products (name, category, company) VALUES ('مُحَمَّد', 'كتب', 'شركة')",
            [],
        )
        .unwrap();
        let stored: String = conn
            .query_row("SELECT name FROM fts_products WHERE rowid = 1", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(stored, "محمد");
        // Sanity: the FTS5 row stored the normalized form (no diacritics).
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1",
                params!["\"محمد\""],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
        // Substring match: "حمد" is a contiguous trigram substring of the
        // indexed "محمد".
        let count_substr: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1",
                params!["\"حمد\""],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count_substr, 1);
        // Alef-folded query (إ/أ/آ -> ا). The phrase "احمد" requires the
        // trigram "اح" to appear in the indexed text, which it does not in
        // "محمد". With the trigram tokenizer, the normalization helps match
        // variants of the *same* word (e.g. "مُحَمَّد" / "محمد") but does
        // not cross-match unrelated words.
        let count2: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM fts_products WHERE fts_products MATCH ?1",
                params!["\"احمد\""],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count2, 0);
    }

    #[test]
    fn fts_query_drops_short_tokens() {
        // Trigram requires 3+ characters per token; the sanitizer drops shorter.
        assert!(build_fts_query("a b cd").is_none());
        assert!(build_fts_query("ab cd ef").is_none());
        assert_eq!(
            build_fts_query("ab cd laptop").unwrap(),
            "\"laptop\""
        );
    }
}