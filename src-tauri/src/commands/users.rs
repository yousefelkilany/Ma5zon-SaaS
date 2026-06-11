//! User management commands using SQLite.

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use async_trait::async_trait;
use chrono::Local;
use rusqlite::{params, params_from_iter};
use tauri::AppHandle;

use crate::sql::{
    self,
    users::{
        create_table, get_by_id, get_by_name, get_password_hash,
        update_password as sql_update_password, update_user as sql_update_user, upsert,
    },
};
use crate::types::User;
use crate::{commands::db_utils::get_conn, types::ADMIN_ROLE};
use crate::{commands::DatabaseInitializable, sql::users::soft_delete};

struct UserWithHash {
    id: String,
    name: String,
    email: String,
    role: String,
    avatar_url: Option<String>,
    password_hash: Option<String>,
}

pub struct UserInitializer;

#[async_trait]
impl DatabaseInitializable for UserInitializer {
    fn table_name(&self) -> &str {
        "users"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute_batch(create_table())
            .map_err(|e| format!("Failed to create users table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM active_users", [], |row| row.get(0))
            .map_err(|e| format!("Failed to check users count: {e}"))?;

        if count == 0 {
            log::info!("[UserInitializer] Seeding default admin");
            let password_hash =
                hash_password("admin").map_err(|e| format!("Failed to hash password: {e}"))?;
            conn.execute(
                "INSERT INTO users (name, email, role, avatar_url, password_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    "admin",
                    "admin@localhost",
                    ADMIN_ROLE,
                    Option::<String>::None,
                    password_hash
                ],
            )
            .map_err(|e| format!("Failed to seed default admin: {e}"))?;
        }

        Ok(())
    }
}

fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut rand::rngs::OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| {
            log::error!("[hash_password] Failed to hash password: {e}");
            format!("Failed to hash password: {e}")
        })?;
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
    log::info!("[authenticate] Attempting login for username: {}", username);
    let conn = get_conn(&app)?;

    let mut stmt = conn
        .prepare(get_by_name())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let user_result = stmt.query_row(params![username], |row| {
        Ok(UserWithHash {
            id: row.get(0)?,
            name: row.get(1)?,
            email: row.get(2)?,
            role: row.get(3)?,
            avatar_url: row.get(4)?,
            password_hash: row.get(5)?,
        })
    });

    match user_result {
        Ok(user) => {
            log::info!(
                "[authenticate] User found: {}, attempting password verify",
                user.name
            );
            if let Some(ref hash) = user.password_hash {
                if verify_password(password, hash)? {
                    log::info!("[authenticate] Password verified, returning user");
                    Ok(Some(User {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar_url: user.avatar_url,
                    }))
                } else {
                    log::info!("[authenticate] Password verification failed");
                    Ok(None)
                }
            } else {
                log::info!("[authenticate] No password hash for user");
                Ok(None)
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            log::info!("[authenticate] User not found: {}", username);
            Ok(None)
        }
        Err(e) => {
            log::error!("[authenticate] Database error: {}", e);
            Err(format!("Database error: {e}"))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn load_user(app: AppHandle, user_id: &str) -> Result<Option<User>, String> {
    let conn = get_conn(&app)?;

    let mut stmt = conn
        .prepare(get_by_id())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let user = stmt
        .query_row(params![user_id], |row| {
            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                role: row.get(3)?,
                avatar_url: row.get(4)?,
            })
        })
        .ok();

    Ok(user)
}

#[tauri::command]
#[specta::specta]
pub async fn save_user(app: AppHandle, user: User) -> Result<(), String> {
    let conn = get_conn(&app)?;

    conn.execute(
        upsert(),
        params![user.id, user.name, user.role, user.avatar_url],
    )
    .map_err(|e| format!("Failed to save user: {e}"))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn soft_delete_user(app: AppHandle, user_id: &str) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(soft_delete(), params![now, user_id])
        .map_err(|e| format!("Failed to delete user: {e}"))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn update_password(
    app: AppHandle,
    user_id: String,
    current_password: String,
    new_password: String,
) -> Result<(), String> {
    let conn = get_conn(&app)?;

    let mut stmt = conn
        .prepare(get_password_hash())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let password_hash: Option<String> = stmt.query_row(params![user_id], |row| row.get(0)).ok();

    match password_hash {
        Some(hash) => {
            if !verify_password(&current_password, &hash)? {
                return Err("Current password is incorrect".to_string());
            }
        }
        None => return Err("User not found".to_string()),
    }

    let new_hash = hash_password(&new_password)?;
    conn.execute(sql_update_password(), params![new_hash, user_id])
        .map_err(|e| format!("Failed to update password: {e}"))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn update_user(
    app: AppHandle,
    user_id: String,
    name: String,
    email: String,
    avatar_url: Option<String>,
) -> Result<User, String> {
    let conn = get_conn(&app)?;

    conn.execute(sql_update_user(), params![name, email, avatar_url, user_id])
        .map_err(|e| format!("Failed to update user: {e}"))?;

    let mut stmt = conn
        .prepare(get_by_id())
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let user = stmt
        .query_row(params![user_id], |row| {
            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                role: row.get(3)?,
                avatar_url: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to get updated user: {e}"))?;

    Ok(user)
}

#[tauri::command]
#[specta::specta]
pub async fn users_get_by_ids(
    app: AppHandle,
    ids: Vec<String>,
) -> Result<Vec<User>, String> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let conn = get_conn(&app)?;
    let sql = sql::users::get_by_ids(ids.len());
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("users_get_by_ids Failed to prepare: {e}"))?;

    let users = stmt
        .query_map(params_from_iter(ids.iter()), |row| {
            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                role: row.get(3)?,
                avatar_url: row.get(4)?,
            })
        })
        .map_err(|e| format!("users_get_by_ids Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("users_get_by_ids Failed to collect: {e}"))?;

    Ok(users)
}
