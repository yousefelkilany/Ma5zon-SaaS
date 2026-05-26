//! User management commands using SQLite.

use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::User;

/// Gets the path to the SQLite database.
fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join("ma5zon.db"))
}

/// Initializes the SQLite database and creates tables if needed.
fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            avatar_url TEXT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create users table: {e}"))?;

    Ok(conn)
}

/// Load a user by ID from the SQLite database.
#[tauri::command]
#[specta::specta]
pub async fn load_user(app: AppHandle, user_id: &str) -> Result<Option<User>, String> {
    let conn = init_db(&app)?;

    let mut stmt = conn
        .prepare("SELECT id, name, role, avatar_url FROM users WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let user = stmt
        .query_row(params![user_id], |row| {
            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                role: row.get(2)?,
                avatar_url: row.get(3)?,
            })
        })
        .ok();

    Ok(user)
}

/// Save a user to the SQLite database (upsert).
#[tauri::command]
#[specta::specta]
pub async fn save_user(app: AppHandle, user: User) -> Result<(), String> {
    let conn = init_db(&app)?;

    conn.execute(
        "INSERT INTO users (id, name, role, avatar_url) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET name = ?2, role = ?3, avatar_url = ?4",
        params![user.id, user.name, user.role, user.avatar_url],
    )
    .map_err(|e| format!("Failed to save user: {e}"))?;

    Ok(())
}

/// Delete a user from the SQLite database.
#[tauri::command]
#[specta::specta]
pub async fn delete_user(app: AppHandle, user_id: &str) -> Result<(), String> {
    let conn = init_db(&app)?;

    conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user: {e}"))?;

    Ok(())
}