//! Tauri command handlers organized by domain.
//!
//! Each submodule contains related commands and their helper functions.
//! Import specific commands via their submodule (e.g., `commands::preferences::greet`).

use async_trait::async_trait;
use tauri::AppHandle;

pub mod notifications;
pub mod preferences;
pub mod quick_pane;
pub mod recovery;
pub mod db_utils;
pub mod user;
pub mod warehouses;
pub mod products;
pub mod variants;
pub mod stock;

#[async_trait]
pub trait DatabaseInitializable: Send + Sync {
    fn table_name(&self) -> &str;
    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String>;
}

use crate::commands::warehouses::WarehousesInitializer;

use self::{
    products::ProductsInitializer,
    stock::StockInitializer,
    user::UserInitializer,
    variants::VariantsInitializer,
};

pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
    &WarehousesInitializer,
    &StockInitializer,
];