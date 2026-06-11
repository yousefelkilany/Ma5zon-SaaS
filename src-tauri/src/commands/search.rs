//! Global search commands backed by FTS5 + a per-user search_history table.

use async_trait::async_trait;
use rusqlite::params;
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::DatabaseInitializable;
use crate::sql::search::{
    self, build_fts_query, column_query, create_fts_tables, create_search_history_table,
    create_triggers, history_clear, history_delete, history_list, history_record,
    history_soft_delete_now, now_string, refresh_index, union_count_query, union_search_query,
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

    let fts_query = match build_fts_query(&query) {
        Some(q) => q,
        None => {
            return Ok(PaginatedSearchResult {
                data: vec![],
                total_count: 0,
                total_pages: 0,
            });
        }
    };

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Failed to start search transaction: {e}"))?;

    let total_count: i32 = tx
        .query_row(union_count_query(), params![fts_query], |r| r.get(0))
        .map_err(|e| format!("Search count failed: {e}"))?;

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + limit - 1) / limit
    };

    let mut stmt = tx
        .prepare(&union_search_query())
        .map_err(|e| format!("Search prepare failed: {e}"))?;

    let data: Vec<SearchHit> = stmt
        .query_map(
            params![
                fts_query,
                column_query("name", &fts_query),
                column_query("category", &fts_query),
                column_query("company", &fts_query),
                fts_query,
                column_query("sku", &fts_query),
                column_query("variant_name", &fts_query),
                fts_query,
                column_query("name", &fts_query),
                column_query("location", &fts_query),
                limit,
                offset,
            ],
            |r| {
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
            },
        )
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
                id: r.get::<_, i64>(0)?.to_string(),
                user_id: r.get(1)?,
                query: r.get(2)?,
                created_at: r.get(3)?,
                count: r.get::<_, i64>(4)? as i32,
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
    conn.execute(history_record(), params![user_id, trimmed, now_string()])
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
    conn.execute(history_clear(), params![history_soft_delete_now(), user_id])
        .map_err(|e| format!("history_clear failed: {e}"))?;
    Ok(())
}
