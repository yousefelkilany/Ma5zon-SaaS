//! User management commands using SQLite.

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::User;

struct UserWithHash {
    id: String,
    name: String,
    role: String,
    avatar_url: Option<String>,
    password_hash: Option<String>,
}

fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join("ma5zon.db"))
}

fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL,
            avatar_url TEXT,
            password_hash TEXT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create users table: {e}"))?;

    Ok(conn)
}

fn seed_default_admin(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to check users count: {e}"))?;

    if count == 0 {
        let password_hash = hash_password("admin").unwrap();
        let avatar: Option<String> = None;
        conn.execute(
            "INSERT INTO users (id, name, role, avatar_url, password_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                uuid::Uuid::new_v4().to_string(),
                "admin",
                "Administrator",
                avatar,
                password_hash
            ],
        )
        .map_err(|e| format!("Failed to seed default admin: {e}"))?;
    }

    Ok(())
}

fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut rand::rngs::OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Failed to hash password: {e}"))?;
    Ok(password_hash.to_string())
}

fn verify_password(password: &str, password_hash: &str) -> Result<bool, String> {
    let parsed_hash =
        PasswordHash::new(password_hash).map_err(|e| format!("Invalid password hash: {e}"))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

#[tauri::command]
#[specta::specta]
pub async fn authenticate(
    app: AppHandle,
    username: &str,
    password: &str,
) -> Result<Option<User>, String> {
    let conn = init_db(&app)?;
    seed_default_admin(&conn)?;

    let mut stmt = conn
        .prepare("SELECT id, name, role, avatar_url, password_hash FROM users WHERE name = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let user_result = stmt.query_row(params![username], |row| {
        Ok(UserWithHash {
            id: row.get(0)?,
            name: row.get(1)?,
            role: row.get(2)?,
            avatar_url: row.get(3)?,
            password_hash: row.get(4)?,
        })
    });

    match user_result {
        Ok(user) => {
            if let Some(ref hash) = user.password_hash {
                if verify_password(password, hash)? {
                    Ok(Some(User {
                        id: user.id,
                        name: user.name,
                        role: user.role,
                        avatar_url: user.avatar_url,
                    }))
                } else {
                    Ok(None)
                }
            } else {
                Ok(None)
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {e}")),
    }
}

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

#[tauri::command]
#[specta::specta]
pub async fn delete_user(app: AppHandle, user_id: &str) -> Result<(), String> {
    let conn = init_db(&app)?;

    conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user: {e}"))?;

    Ok(())
}