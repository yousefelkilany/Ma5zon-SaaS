//! Tauri command handlers organized by domain.
//!
//! Each submodule contains related commands and their helper functions.
//! Import specific commands via their submodule (e.g., `commands::preferences::greet`).

pub mod notifications;
pub mod preferences;
pub mod prices;
pub mod products;
pub mod quick_pane;
pub mod recovery;
pub mod user;
pub mod variants;
