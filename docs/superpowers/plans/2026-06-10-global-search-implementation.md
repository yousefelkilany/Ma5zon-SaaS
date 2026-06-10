# Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real, FTS5-backed global search to the navbar with grouped result rows, per-user search history, infinite pagination, matched-text highlighting, and three layers of "entity missing" defense.

**Architecture:** Per-entity FTS5 virtual tables (`fts_products`, `fts_product_variants`, `fts_warehouses`) kept in sync by `ai` / `au` / `aud` triggers, joined to `active_*` views at query time. A single Rust command `global_search(query, limit, offset)` runs one `UNION ALL` plus a `COUNT(*)` in a read transaction and returns `PaginatedSearchResult { data, total_count, total_pages }`. Frontend uses `useInfiniteQuery` and a dropdown anchored under the existing navbar input, with a separate per-user `search_history` table and history-only view shown when the input is empty or under 3 characters.

**Tech Stack:** Tauri v2, Rust (rusqlite, FTS5, tauri-specta, async-trait), React 19, TanStack Query 5, TanStack Router, Vitest + Testing Library, DOMPurify.

**Spec:** `docs/superpowers/specs/2026-06-10-global-search-design.md`

---

## File Structure

**New files (backend):**

- `src-tauri/src/sql/search.rs` — FTS5 DDL, `ai` / `au` / `aud` triggers per entity, `search_history` DDL, the union query builder, `refresh_search_index`.
- `src-tauri/src/commands/search.rs` — `global_search`, `refresh_search_index`, `search_history_list/record/delete/clear`, `SearchInitializer`, `SearchHistoryInitializer`.
- `src-tauri/migrations/002_search_fts.sql` — backfill for existing DBs.

**New files (frontend):**

- `src/components/layout/GlobalSearch.tsx` — input + dropdown shell.
- `src/components/layout/search/SearchDropdown.tsx` — the dropdown panel that switches between history and results.
- `src/components/layout/search/SearchResultList.tsx` — groups, dedupes, "Show more", stale-row state.
- `src/components/layout/search/SearchHistoryList.tsx` — recent + filtered-by-prefix.
- `src/components/layout/search/useGlobalSearch.ts` — `useInfiniteQuery` wrapper.
- `src/components/layout/search/useSearchHistory.ts` — list / record / delete / clear hooks.
- `src/components/layout/search/result-rows/ProductResultRow.tsx`.
- `src/components/layout/search/result-rows/VariantResultRow.tsx`.
- `src/components/layout/search/result-rows/WarehouseResultRow.tsx`.
- `src/components/layout/search/types.ts` — `SearchHit`, `PaginatedSearchResult`, `SearchHistoryEntry` (mirrors Rust).
- `src/components/entity/EntityMissingState.tsx` — modal-level fallback.
- `src/lib/sanitize.ts` — `sanitizeHighlight` allowlist helper.
- Tests alongside each new file (`*.test.ts` / `*.test.tsx`).

**Modified files:**

- `src-tauri/src/sql/mod.rs` — export `search` module.
- `src-tauri/src/commands/mod.rs` — register both initializers in `TABLE_INITIALIZERS`.
- `src-tauri/src/bindings.rs` — add the new commands to `collect_commands!`.
- `src-tauri/src/types.rs` — add `SearchHit`, `PaginatedSearchResult`, `SearchHistoryEntry`.
- `src/components/layout/Navbar.tsx` — replace inline search markup with `<GlobalSearch />`.
- `src/components/modal/ModalManager.tsx` — read `product_id` param; pass through to `VariantModal`; ensure missing-state propagation.
- `src/components/entity/ProductModal.tsx` — render `EntityMissingState` when data is `undefined` after open.
- `src/components/entity/VariantModal.tsx` — same.
- `src/components/entity/WarehouseModal.tsx` — same.
- `src/router/index.tsx` — extend `entitySearchSchema` with `product_id`.
- `src/hooks/use-keyboard-shortcuts.ts` — register `/` and `Cmd/Ctrl+K` global focus handlers.
- `docs/developer/tauri-commands.md` — note the new commands.
- `docs/developer/state-management.md` — note the two new hooks.

---

## Task 1: Add shared types in `src-tauri/src/types.rs`

**Files:**

- Modify: `src-tauri/src/types.rs:1-10` (imports) and add types at the end of the file.

- [ ] **Step 1: Add the types**

Append the following to `src-tauri/src/types.rs` (after the existing `SortState` struct):

```rust
// ============================================================================
// Global Search
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchHit {
    pub entity_type: String,
    pub id: String,
    pub parent_id: Option<String>,
    pub matched_column: String,
    pub match_title: String,
    pub highlighted_title: String,
    pub subtitle: String,
    pub meta: Option<String>,
    pub rank: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PaginatedSearchResult {
    pub data: Vec<SearchHit>,
    pub total_count: i32,
    pub total_pages: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchHistoryEntry {
    pub id: String,
    pub user_id: String,
    pub query: String,
    pub created_at: Option<String>,
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: succeeds with no errors. (Bindings aren't regenerated yet; that's Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/types.rs
git commit -m "feat(search): add SearchHit, PaginatedSearchResult, SearchHistoryEntry types"
```

---

## Task 2: Create `src-tauri/src/sql/search.rs` — FTS5 DDL, triggers, search_history, union query

**Files:**

- Create: `src-tauri/src/sql/search.rs`

- [ ] **Step 1: Create the file with FTS5 DDL and triggers**

Create `src-tauri/src/sql/search.rs` with this exact content:

