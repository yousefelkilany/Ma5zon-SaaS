//! Tauri command handlers organized by domain.
//!
//! Each submodule contains related commands and their helper functions.
//! Import specific commands via their submodule (e.g., `commands::preferences::greet`).

use async_trait::async_trait;
use tauri::AppHandle;

pub mod db_utils;
pub mod notifications;
pub mod preferences;
pub mod products;
pub mod quick_pane;
pub mod recovery;
pub mod stocks;
pub mod users;
pub mod variants;
pub mod warehouses;

#[async_trait]
pub trait DatabaseInitializable: Send + Sync {
    fn table_name(&self) -> &str;
    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String>;
}

use self::{
    products::ProductsInitializer, stocks::StockInitializer, users::UserInitializer,
    variants::VariantsInitializer, warehouses::WarehousesInitializer,
};

pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
    &WarehousesInitializer,
    &StockInitializer,
];

pub use stocks::{
    StockLevel, StockLevelWithVariant, StockMovement,
    stock_levels_get_all, stock_levels_get_by_variant, stock_levels_get_by_warehouse,
    stock_levels_get_by_product, stock_levels_get_by_warehouse_with_names,
    stock_movements_get_all, stock_movements_get_by_variant,
    ProductWithStock, VariantWithStock,
    products_get_by_warehouse_with_stock, products_get_by_warehouse_paginated,
    variants_get_by_product_and_warehouse,
};
