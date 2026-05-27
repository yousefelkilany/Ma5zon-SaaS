use rand::Rng;
use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::{ColumnDefRust, TableLayout};

fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;
    Ok(app_data_dir.join("ma5zon.db"))
}

fn get_conn(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))
}

#[tauri::command]
#[specta::specta]
pub async fn get_table_layout(app: AppHandle, table: &str) -> Result<TableLayout, String> {
    let _conn = get_conn(&app)?;

    let columns: Vec<ColumnDefRust> = match table {
        "products" => vec![
            ColumnDefRust { id: "id".to_string(), name: "ID".to_string(), col_type: "number".to_string(), width: 80.0 },
            ColumnDefRust { id: "name".to_string(), name: "Product Name".to_string(), col_type: "text".to_string(), width: 200.0 },
        ],
        "product_variants" => vec![
            ColumnDefRust { id: "id".to_string(), name: "ID".to_string(), col_type: "number".to_string(), width: 80.0 },
            ColumnDefRust { id: "product_id".to_string(), name: "Product ID".to_string(), col_type: "number".to_string(), width: 100.0 },
            ColumnDefRust { id: "sku".to_string(), name: "SKU".to_string(), col_type: "text".to_string(), width: 120.0 },
            ColumnDefRust { id: "variant_name".to_string(), name: "Variant Name".to_string(), col_type: "text".to_string(), width: 180.0 },
            ColumnDefRust { id: "uom_id".to_string(), name: "UOM".to_string(), col_type: "text".to_string(), width: 80.0 },
        ],
        _ => return Err(format!("Unknown table: {}", table)),
    };

    Ok(TableLayout {
        table_name: table.to_string(),
        columns,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn init_product_tables(app: AppHandle) -> Result<(), String> {
    let conn = get_conn(&app)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create products table: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS product_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            sku TEXT UNIQUE,
            variant_name TEXT,
            uom_id INTEGER,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )",
        [],
    )
    .map_err(|e| format!("Failed to create product_variants table: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS variant_prices (
            variant_id INTEGER,
            price_list_id INTEGER,
            price REAL NOT NULL,
            PRIMARY KEY (variant_id, price_list_id),
            FOREIGN KEY(variant_id) REFERENCES product_variants(id)
        )",
        [],
    )
    .map_err(|e| format!("Failed to create variant_prices table: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS price_lists (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create price_lists table: {e}"))?;

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM price_lists", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count price lists: {e}"))?;

    if count == 0 {
        conn.execute("INSERT INTO price_lists (id, name) VALUES (1, 'Retail')", [])
            .map_err(|e| format!("Failed to seed retail: {e}"))?;
        conn.execute("INSERT INTO price_lists (id, name) VALUES (2, 'Wholesale')", [])
            .map_err(|e| format!("Failed to seed wholesale: {e}"))?;
        conn.execute("INSERT INTO price_lists (id, name) VALUES (3, 'Distribution')", [])
            .map_err(|e| format!("Failed to seed distribution: {e}"))?;
    }

    let product_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count products: {e}"))?;

    if product_count == 0 {
        seed_product_tables(&conn)?;
    }

    Ok(())
}

fn seed_product_tables(conn: &Connection) -> Result<(), String> {
    let mut rng = rand::thread_rng();

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

    let variants_data = vec![
        (vec!["Standard Grade", "Heavy Duty", "Economy", "Premium"], "Grade"),
        (vec!["10W", "25W", "50W", "100W"], "Power"),
        (vec!["120V", "240V", "480V", "Dual Voltage"], "Voltage"),
        (vec!["Male", "Female", "Barbed", "Compression"], "Connector"),
        (vec!["1m", "2m", "5m", "10m"], "Length"),
        (vec!["SS304", "SS316", "SS430", "Galvanized"], "Material"),
        (vec!["Clear", "Tinted", "Mirrored", "Anti-Glare"], "Finish"),
        (vec!["M3", "M4", "M5", "M6", "M8"], "Size"),
        (vec!["Small", "Medium", "Large", "XL"], "Size"),
        (vec!["2A", "5A", "10A", "20A"], "Rating"),
    ];

    let uom_names = vec!["pcs", "m", "kg", "L", "box", "roll", "set"];
    let mut variant_ids: Vec<i64> = Vec::new();

    for (i, product_name) in products.iter().enumerate() {
        conn.execute(
            "INSERT INTO products (name) VALUES (?1)",
            [product_name],
        )
        .map_err(|e| format!("Failed to insert product: {e}"))?;

        let product_id = conn.last_insert_rowid();
        let num_variants = rng.gen_range(2..5);
        let variant_type = &variants_data[i % variants_data.len()];
        let options = &variant_type.0;

        for v in 0..num_variants {
            let variant_name = format!("{} {} {}", product_name, variant_type.1, options[v % options.len()]);
            let sku = format!(
                "{}-{:04}-{:02}",
                &product_name[..3].to_uppercase(),
                i + 1,
                v + 1
            );
            let uom_id = (rng.gen_range(0..uom_names.len()) + 1) as i64;

            conn.execute(
                "INSERT INTO product_variants (product_id, sku, variant_name, uom_id) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![product_id, sku, variant_name, uom_id],
            )
            .map_err(|e| format!("Failed to insert variant: {e}"))?;

            let variant_id = conn.last_insert_rowid();
            variant_ids.push(variant_id);
        }
    }

    for variant_id in &variant_ids {
        for price_list_id in 1..=3 {
            let base_price: f64 = rng.gen_range(5.0..500.0);
            let multiplier = match price_list_id {
                1 => 1.0,
                2 => 0.75,
                3 => 0.6,
                _ => 1.0,
            };
            let price = (base_price * multiplier * 100.0).round() / 100.0;

            conn.execute(
                "INSERT INTO variant_prices (variant_id, price_list_id, price) VALUES (?1, ?2, ?3)",
                rusqlite::params![variant_id, price_list_id, price],
            )
            .map_err(|e| format!("Failed to insert price: {e}"))?;
        }
    }

    Ok(())
}