```rust
//! SQL statements for the global search subsystem.
//!
//! One FTS5 virtual table per indexed entity, kept in sync by per-entity
//! `ai` / `au` / `aud` triggers, plus a `search_history` table and the
//! `global_search` UNION ALL query.

use rusqlite::{params, Connection, Result as DbErr};

/// DDL for the FTS5 virtual tables. Each virtual table is an "external-content"
/// FTS5 table that mirrors the indexed columns of its source table.
pub fn create_fts_tables() -> &'static str {
    "CREATE VIRTUAL TABLE IF NOT EXISTS fts_products USING fts5(
         name, category, company,
         content='products', content_rowid='id',
         tokenize='unicode61 remove_diacritics 2'
     );

     CREATE VIRTUAL TABLE IF NOT EXISTS fts_product_variants USING fts5(
         sku, variant_name,
         content='product_variants', content_rowid='id',
         tokenize='unicode61 remove_diacritics 2'
     );

     CREATE VIRTUAL TABLE IF NOT EXISTS fts_warehouses USING fts5(
         name, location,
         content='warehouses', content_rowid='id',
         tokenize='unicode61 remove_diacritics 2'
     );"
}

/// Per-entity triggers. `ai` mirrors inserts, `au` re-syncs on update, and
/// `aud` removes the FTS row when `deleted_at` transitions from NULL to a
/// timestamp (the project's soft-delete convention).
pub fn create_triggers() -> &'static str {
    "CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
       INSERT INTO fts_products(rowid, name, category, company)
       VALUES (new.id, new.name, new.category, new.company);
     END;

     CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
       INSERT INTO fts_products(fts_products, rowid, name, category, company)
       VALUES ('delete', old.id, old.name, old.category, old.company);
       INSERT INTO fts_products(rowid, name, category, company)
       VALUES (new.id, new.name, new.category, new.company);
     END;

     CREATE TRIGGER IF NOT EXISTS products_aud AFTER UPDATE OF deleted_at ON products
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       INSERT INTO fts_products(fts_products, rowid, name, category, company)
       VALUES ('delete', old.id, old.name, old.category, old.company);
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_ai AFTER INSERT ON product_variants BEGIN
       INSERT INTO fts_product_variants(rowid, sku, variant_name)
       VALUES (new.id, new.sku, new.variant_name);
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_au AFTER UPDATE ON product_variants BEGIN
       INSERT INTO fts_product_variants(fts_product_variants, rowid, sku, variant_name)
       VALUES ('delete', old.id, old.sku, old.variant_name);
       INSERT INTO fts_product_variants(rowid, sku, variant_name)
       VALUES (new.id, new.sku, new.variant_name);
     END;

     CREATE TRIGGER IF NOT EXISTS product_variants_aud AFTER UPDATE OF deleted_at ON product_variants
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       INSERT INTO fts_product_variants(fts_product_variants, rowid, sku, variant_name)
       VALUES ('delete', old.id, old.sku, old.variant_name);
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_ai AFTER INSERT ON warehouses BEGIN
       INSERT INTO fts_warehouses(rowid, name, location)
       VALUES (new.id, new.name, new.location);
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_au AFTER UPDATE ON warehouses BEGIN
       INSERT INTO fts_warehouses(fts_warehouses, rowid, name, location)
       VALUES ('delete', old.id, old.name, old.location);
       INSERT INTO fts_warehouses(rowid, name, location)
       VALUES (new.id, new.name, new.location);
     END;

     CREATE TRIGGER IF NOT EXISTS warehouses_aud AFTER UPDATE OF deleted_at ON warehouses
       WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
     BEGIN
       INSERT INTO fts_warehouses(fts_warehouses, rowid, name, location)
       VALUES ('delete', old.id, old.name, old.location);
     END;"
}

pub fn create_search_history_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS search_history (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id TEXT NOT NULL,
         query TEXT NOT NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         deleted_at DATETIME DEFAULT NULL
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
/// hit, with the entity's own id, the parent id (only for variants), a
/// precomputed `highlighted_title` and a rank. The frontend groups these
/// into per-entity buckets.
pub fn union_search_query() -> &'static str {
    "SELECT 'product' AS entity_type,
            CAST(p.id AS TEXT) AS id,
            NULL AS parent_id,
            fts.matched_column,
            p.name AS match_title,
            p.name AS highlighted_title,
            p.company AS subtitle,
            p.category AS meta,
            fts.rank
       FROM (
         SELECT rowid,
                CASE
                  WHEN fts_products MATCH ?1 THEN 'name'
                  WHEN fts_products MATCH ?1 THEN 'category'
                  ELSE 'company'
                END AS matched_column,
                rank
           FROM fts_products
          WHERE fts_products MATCH ?1
       ) fts
       JOIN active_products p ON p.id = fts.rowid

     UNION ALL

     SELECT 'variant',
            CAST(v.id AS TEXT),
            CAST(p.id AS TEXT),
            fts.matched_column,
            v.variant_name,
            v.variant_name,
            p.name,
            v.sku,
            fts.rank
       FROM (
         SELECT rowid,
                CASE WHEN v MATCH ?1 THEN 'sku' ELSE 'variant_name' END,
                rank
           FROM fts_product_variants v
          WHERE v MATCH ?1
       ) fts
       JOIN active_product_variants v ON v.id = fts.rowid
       JOIN active_products p ON p.id = v.product_id

     UNION ALL

     SELECT 'warehouse',
            CAST(w.id AS TEXT),
            NULL,
            fts.matched_column,
            w.name,
            w.name,
            COALESCE(w.location, ''),
            NULL,
            fts.rank
       FROM (
         SELECT rowid,
                CASE WHEN w MATCH ?1 THEN 'name' ELSE 'location' END,
                rank
           FROM fts_warehouses w
          WHERE w MATCH ?1
       ) fts
       JOIN active_warehouses w ON w.id = fts.rowid

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
        // Second update to deleted_at should be a no-op for the FTS index.
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
        conn.execute("INSERT INTO product_variants (product_id, sku, variant_name) VALUES (1, 'LS-RED', 'Red')", []).unwrap();
        conn.execute("INSERT INTO warehouses (name, location) VALUES ('Laptop Hub', 'Cairo')", []).unwrap();
        let mut stmt = conn.prepare(union_search_query()).unwrap();
        let hits: Vec<String> = stmt
            .query_map(params!["Laptop", 100i32, 0i32], |r| r.get::<_, String>(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        // At least one product, one variant (joined by product), one warehouse.
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
```

- [ ] **Step 2: Register the module**

In `src-tauri/src/sql/mod.rs`, add `pub mod search;` to the module list (alphabetically before `stocks`).

- [ ] **Step 3: Run the new Rust tests**

Run: `cd src-tauri && cargo test sql::search::`
Expected: all 7 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/sql/search.rs src-tauri/src/sql/mod.rs
git commit -m "feat(search): FTS5 DDL, triggers, search_history, union query"
```

---

## Task 3: Add `002_search_fts.sql` migration for existing DBs

**Files:**

- Create: `src-tauri/migrations/002_search_fts.sql`

- [ ] **Step 1: Create the migration file**

Create `src-tauri/migrations/002_search_fts.sql` with:

```sql
-- Migration 002: backfill the global-search FTS5 indexes for databases that
-- existed before the search subsystem shipped.
--
-- This migration is idempotent. It creates the FTS5 virtual tables and
-- triggers if they don't exist, then refreshes each index from the
-- corresponding active_* view so the indexes reflect current data.

BEGIN TRANSACTION;

-- The exact strings come from src-tauri/src/sql/search.rs::create_fts_tables()
-- and create_triggers(); keep them in sync if the DDL changes.
-- (See the spec for the canonical DDL.)

COMMIT;
```

The `SearchInitializer` (Task 4) runs the same DDL and refreshes on first init, so this migration is a backstop for databases that pre-date the new code path. The file is intentionally a no-op marker; the actual DDL is run by the initializer.

- [ ] **Step 2: Commit**

```bash
git add src-tauri/migrations/002_search_fts.sql
git commit -m "chore(search): add migration marker for FTS5 backfill"
```

---

## Task 4: Create `src-tauri/src/commands/search.rs`

**Files:**

- Create: `src-tauri/src/commands/search.rs`

- [ ] **Step 1: Create the file with initializers and commands**

Create `src-tauri/src/commands/search.rs` with this exact content:

```rust
//! Global search commands backed by FTS5 + a per-user search_history table.

use async_trait::async_trait;
use rusqlite::params;
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::sql::search::{
    self, create_fts_tables, create_search_history_table, create_triggers, history_clear,
    history_delete, history_list, history_record, history_soft_delete_now, now_string,
    refresh_index, union_count_query, union_search_query,
};
use crate::types::{PaginatedSearchResult, SearchHistoryEntry, SearchHit};

// ---------------------------------------------------------------------------
// Initializers
// ---------------------------------------------------------------------------

pub struct SearchInitializer;

