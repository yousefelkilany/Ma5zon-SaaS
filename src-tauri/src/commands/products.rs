use async_trait::async_trait;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;
use crate::commands::{self, DatabaseInitializable};
use crate::types::Product;

pub struct ProductsInitializer;

#[async_trait]
impl commands::DatabaseInitializable for ProductsInitializer {
    fn table_name(&self) -> &str {
        "products"
    }

    async fn init_and_seed(&self, app: &AppHandle) -> Result<(), String> {
        let conn = get_conn(app)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| format!("Failed to create products table: {e}"))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count products: {e}"))?;

        if count == 0 {
            log::info!("[ProductsInitializer] Seeding sample products");
            seed_products(&conn)?;
        }

        Ok(())
    }
}

fn seed_products(conn: &Connection) -> Result<(), String> {
    use rand::Rng;

    let products = vec![
        "Industrial Motor Assembly", "Electronic Control Module", "Hydraulic Pump Unit",
        "Precision Bearing Set", "Stainless Steel Fastener Kit", "LED Display Panel",
        "Thermal Insulation Sheet", "Carbon Fiber Bracket", "Copper Wiring Harness",
        "Aluminum Extrusion Profile", "Rubber Gasket Seal", "Plastic Housing Cover",
        "Glass Lens Assembly", "Brass Fitting Connector", "Titanium Implant Plate",
        "Ceramic Capacitor Array", "Magnetic Encoder Sensor", "Pneumatic Cylinder",
        "Solar Panel Junction Box", "Composite Gear Set", "Acoustic Waveguide",
        "Optical Fiber Bundle", "High-Frequency Transformer", "Emergency Battery Pack",
        "Servo Drive Controller", "Linear Guide Rail", "Pressure Relief Valve",
        "Bi-Metal Thermostat", "Anti-Vibration Mount", "RF Antenna Module",
        "316L Stainless Tubing", "Polycarbonate Housing", "Graphite Heat Sink",
        "Neodymium Magnet Assembly", "PTFE Liner Bearing", "Epoxy Resin Compound",
        "Silicone Grommet Set", "Borosilicate Glass Tube", "Rolled Steel Sheet",
    ];

    for product in products {
        conn.execute("INSERT INTO products (name) VALUES (?1)", [product])
            .map_err(|e| format!("Failed to insert product: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<Product>, String> {
    let conn = get_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM products ORDER BY name")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let products = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to query products: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect products: {e}"))?;

    Ok(products)
}

#[tauri::command]
#[specta::specta]
pub async fn get_by_id(app: AppHandle, id: String) -> Result<Option<Product>, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM products WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let product = stmt
        .query_row(params![id_i64], |row| {
            Ok(Product {
                id: row.get::<_, i64>(0)?.to_string(),
                name: row.get(1)?,
            })
        })
        .ok();

    Ok(product)
}

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    conn.execute(
        "INSERT INTO products (name) VALUES (?1)",
        params![name],
    )
    .map_err(|e| format!("Failed to create product: {e}"))?;

    let id = conn.last_insert_rowid().to_string();
    Ok(Product { id, name })
}

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: String, name: String) -> Result<Product, String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute(
        "UPDATE products SET name = ?1 WHERE id = ?2",
        params![name, id_i64],
    )
    .map_err(|e| format!("Failed to update product: {e}"))?;

    Ok(Product { id, name })
}

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let id_i64: i64 = id.parse().map_err(|e| format!("Invalid id: {e}"))?;
    conn.execute("DELETE FROM products WHERE id = ?1", params![id_i64])
        .map_err(|e| format!("Failed to delete product: {e}"))?;
    Ok(())
}