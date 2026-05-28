//! Tauri command handlers organized by domain.
//!
//! Each submodule contains related commands and their helper functions.
//! Import specific commands via their submodule (e.g., `commands::preferences::greet`).

use tauri::AppHandle;

pub mod db_utils;
pub mod notifications;
pub mod preferences;
pub mod prices;
pub mod products;
pub mod quick_pane;
pub mod recovery;
pub mod schema;
pub mod user;
pub mod variants;

pub trait DatabaseInitializable {
    fn table_name(&self) -> &str;
    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String>;
}