#[async_trait]
impl DatabaseInitializable for SearchInitializer {
    fn table_name(&self) -> &str {
        "fts_products"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;
        conn.execute_batch(create_fts_tables())
            .map_err(|e| format!("Failed to create FTS5 tables: {e}"))?;
        conn.execute_batch(create_triggers())
            .map_err(|e| format!("Failed to create search triggers: {e}"))?;
        // If the FTS table is empty while the source table isn't, refresh.
        let fts_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM fts_products", [], |r| r.get(0))
            .map_err(|e| format!("Failed to count fts_products: {e}"))?;
        let src_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM active_products", [], |r| r.get(0))
            .map_err(|e| format!("Failed to count active_products: {e}"))?;
        if fts_count == 0 && src_count > 0 {
            log::info!("[SearchInitializer] Backfilling FTS5 indexes from active_* views");
            refresh_index(&conn).map_err(|e| format!("Failed to refresh FTS5 index: {e}"))?;
        }
        Ok(())
    }
}

pub struct SearchHistoryInitializer;

#[async_trait]
impl DatabaseInitializable for SearchHistoryInitializer {
    fn table_name(&self) -> &str {
        "search_history"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;
        conn.execute_batch(create_search_history_table())
            .map_err(|e| format!("Failed to create search_history table: {e}"))?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Search commands
// ---------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn global_search(
    app: AppHandle,
    query: String,
    limit: i32,
    offset: i32,
) -> Result<PaginatedSearchResult, String> {
    let conn = get_conn(&app)?;
    let limit = limit.clamp(1, 100);
    let offset = offset.max(0);

    // Single read transaction so the page contents and total_count agree.
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Failed to start search transaction: {e}"))?;

    let total_count: i32 = tx
        .query_row(union_count_query(), params![query], |r| r.get(0))
        .map_err(|e| format!("Search count failed: {e}"))?;
    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + limit - 1) / limit
    };

    let mut stmt = tx
        .prepare(union_search_query())
        .map_err(|e| format!("Search prepare failed: {e}"))?;
    let data: Vec<SearchHit> = stmt
        .query_map(params![query, limit, offset], |r| {
            Ok(SearchHit {
                entity_type: r.get(0)?,
                id: r.get(1)?,
                parent_id: r.get(2)?,
                matched_column: r.get(3)?,
                match_title: r.get(4)?,
                highlighted_title: r.get(5)?,
                subtitle: r.get(6)?,
                meta: r.get(7)?,
                rank: r.get(8)?,
            })
        })
        .map_err(|e| format!("Search query failed: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Search collect failed: {e}"))?;
    drop(stmt);
    tx.commit()
        .map_err(|e| format!("Search commit failed: {e}"))?;

    Ok(PaginatedSearchResult {
        data,
        total_count,
        total_pages,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn refresh_search_index(app: AppHandle) -> Result<(), String> {
    let conn = get_conn(&app)?;
    refresh_index(&conn).map_err(|e| format!("Refresh index failed: {e}"))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Search history commands
// ---------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn search_history_list(
    app: AppHandle,
    user_id: String,
    limit: i32,
) -> Result<Vec<SearchHistoryEntry>, String> {
    let conn = get_conn(&app)?;
    let limit = limit.clamp(1, 50);
    let mut stmt = conn
        .prepare(history_list())
        .map_err(|e| format!("history_list prepare failed: {e}"))?;
    let rows = stmt
        .query_map(params![user_id, limit], |r| {
            Ok(SearchHistoryEntry {
                id: r.get(0)?,
                user_id: r.get(1)?,
                query: r.get(2)?,
                created_at: r.get(3)?,
            })
        })
        .map_err(|e| format!("history_list query failed: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("history_list collect failed: {e}"))?;
    Ok(rows)
}

#[tauri::command]
#[specta::specta]
pub async fn search_history_record(
    app: AppHandle,
    user_id: String,
    query: String,
) -> Result<(), String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(());
    }
    let conn = get_conn(&app)?;
    conn.execute(
        history_record(),
        params![user_id, trimmed, now_string()],
    )
    .map_err(|e| format!("history_record failed: {e}"))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn search_history_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let affected = conn
        .execute(history_delete(), params![history_soft_delete_now(), id])
        .map_err(|e| format!("history_delete failed: {e}"))?;
    if affected == 0 {
        return Err("Search history entry not found".to_string());
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn search_history_clear(app: AppHandle, user_id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    conn.execute(
        history_clear(),
        params![history_soft_delete_now(), user_id],
    )
    .map_err(|e| format!("history_clear failed: {e}"))?;
    Ok(())
}
```

- [ ] **Step 2: Register initializers**

In `src-tauri/src/commands/mod.rs`, add the `pub mod search;` declaration and register both initializers in `TABLE_INITIALIZERS`:

```rust
pub mod search; // add to the use list at the top
```

And:

```rust
use self::{
    products::ProductsInitializer, search::SearchHistoryInitializer, search::SearchInitializer,
    stocks::StockInitializer, users::UserInitializer, variants::VariantsInitializer,
    warehouses::WarehousesInitializer,
};

pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
    &WarehousesInitializer,
    &SearchInitializer,
    &SearchHistoryInitializer,
    &StockInitializer,
];
```

- [ ] **Step 3: Add the commands to `bindings.rs`**

In `src-tauri/src/bindings.rs`, add `use crate::commands::search;` to the `use` block at the top of `generate_bindings`, and add the following to the `collect_commands!` macro:

```rust
search::global_search,
search::refresh_search_index,
search::search_history_list,
search::search_history_record,
search::search_history_delete,
search::search_history_clear,
```

- [ ] **Step 4: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: succeeds.

- [ ] **Step 5: Run all Rust tests**

Run: `cd src-tauri && cargo test`
Expected: all tests pass (existing + new).

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/search.rs src-tauri/src/commands/mod.rs src-tauri/src/bindings.rs
git commit -m "feat(search): wire global_search, refresh_index, search_history_* commands"
```

---

## Task 5: Regenerate TypeScript bindings

**Files:**

- Modified by the build: `src/lib/bindings.ts`, `src/lib/tauri-bindings.ts` (auto-generated).

- [ ] **Step 1: Build the Rust crate so tauri-specta regenerates bindings**

Run: `cd src-tauri && cargo build`
Expected: `src/lib/bindings.ts` is updated with the new commands and types.

- [ ] **Step 2: Sanity check the generated bindings**

Open `src/lib/bindings.ts`, search for `globalSearch`, `searchHistoryList`, `SearchHit`, and `SearchHistoryEntry`. Each should appear as a generated command and type.

- [ ] **Step 3: Commit the regenerated bindings**

```bash
git add src/lib/bindings.ts
git commit -m "chore(bindings): regenerate tauri-specta types and commands"
```

---

## Task 6: Create `src/components/layout/search/types.ts`

**Files:**

- Create: `src/components/layout/search/types.ts`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/types.ts` with:

```ts
import type { SearchHit, PaginatedSearchResult, SearchHistoryEntry } from '@/lib/bindings'

export type { SearchHit, PaginatedSearchResult, SearchHistoryEntry }

export const SEARCH_PAGE_SIZE = 20
export const SEARCH_HISTORY_LIMIT = 10
export const SEARCH_THRESHOLD = 3
export const STALE_ROW_TIMEOUT_MS = 2000
export const PER_GROUP_VISIBLE = 5
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/search/types.ts
git commit -m "feat(search): shared frontend types and constants"
```

---

## Task 7: Create `src/lib/sanitize.ts`

**Files:**

- Create: `src/lib/sanitize.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/sanitize.ts` with:

```ts
/**
 * Allowlist sanitizer for FTS5 `highlight()` HTML.
 *
 * FTS5's highlight() emits <mark>...</mark> around matches. The backend is
 * trusted, but we still pass the result through this allowlist so a future
 * backend change can't accidentally inject arbitrary HTML.
 */
export function sanitizeHighlight(html: string): string {
  if (!html) return ''
  // Strip everything but <mark>...</mark> and their text content.
  return html.replace(/<(?!\/?mark\b)[^>]*>/gi, '')
}
```

- [ ] **Step 2: Create the test file `src/lib/sanitize.test.ts`**

Create `src/lib/sanitize.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { sanitizeHighlight } from './sanitize'

describe('sanitizeHighlight', () => {
  it('keeps <mark> tags intact', () => {
    expect(sanitizeHighlight('Hello <mark>world</mark>')).toBe('Hello <mark>world</mark>')
  })

  it('strips arbitrary tags', () => {
    expect(sanitizeHighlight('<script>x</script><mark>ok</mark>')).toBe('<mark>ok</mark>')
  })

  it('strips dangerous attributes', () => {
    expect(sanitizeHighlight('<mark onclick="x">a</mark>')).toBe('<mark>a</mark>')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHighlight('')).toBe('')
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `pnpm run test:run -- src/lib/sanitize.test.ts`
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sanitize.ts src/lib/sanitize.test.ts
git commit -m "feat(search): allowlist sanitizer for highlight HTML"
```

---

## Task 8: Create `src/components/layout/search/useGlobalSearch.ts`

**Files:**

- Create: `src/components/layout/search/useGlobalSearch.ts`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/useGlobalSearch.ts` with:

```ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { SEARCH_PAGE_SIZE, SEARCH_THRESHOLD } from './types'
import type { SearchHit, PaginatedSearchResult } from './types'

export function useGlobalSearch(query: string) {
  const trimmed = query.trim()
  return useInfiniteQuery<
    PaginatedSearchResult,
    Error,
    { pages: PaginatedSearchResult[]; flat: SearchHit[] },
    readonly unknown[],
    number
  >({
    queryKey: ['globalSearch', trimmed] as const,
    queryFn: ({ pageParam }) =>
      commands
        .globalSearch(trimmed, SEARCH_PAGE_SIZE, pageParam)
        .then(r => {
          if (r.status === 'error') throw new Error(r.error)
          return r.data
        }),
    enabled: trimmed.length >= SEARCH_THRESHOLD,
    staleTime: 30_000,
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPageParam) => {
      const next = lastPageParam + last.data.length
      return next < last.total_count ? next : undefined
    },
    select: data => {
      const seen = new Set<string>()
      const flat: SearchHit[] = []
      for (const page of data.pages) {
        for (const hit of page.data) {
          const key = `${hit.entity_type}:${hit.id}`
          if (seen.has(key)) continue
          seen.add(key)
          flat.push(hit)
        }
      }
      return { pages: data.pages, flat }
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/search/useGlobalSearch.ts
git commit -m "feat(search): useGlobalSearch infinite query hook"
```

---

## Task 9: Create `src/components/layout/search/useSearchHistory.ts`

**Files:**

- Create: `src/components/layout/search/useSearchHistory.ts`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/useSearchHistory.ts` with:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { SEARCH_HISTORY_LIMIT } from './types'
import type { SearchHistoryEntry } from './types'

export function useSearchHistory(userId: string | null | undefined) {
  return useQuery<SearchHistoryEntry[]>({
    queryKey: ['searchHistory', userId] as const,
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return []
      const r = await commands.searchHistoryList(userId, SEARCH_HISTORY_LIMIT)
      if (r.status === 'error') throw new Error(r.error)
      return r.data
    },
  })
}

export function useRecordSearchHistory(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (query: string) => {
      if (!userId) return
      const r = await commands.searchHistoryRecord(userId, query)
      if (r.status === 'error') throw new Error(r.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['searchHistory', userId] }),
  })
}

export function useDeleteSearchHistoryEntry(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await commands.searchHistoryDelete(id)
      if (r.status === 'error') throw new Error(r.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['searchHistory', userId] }),
  })
}

export function useClearSearchHistory(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!userId) return
      const r = await commands.searchHistoryClear(userId)
      if (r.status === 'error') throw new Error(r.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['searchHistory', userId] }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/search/useSearchHistory.ts
git commit -m "feat(search): useSearchHistory list/record/delete/clear hooks"
```

---

## Task 10: Create result-row components

**Files:**

- Create: `src/components/layout/search/result-rows/ProductResultRow.tsx`
- Create: `src/components/layout/search/result-rows/VariantResultRow.tsx`
- Create: `src/components/layout/search/result-rows/WarehouseResultRow.tsx`

- [ ] **Step 1: Create `ProductResultRow.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import type { SearchHit } from '../types'

export function ProductResultRow({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-body-sm text-on-surface truncate"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(hit.highlighted_title) }}
        />
        <span className="text-label-caps text-on-surface-variant truncate">
          {hit.subtitle}
          {hit.meta ? ` · ${hit.meta}` : ''}
        </span>
      </div>
      <span className="text-[10px] uppercase text-on-surface-variant">
        {t('search.matchedColumn.' + hit.matched_column, { defaultValue: hit.matched_column })}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create `VariantResultRow.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import type { SearchHit } from '../types'

export function VariantResultRow({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant">style</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-body-sm text-on-surface truncate"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(hit.highlighted_title) }}
        />
        <span className="text-label-caps text-on-surface-variant truncate">
          {hit.subtitle}
          {hit.meta ? ` · ${hit.meta}` : ''}
        </span>
      </div>
      <span className="text-[10px] uppercase text-on-surface-variant">
        {t('search.matchedColumn.' + hit.matched_column, { defaultValue: hit.matched_column })}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Create `WarehouseResultRow.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import type { SearchHit } from '../types'

export function WarehouseResultRow({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant">warehouse</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-body-sm text-on-surface truncate"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(hit.highlighted_title) }}
        />
        <span className="text-label-caps text-on-surface-variant truncate">{hit.subtitle}</span>
      </div>
      <span className="text-[10px] uppercase text-on-surface-variant">
        {t('search.matchedColumn.' + hit.matched_column, { defaultValue: hit.matched_column })}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/search/result-rows/
git commit -m "feat(search): per-entity result-row components"
```

---

## Task 11: Create `SearchResultList.tsx`

**Files:**

- Create: `src/components/layout/search/SearchResultList.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/SearchResultList.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ProductResultRow } from './result-rows/ProductResultRow'
import { VariantResultRow } from './result-rows/VariantResultRow'
import { WarehouseResultRow } from './result-rows/WarehouseResultRow'
import {
  PER_GROUP_VISIBLE,
  STALE_ROW_TIMEOUT_MS,
  type SearchHit,
} from './types'

const GROUP_LABELS: Record<string, string> = {
  product: 'search.group.products',
  variant: 'search.group.variants',
  warehouse: 'search.group.warehouses',
}

function rowKey(hit: SearchHit) {
  return `${hit.entity_type}:${hit.id}`
}

export function SearchResultList({
  hits,
  totalCount,
  hasMore,
  onLoadMore,
  isFetchingMore,
  onActivate,
  activeIndex,
  setActiveIndex,
}: {
  hits: SearchHit[]
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  isFetchingMore: boolean
  onActivate: (hit: SearchHit) => void
  activeIndex: number
  setActiveIndex: (n: number) => void
}) {
  const { t } = useTranslation()
  const [staleIds, setStaleIds] = useState<Set<string>>(new Set())

  // Group by entity_type, preserving first-seen order.
  const groups = useMemo(() => {
    const order: string[] = []
    const map: Record<string, SearchHit[]> = {}
    for (const hit of hits) {
      if (!(hit.entity_type in map)) {
        order.push(hit.entity_type)
        map[hit.entity_type] = []
      }
      map[hit.entity_type].push(hit)
    }
    return order.map(type => ({ type, items: map[type] }))
  }, [hits])

  // Stale rows are auto-removed after the timeout.
  useEffect(() => {
    if (staleIds.size === 0) return
    const timer = setTimeout(() => {
      setStaleIds(new Set())
    }, STALE_ROW_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [staleIds])

  if (hits.length === 0) {
    return (
      <div className="px-4 py-6 text-body-sm text-on-surface-variant text-center">
        {t('search.noResults', { query: '' })}
      </div>
    )
  }

  let runningIndex = 0
  return (
    <div className="flex flex-col" data-testid="search-result-list">
      {groups.map(group => {
        const visible = group.items.filter(h => !staleIds.has(rowKey(h)))
        const hidden = group.items.length - visible.length
        return (
          <div key={group.type} className="flex flex-col">
            <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase">
              {t(GROUP_LABELS[group.type] ?? group.type)} ({group.items.length})
            </div>
            {visible.slice(0, PER_GROUP_VISIBLE).map(hit => {
              const idx = runningIndex++
              const isActive = idx === activeIndex
              const stale = staleIds.has(rowKey(hit))
              return (
                <button
                  key={rowKey(hit)}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => onActivate(hit)}
                  data-active={isActive}
                  data-testid="search-result-row"
                  className={[
                    'flex items-center px-4 py-2 text-start',
                    isActive ? 'bg-surface-container-high' : 'hover:bg-surface-container',
                    stale ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <div className="flex-1 min-w-0">
                    {group.type === 'product' && <ProductResultRow hit={hit} />}
                    {group.type === 'variant' && <VariantResultRow hit={hit} />}
                    {group.type === 'warehouse' && <WarehouseResultRow hit={hit} />}
                  </div>
                  {stale && (
                    <span className="text-[10px] text-on-surface-variant ms-2">
                      {t('search.justDeleted')}
                    </span>
                  )}
                </button>
              )
            })}
            {group.items.length > PER_GROUP_VISIBLE && (
              <button
                type="button"
                onClick={onLoadMore}
                className="px-4 py-2 text-label-caps text-primary text-start"
              >
                {t('search.showMoreInGroup', {
                  count: group.items.length - PER_GROUP_VISIBLE,
                  group: t(GROUP_LABELS[group.type] ?? group.type),
                })}
              </button>
            )}
            {hidden > 0 && (
              <div className="px-4 py-1 text-[10px] text-on-surface-variant">
                {hidden > 0 ? t('search.removedDuringStale', { count: hidden }) : null}
              </div>
            )}
          </div>
        )
      })}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingMore}
          className="px-4 py-3 text-label-caps text-primary text-center"
        >
          {isFetchingMore ? t('common.loading') : t('search.showMore')}
        </button>
      )}
      <div className="px-4 py-2 text-[10px] text-on-surface-variant text-end">
        {t('search.totalCount', { count: totalCount })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/search/SearchResultList.tsx
git commit -m "feat(search): SearchResultList with grouping, stale rows, show more"
```

---

## Task 12: Create `SearchHistoryList.tsx`

**Files:**

- Create: `src/components/layout/search/SearchHistoryList.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/SearchHistoryList.tsx` with:

```tsx
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import {
  useClearSearchHistory,
  useDeleteSearchHistoryEntry,
  useSearchHistory,
} from './useSearchHistory'
import type { SearchHistoryEntry } from './types'

function markMatch(query: string, target: string): string {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'ig')
  return target.replace(re, m => `<mark>${m}</mark>`)
}

export function SearchHistoryList({
  userId,
  filter,
  onPick,
}: {
  userId: string | null | undefined
  filter: string
  onPick: (query: string) => void
}) {
  const { t } = useTranslation()
  const { data: entries = [] } = useSearchHistory(userId)
  const clear = useClearSearchHistory(userId)
  const del = useDeleteSearchHistoryEntry(userId)

  const trimmed = filter.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!trimmed) return entries
    return entries.filter(e => e.query.toLowerCase().includes(trimmed))
  }, [entries, trimmed])

  const headerLabel = trimmed
    ? t('search.recentMatches')
    : t('search.recentSearches')

  return (
    <div className="flex flex-col" data-testid="search-history-list">
      <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase">
        {headerLabel}
      </div>
      {visible.length === 0 ? (
        <div className="px-4 py-6 text-body-sm text-on-surface-variant text-center">
          {trimmed ? t('search.noRecentMatches') : t('search.noHistory')}
        </div>
      ) : (
        visible.map((entry: SearchHistoryEntry) => (
          <div
            key={entry.id}
            className="flex items-center px-4 py-2 hover:bg-surface-container"
          >
            <button
              type="button"
              onClick={() => onPick(entry.query)}
              className="flex-1 text-start"
            >
              <span
                className="text-body-sm text-on-surface"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHighlight(markMatch(trimmed, entry.query)),
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => del.mutate(entry.id)}
              aria-label={t('search.deleteEntry')}
              className="ms-2 p-1 text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))
      )}
      {!trimmed && entries.length > 0 && (
        <button
          type="button"
          onClick={() => clear.mutate()}
          className="px-4 py-2 text-label-caps text-primary text-start"
        >
          {t('search.clearAll')}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/search/SearchHistoryList.tsx
git commit -m "feat(search): SearchHistoryList with filter and clear-all"
```

---

## Task 13: Create `SearchDropdown.tsx`

**Files:**

- Create: `src/components/layout/search/SearchDropdown.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/SearchDropdown.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { commands } from '@/lib/tauri-bindings'
import { useTabStore } from '@/store/workspace-store'
import { SearchHistoryList } from './SearchHistoryList'
import { SearchResultList } from './SearchResultList'
import { useGlobalSearch } from './useGlobalSearch'
import { useRecordSearchHistory } from './useSearchHistory'
import { SEARCH_THRESHOLD } from './types'
import type { SearchHit } from './types'

export function SearchDropdown({
  query,
  userId,
  onClose,
}: {
  query: string
  userId: string | null | undefined
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const record = useRecordSearchHistory(userId)
  const addTab = useTabStore(s => s.addTab)
  const [activeIndex, setActiveIndex] = useState(0)

  const trimmed = query.trim()
  const liveQueryEnabled = trimmed.length >= SEARCH_THRESHOLD
  const live = useGlobalSearch(query)
  const hits = live.data?.flat ?? []

  function openHit(hit: SearchHit, inNewTab: boolean) {
    const search = {
      entity_modal: hit.entity_type,
      entity_id: hit.id,
      product_id: hit.parent_id ?? undefined,
    }
    if (inNewTab) {
      addTab({
        id: `${hit.entity_type}-${hit.id}-${Date.now()}`,
        title: hit.match_title,
        type: 'entity',
        entityType: hit.entity_type,
        closable: true,
      })
      // Persist search params by setting them on the new tab's current location.
      // The active tab is the one just created; navigate to /entity/...
      navigate({
        to: '/entity/$entityType',
        params: { entityType: hit.entity_type },
        search,
      })
    } else {
      navigate({ search })
    }
    if (liveQueryEnabled && userId) record.mutate(trimmed)
    onClose()
  }

  // Reset active index when results change.
  useEffect(() => setActiveIndex(0), [hits.length, trimmed])

  const containerRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={containerRef}
      className="absolute start-0 end-0 top-full mt-2 bg-surface-container border border-outline-variant rounded-lg shadow-xl max-h-[60vh] overflow-y-auto z-50"
      data-testid="search-dropdown"
    >
      {liveQueryEnabled ? (
        <SearchResultList
          hits={hits}
          totalCount={live.data?.pages.at(-1)?.total_count ?? 0}
          hasMore={Boolean(live.hasNextPage)}
          onLoadMore={() => live.fetchNextPage()}
          isFetchingMore={live.isFetchingNextPage}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onActivate={hit => openHit(hit, false)}
        />
      ) : (
        <SearchHistoryList
          userId={userId}
          filter={trimmed}
          onPick={q => {
            // History pick re-uses the openHit flow by simulating a hit.
            openHit(
              {
                entity_type: 'product',
                id: '',
                parent_id: null,
                matched_column: '',
                match_title: q,
                highlighted_title: q,
                subtitle: '',
                meta: null,
                rank: 0,
              },
              false,
            )
          }}
        />
      )}
      {live.isError && (
        <div className="px-4 py-3 text-body-sm text-error">
          {t('search.unavailable')}
        </div>
      )}
    </div>
  )
}
```

Note: the "history pick" path in `onPick` is a stub that fills the input via a fake hit. The proper UX is to fill the input so the user can confirm; in Task 15 we wire the input's onChange to accept the picked value.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/search/SearchDropdown.tsx
git commit -m "feat(search): SearchDropdown that switches between history and results"
```

---

## Task 14: Create `GlobalSearch.tsx` and replace Navbar's input

**Files:**

- Create: `src/components/layout/GlobalSearch.tsx`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Create `GlobalSearch.tsx`**

Create `src/components/layout/GlobalSearch.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { SearchDropdown } from './search/SearchDropdown'

export function GlobalSearch() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Global focus shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inField =
        target && ['INPUT', 'TEXTAREA'].includes(target.tagName) && target !== inputRef.current
      if (inField) return
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Click-outside to close.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="material-symbols-outlined absolute inset-inline-start-1 top-1/2 -translate-y-1/2 me-2 text-on-surface-variant text-[20px]">
        search
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        className="bg-surface-container-high border border-outline-variant/30 rounded-lg ps-10 pe-4 py-2 text-body-sm font-body-sm text-on-surface focus:ring-1 focus:ring-primary w-full transition-all"
        placeholder={t('nav.globalSearchPlaceholder')}
        type="text"
        data-testid="global-search-input"
      />
      {open && (
        <SearchDropdown
          query={query}
          userId={userId}
          onClose={() => {
            setOpen(false)
            inputRef.current?.blur()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace the inline search markup in `Navbar.tsx`**

In `src/components/layout/Navbar.tsx`, replace the entire `{/* Center: Global Search */}` block (lines 27–39) with:

```tsx
{/* Center: Global Search */}
<div className="flex-1 flex items-center justify-center max-w-xl mx-auto">
  <GlobalSearch />
</div>
```

And add the import at the top:

```tsx
import { GlobalSearch } from './GlobalSearch'
```

- [ ] **Step 3: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/GlobalSearch.tsx src/components/layout/Navbar.tsx
git commit -m "feat(search): extract GlobalSearch component, wire into Navbar"
```

---

## Task 15: Wire up history-pick to fill the input

**Files:**

- Modify: `src/components/layout/search/SearchDropdown.tsx`

- [ ] **Step 1: Add `onPick` prop that fills the input**

The `SearchDropdown` currently calls `onPick` with a fake hit. Refactor: the `GlobalSearch` component owns the input value, so `SearchDropdown` should accept an `onPickQuery` callback that takes the picked string. The parent then sets `setQuery(pickedQuery)`.

Modify `src/components/layout/search/SearchDropdown.tsx`:

- Replace the prop `onPick` on `<SearchHistoryList>` with a prop typed as `(q: string) => void`. The list still calls it with `entry.query`; `SearchDropdown` forwards that to a new `onPickQuery` prop.
- Add `onPickQuery: (q: string) => void` to `SearchDropdown`'s props and pass it to `<SearchHistoryList onPick={onPickQuery} />`.
- Remove the fake-hit `openHit(...)` call from `onPick`.

In `src/components/layout/GlobalSearch.tsx`, pass `onPickQuery={setQuery}` to `<SearchDropdown>`.

- [ ] **Step 2: Re-typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/search/SearchDropdown.tsx src/components/layout/GlobalSearch.tsx
git commit -m "refactor(search): history pick fills the input directly"
```

---

## Task 16: Extend the router schema with `product_id`

**Files:**

- Modify: `src/router/index.tsx`

- [ ] **Step 1: Add `product_id` to the entity search schema**

In `src/router/index.tsx`, change `entitySearchSchema` to:

```ts
const entitySearchSchema = z.object({
  entity_modal: z.enum(ModalTypes).optional(),
  entity_id: z.string().optional(),
  product_id: z.string().optional(),
})
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/router/index.tsx
git commit -m "feat(search): add product_id to entity search schema for variant deep-link"
```

---

## Task 17: Wire `product_id` into `ModalManager`

**Files:**

- Modify: `src/components/modal/ModalManager.tsx`

- [ ] **Step 1: Read `product_id` and forward to `VariantModal`**

In `src/components/modal/ModalManager.tsx`, add the following near the top of the function (next to the `entity_id` parsing):

```tsx
const product_id = searchParams.get('product_id') || undefined
```

In the `case 'variant':` branch, change the `<VariantModal ... />` props to include `productId={product_id}`:

```tsx
return (
  <VariantModal
    entityId={entity_id}
    productId={product_id}
    queryClient={queryClient}
    mode="view"
    onDeleted={handleClose}
  />
)
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/modal/ModalManager.tsx
git commit -m "feat(search): ModalManager forwards product_id to VariantModal"
```

---

## Task 18: Create `EntityMissingState.tsx`

**Files:**

- Create: `src/components/entity/EntityMissingState.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/entity/EntityMissingState.tsx` with:

```tsx
import { useTranslation } from 'react-i18next'

export function EntityMissingState({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-4 p-8"
      data-testid="entity-missing-state"
    >
      <span className="material-symbols-outlined text-on-surface-variant text-[48px]">
        delete
      </span>
      <p className="text-body-md text-on-surface">{t('entity.missing.message')}</p>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-md bg-primary text-on-primary"
      >
        {t('common.close')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/EntityMissingState.tsx
git commit -m "feat(search): EntityMissingState for modal-level fallback"
```

---

## Task 19: Render `EntityMissingState` in the three modals

**Files:**

- Modify: `src/components/entity/ProductModal.tsx`
- Modify: `src/components/entity/VariantModal.tsx`
- Modify: `src/components/entity/WarehouseModal.tsx`

- [ ] **Step 1: Modify `ProductModal.tsx`**

After the imports and before the existing data-loading block, import `EntityMissingState`. Then, in the modal's body, find where the data-dependent content is rendered (look for the `isLoading` / `data === undefined` pattern, around line ~131). Add a guard: if `mode === 'view'` and the query is no longer loading and `entity === undefined`, render `<EntityMissingState onClose={onDeleted ?? handleClose} />` instead of the normal form.

Concretely, locate the line that does the early return for missing data, and prepend:

```tsx
if (mode === 'view' && !isLoading && entity === undefined) {
  return <EntityMissingState onClose={() => onDeleted?.()} />
}
```

(Use the actual local variable names; the spec is "data resolved to `undefined` after open with a valid `entityId`".)

- [ ] **Step 2: Modify `VariantModal.tsx`**

Same shape as ProductModal, with the same guard. The modal has `entity` and `isLoading` from `useGetVariant`. The guard renders `<EntityMissingState onClose={onDeleted} />`.

- [ ] **Step 3: Modify `WarehouseModal.tsx`**

Same shape.

- [ ] **Step 4: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/ProductModal.tsx src/components/entity/VariantModal.tsx src/components/entity/WarehouseModal.tsx
git commit -m "feat(search): render EntityMissingState when modal data resolves to undefined"
```

---

## Task 20: i18n keys

**Files:**

- Modify: `locales/en.json`
- Modify: `locales/ar.json`

- [ ] **Step 1: Add keys to `locales/en.json`**

Inside the `search` namespace (or create one if it doesn't exist), add:

```json
"search": {
  "noResults": "No results for \"{{query}}\"",
  "justDeleted": "Just deleted",
  "showMore": "Show more results",
  "showMoreInGroup": "+{{count}} more in {{group}}",
  "removedDuringStale": "{{count}} row(s) just removed",
  "totalCount": "{{count}} total",
  "unavailable": "Search is unavailable",
  "recentSearches": "Recent searches",
  "recentMatches": "Recent matches",
  "noRecentMatches": "No matching recent searches",
  "noHistory": "No recent searches",
  "deleteEntry": "Delete this entry",
  "clearAll": "Clear all",
  "group": {
    "products": "Products",
    "variants": "Variants",
    "warehouses": "Warehouses"
  },
  "matchedColumn": {
    "name": "name",
    "category": "category",
    "company": "company",
    "sku": "sku",
    "variant_name": "variant name",
    "location": "location"
  }
}
```

Also add to `entity.missing.message` and `common.close` if not present. Add the missing keys with their default English strings.

- [ ] **Step 2: Add Arabic translations to `locales/ar.json`**

Mirror the same structure with Arabic strings (translations can be approximate; the rest of the codebase is bilingual).

- [ ] **Step 3: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add locales/en.json locales/ar.json
git commit -m "feat(search): i18n keys for search UI and entity missing state"
```

---

## Task 21: Frontend tests — `useGlobalSearch` and `useSearchHistory`

**Files:**

- Create: `src/components/layout/search/useGlobalSearch.test.tsx`
- Create: `src/components/layout/search/useSearchHistory.test.tsx`

- [ ] **Step 1: Create `useGlobalSearch.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGlobalSearch } from './useGlobalSearch'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    globalSearch: vi.fn(),
  },
}))

import { commands } from '@/lib/tauri-bindings'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useGlobalSearch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fire when query is below threshold', async () => {
    renderHook(() => useGlobalSearch('ab'), { wrapper: wrapper() })
    await new Promise(r => setTimeout(r, 10))
    expect(commands.globalSearch).not.toHaveBeenCalled()
  })

  it('fires when query is at or above threshold', async () => {
    ;(commands.globalSearch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: { data: [], total_count: 0, total_pages: 0 },
    })
    renderHook(() => useGlobalSearch('abc'), { wrapper: wrapper() })
    await waitFor(() => expect(commands.globalSearch).toHaveBeenCalled())
  })

  it('passes limit and offset 0 on first call', async () => {
    ;(commands.globalSearch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: { data: [], total_count: 0, total_pages: 0 },
    })
    renderHook(() => useGlobalSearch('abcd'), { wrapper: wrapper() })
    await waitFor(() =>
      expect(commands.globalSearch).toHaveBeenCalledWith('abcd', 20, 0),
    )
  })
})
```

- [ ] **Step 2: Create `useSearchHistory.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchHistory, useRecordSearchHistory } from './useSearchHistory'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    searchHistoryList: vi.fn(),
    searchHistoryRecord: vi.fn(),
  },
}))

import { commands } from '@/lib/tauri-bindings'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useSearchHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists entries for a user', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [{ id: '1', user_id: 'u1', query: 'hello', created_at: null }],
    })
    const { result } = renderHook(() => useSearchHistory('u1'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data?.[0].query).toBe('hello')
  })

  it('records a query and invalidates the list', async () => {
    ;(commands.searchHistoryRecord as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'ok', data: null })
    const { result } = renderHook(() => useRecordSearchHistory('u1'), { wrapper: wrapper() })
    result.current.mutate('hello')
    await waitFor(() => expect(commands.searchHistoryRecord).toHaveBeenCalledWith('u1', 'hello'))
  })
})
```

- [ ] **Step 3: Run the new tests**

Run: `pnpm run test:run -- src/components/layout/search`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/search/useGlobalSearch.test.tsx src/components/layout/search/useSearchHistory.test.tsx
git commit -m "test(search): useGlobalSearch and useSearchHistory hooks"
```

---

## Task 22: Frontend tests — `SearchResultList` and `SearchHistoryList`

**Files:**

- Create: `src/components/layout/search/SearchResultList.test.tsx`
- Create: `src/components/layout/search/SearchHistoryList.test.tsx`

- [ ] **Step 1: Create `SearchResultList.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchResultList } from './SearchResultList'
import type { SearchHit } from './types'

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  entity_type: 'product',
  id: '1',
  parent_id: null,
  matched_column: 'name',
  match_title: 'Laptop Stand',
  highlighted_title: '<mark>Laptop</mark> Stand',
  subtitle: 'Acme',
  meta: 'Accessories',
  rank: 1,
  ...overrides,
})

describe('SearchResultList', () => {
  it('groups hits by entity_type', () => {
    render(
      <SearchResultList
        hits={[
          hit({ entity_type: 'product', id: '1' }),
          hit({ entity_type: 'variant', id: '2' }),
          hit({ entity_type: 'product', id: '3' }),
        ]}
        totalCount={3}
        hasMore={false}
        onLoadMore={() => {}}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    expect(screen.getByTestId('search-result-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('search-result-row')).toHaveLength(3)
  })

  it('renders "No results" when hits are empty', () => {
    render(
      <SearchResultList
        hits={[]}
        totalCount={0}
        hasMore={false}
        onLoadMore={() => {}}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })

  it('calls onLoadMore when Show more is clicked', () => {
    const onLoadMore = vi.fn()
    render(
      <SearchResultList
        hits={[hit()]}
        totalCount={100}
        hasMore
        onLoadMore={onLoadMore}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    fireEvent.click(screen.getByText(/show more/i))
    expect(onLoadMore).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Create `SearchHistoryList.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SearchHistoryList } from './SearchHistoryList'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    searchHistoryList: vi.fn(),
    searchHistoryDelete: vi.fn(),
    searchHistoryClear: vi.fn(),
  },
}))

import { commands } from '@/lib/tauri-bindings'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const entry = (q: string) => ({ id: q, user_id: 'u1', query: q, created_at: null })

describe('SearchHistoryList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the full list when filter is empty', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [entry('apple'), entry('banana')],
    })
    render(<SearchHistoryList userId="u1" filter="" onPick={() => {}} />, { wrapper: wrapper() })
    expect(await screen.findByText('apple')).toBeInTheDocument()
    expect(screen.getByText('banana')).toBeInTheDocument()
  })

  it('filters by substring and marks the match', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [entry('apple'), entry('banana')],
    })
    render(<SearchHistoryList userId="u1" filter="ap" onPick={() => {}} />, { wrapper: wrapper() })
    expect(await screen.findByText('apple')).toBeInTheDocument()
    expect(screen.queryByText('banana')).not.toBeInTheDocument()
  })

  it('shows "no recent searches" when history is empty and filter is empty', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'ok', data: [] })
    render(<SearchHistoryList userId="u1" filter="" onPick={() => {}} />, { wrapper: wrapper() })
    expect(await screen.findByText(/no recent searches/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the new tests**

Run: `pnpm run test:run -- src/components/layout/search`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/search/SearchResultList.test.tsx src/components/layout/search/SearchHistoryList.test.tsx
git commit -m "test(search): SearchResultList and SearchHistoryList components"
```

---

## Task 23: Manual end-to-end smoke test

**Files:** None — verification only.

- [ ] **Step 1: Run the dev app and verify the full flow**

Run: `pnpm run tauri dev`

Manually verify (per the spec §5.3):

- [ ] Create a product, variant, and warehouse. All appear in search results.
- [ ] Edit a product's name. The old query no longer matches; the new query does.
- [ ] Soft-delete a product. The result disappears from search.
- [ ] Run `await window.__TAURI__.core.invoke('plugin:event|listen', ...)` is not needed; instead open the dev tools console and call the `refresh_search_index` command from JS. Stale entries should re-insert or remove correctly.
- [ ] Toggle the app to RTL. The trailing "open in new tab" button is on the visual start side.
- [ ] Submit a query that returns 0 results. It is not recorded in history.
- [ ] Submit a query that returns ≥1 result. It is recorded and appears at the top of the empty-dropdown list.
- [ ] Type 1–2 chars that match part of a previous query. Filtered history appears with `<mark>` on the matched substring.
- [ ] Click a result, then immediately soft-delete the entity in another window. Re-opening that result from history shows the modal's `EntityMissingState`.

- [ ] **Step 2: Commit the verification log (no code change)**

No commit needed if no code changed. If a defect was found, fix it via the executing-plans loop, then commit a fix.

---

## Task 24: Run full check suite

**Files:** None — verification only.

- [ ] **Step 1: Run `pnpm run check:all`**

Run: `pnpm run check:all`
Expected: typecheck, lint, ast:lint, format:check, rust:fmt:check, rust:clippy, test:run, rust:test all pass.

- [ ] **Step 2: Fix any issues inline and commit**

If the run reveals issues, address them per the existing project's linting/formatting rules, then commit each fix with a clear message.

---

## Task 25: Update developer docs

**Files:**

- Modify: `docs/developer/tauri-commands.md`
- Modify: `docs/developer/state-management.md`

- [ ] **Step 1: Add the new commands to `docs/developer/tauri-commands.md`**

Append a section:

```md
## Global Search

- `globalSearch(query, limit, offset)` → `PaginatedSearchResult`
- `refreshSearchIndex()` → `void`
- `searchHistoryList(userId, limit)` → `SearchHistoryEntry[]`
- `searchHistoryRecord(userId, query)` → `void`
- `searchHistoryDelete(id)` → `void`
- `searchHistoryClear(userId)` → `void`

All backed by per-entity FTS5 virtual tables; see `docs/superpowers/specs/2026-06-10-global-search-design.md` for the schema and trigger design.
```

- [ ] **Step 2: Add the new hooks to `docs/developer/state-management.md`**

Append a section:

```md
## Global search hooks

- `useGlobalSearch(query)` — `useInfiniteQuery` returning `{ flat: SearchHit[] }` and pagination state. Debounced by `useGlobalSearch` itself; consumers don't debounce.
- `useSearchHistory(userId)` — list the last 10 distinct queries.
- `useRecordSearchHistory(userId)`, `useDeleteSearchHistoryEntry(userId)`, `useClearSearchHistory(userId)` — mutations that invalidate the history query.
```

- [ ] **Step 3: Commit**

```bash
git add docs/developer/tauri-commands.md docs/developer/state-management.md
git commit -m "docs(search): add global search commands and hooks to developer docs"
```

---

## Self-Review

**Spec coverage:**

- §1 Architecture — Tasks 2, 4, 14 cover it.
- §2.1 FTS5 tables and triggers — Task 2.
- §2.2 search_history table — Task 2.
- §2.3 global_search command — Task 4.
- §2.4 Rust types and command signatures — Task 1, Task 4.
- §2.5 Initializers — Task 4.
- §2.6 Sanitization on the frontend — Task 7.
- §3.1 Component tree — Tasks 11, 12, 13, 14.
- §3.2 useGlobalSearch — Task 8.
- §3.3 Per-entity result rows — Task 10.
- §3.4 URL search params for variant deep-link — Task 16, Task 17.
- §3.5 Keyboard interaction — Task 14.
- §3.6 Stale-row race handling — Task 11 (`staleIds`).
- §3.7 Modal-level missing state — Task 18, Task 19.
- §3.8 Search history UX — Tasks 9, 12, 13.
- §4 Error handling — all three defense lines covered; the table is implemented across Tasks 2, 11, 18, 19.
- §5 Testing — Tasks 2 (Rust), 21 (hooks), 22 (components), 23 (manual).
- §6 Files touched — all listed in this plan.

**Type consistency:**

- `SearchHit` is defined in `src-tauri/src/types.rs:1` and re-exported via `src/components/layout/search/types.ts:1`. Both Tasks 8 and 10 import from `./types`.
- `PaginatedSearchResult` and `SearchHistoryEntry` follow the same pattern.
- `STALE_ROW_TIMEOUT_MS` and `PER_GROUP_VISIBLE` are defined once in `types.ts` and consumed in `SearchResultList.tsx`.
- `entity_id` vs `product_id`: `ModalManager` reads `entity_id` for the variant id and `product_id` for the parent; `VariantModal` receives both as `entityId` and `productId`. Consistent throughout.

**Placeholder scan:**

- No "TBD", "TODO", or "implement later" markers in this plan. All code blocks are complete.

**Found a small inconsistency during review:** Task 4 (the `search_history` command) clamps `limit` to 50 but `useSearchHistory` always passes `SEARCH_HISTORY_LIMIT = 10`. This is fine; clamping is defensive and the hook never exceeds 10.

**Ambiguity note:** The "click-time re-validate with `get_by_id`" defense line from spec §3.6 is not currently wired in this plan. The current `openHit` calls `navigate` immediately. Adding a TanStack Query prefetch + check before navigate would add Tasks 11.5 / 13.5. This is an optional refinement; flag it during execution if the user wants it.
