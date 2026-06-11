//! Shared types and validation functions for the Tauri application.

use regex::Regex;
use rusqlite::Result as DbErr;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::str::FromStr;
use std::sync::LazyLock;

/// Default shortcut for the quick pane
pub const DEFAULT_QUICK_PANE_SHORTCUT: &str = "CommandOrControl+Shift+.";

/// Maximum size for recovery data files (10MB)
pub const MAX_RECOVERY_DATA_BYTES: u32 = 10_485_760;

pub const ADMIN_ROLE: &str = "Administrator";

/// Pre-compiled regex pattern for filename validation.
/// Only allows alphanumeric characters, dashes, underscores, and a single extension.
pub static FILENAME_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$")
        .expect("Failed to compile filename regex pattern")
});

// ============================================================================
// Preferences
// ============================================================================

/// Application preferences that persist to disk.
/// Only contains settings that should be saved between sessions.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AppPreferences {
    pub theme: String,
    /// Global shortcut for quick pane (e.g., "CommandOrControl+Shift+.")
    /// If None, uses the default shortcut
    pub quick_pane_shortcut: Option<String>,
    /// User's preferred language (e.g., "ar", "en")
    /// If None, uses system locale detection
    pub language: Option<String>,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            quick_pane_shortcut: None, // None means use default
            language: None,            // None means use system locale
        }
    }
}

// ============================================================================
// Recovery Errors
// ============================================================================

/// Error types for recovery operations (typed for frontend matching)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum RecoveryError {
    /// File does not exist (expected case, not a failure)
    FileNotFound,
    /// Filename validation failed
    ValidationError { message: String },
    /// Data exceeds size limit
    DataTooLarge { max_bytes: u32 },
    /// File system read/write error
    IoError { message: String },
    /// JSON serialization/deserialization error
    ParseError { message: String },
}

impl std::fmt::Display for RecoveryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RecoveryError::FileNotFound => write!(f, "File not found"),
            RecoveryError::ValidationError { message } => write!(f, "Validation error: {message}"),
            RecoveryError::DataTooLarge { max_bytes } => {
                write!(f, "Data too large (max {max_bytes} bytes)")
            }
            RecoveryError::IoError { message } => write!(f, "IO error: {message}"),
            RecoveryError::ParseError { message } => write!(f, "Parse error: {message}"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total_count: i32,
    pub total_pages: i32,
}

// ============================================================================
// User
// ============================================================================

/// User data stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub avatar_url: Option<String>,
}

// ============================================================================
// Products & Variants
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Product {
    pub id: String,
    pub company: String,
    pub name: String,
    pub category: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ProductWithStock {
    pub id: String,
    pub company: String,
    pub name: String,
    pub quantity: i32,
    pub category: String,
}
impl ProductWithStock {
    pub fn from_row(row: &rusqlite::Row) -> DbErr<Self> {
        Ok(ProductWithStock {
            id: row.get::<_, i64>(0)?.to_string(),
            company: row.get(1)?,
            name: row.get(2)?,
            quantity: row.get(3)?,
            category: row.get(4)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Variant {
    pub id: String,
    pub product_id: String,
    pub sku: String,
    pub variant_name: String,
    pub uom_id: String,
    pub retail_price: i64,
    pub wholesale_price: i64,
    pub distribution_price: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ProductVariantWithStock {
    pub id: String,
    pub product_id: String,
    pub sku: String,
    pub variant_name: String,
    pub quantity: i32,
    pub uom_id: String,
    pub retail_price: i64,
    pub wholesale_price: i64,
    pub distribution_price: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NewVariant {
    pub product_id: String,
    pub sku: String,
    pub variant_name: String,
    pub uom_id: String,
    pub retail_price: i64,
    pub wholesale_price: i64,
    pub distribution_price: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateVariant {
    pub sku: Option<String>,
    pub variant_name: Option<String>,
    pub uom_id: Option<String>,
    pub retail_price: Option<i64>,
    pub wholesale_price: Option<i64>,
    pub distribution_price: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[allow(dead_code)]
pub struct VariantPrice {
    pub variant_id: String,
    pub price_list_id: PriceList,
    pub price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[allow(dead_code)]
pub struct NewVariantPrice {
    pub variant_id: String,
    pub price_list_id: PriceList,
    pub price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[allow(dead_code)]
pub struct TableLayout {
    pub table_name: String,
    pub columns: Vec<ColumnDefRust>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[allow(dead_code)]
pub struct ColumnDefRust {
    pub id: String,
    pub name: String,
    pub col_type: String,
    pub width: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)]
pub enum PriceList {
    Retail,
    Wholesale,
    Distribution,
}

impl PriceList {
    #[allow(dead_code)]
    pub fn from_id(id: i32) -> Option<Self> {
        match id {
            1 => Some(PriceList::Retail),
            2 => Some(PriceList::Wholesale),
            3 => Some(PriceList::Distribution),
            _ => None,
        }
    }

    #[allow(dead_code)]
    pub fn id(&self) -> i32 {
        match self {
            PriceList::Retail => 1,
            PriceList::Wholesale => 2,
            PriceList::Distribution => 3,
        }
    }
}

impl FromStr for PriceList {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "retail" => Ok(PriceList::Retail),
            "wholesale" => Ok(PriceList::Wholesale),
            "distribution" => Ok(PriceList::Distribution),
            _ => Err(format!("Unknown price list: {}", s)),
        }
    }
}

// ============================================================================
// Validation Functions
// ============================================================================

/// Validates a filename for safe file system operations.
/// Only allows alphanumeric characters, dashes, underscores, and a single extension.
pub fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.is_empty() {
        return Err("Filename cannot be empty".to_string());
    }

    if filename.chars().count() > 100 {
        return Err("Filename too long (max 100 characters)".to_string());
    }

    if !FILENAME_PATTERN.is_match(filename) {
        return Err(
            "Invalid filename: only alphanumeric characters, dashes, underscores, and dots allowed"
                .to_string(),
        );
    }

    Ok(())
}

/// Validates string input length (by character count, not bytes).
pub fn validate_string_input(input: &str, max_len: usize, field_name: &str) -> Result<(), String> {
    let char_count = input.chars().count();
    if char_count > max_len {
        return Err(format!("{field_name} too long (max {max_len} characters)"));
    }
    Ok(())
}

/// Validates theme value.
pub fn validate_theme(theme: &str) -> Result<(), String> {
    match theme {
        "light" | "dark" | "system" => Ok(()),
        _ => Err("Invalid theme: must be 'light', 'dark', or 'system'".to_string()),
    }
}

// ============================================================================
// Filter State
// ============================================================================

#[derive(Debug, Clone, Deserialize, Type)]
pub struct FilterState {
    pub column_id: String,
    pub operator: String,
    pub value: serde_json::Value,
}

// ============================================================================
// Sort State
// ============================================================================

#[derive(Debug, Clone, Deserialize, Type)]
pub struct SortState {
    pub column_id: String,
    pub direction: String,
}

// ============================================================================
// Global Search
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchHit {
    pub entity_type: String,
    pub id: String,
    pub parent_id: Option<String>,
    pub matched_column: Option<String>,
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
    pub count: i32,
}
