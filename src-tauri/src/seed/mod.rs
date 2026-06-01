//! Seed data modules for database initialization.
//!
//! Seed data is extracted from command files into dedicated modules for better
//! organization and maintainability.

pub mod movements;
pub mod products;
pub mod variants;
pub mod warehouses;

use async_trait::async_trait;
use rusqlite::Connection;
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;

#[async_trait]
pub trait Seedable: Send + Sync {
    fn seed(&self, conn: &Connection) -> Result<(), String>;
}

pub async fn seed_all(app: &AppHandle) -> Result<(), String> {
    let conn = get_conn(app)?;

    // Seed in dependency order: products → variants → warehouses → movements
    products::seed(&conn)?;
    variants::seed(&conn)?;
    warehouses::seed(&conn)?;
    movements::seed(&conn)?;

    log::info!("[seed] All seed data loaded successfully");
    Ok(())
}
