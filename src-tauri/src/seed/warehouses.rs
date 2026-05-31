//! Warehouse seed data - 5 Egyptian distribution centers
//!
//! ALL names use bilingual format: "{English_name} {Arabic_name}"

use rusqlite::Connection;
use chrono::Local;

pub const WAREHOUSES: &[(&str, &str)] = &[
    ("Central Distribution Center مركز التوزيع المركزي", "Cairo القاهرة"),
    ("North Coast Facility منشأة الساحل الشمالي", "Alexandria الإسكندرية"),
    ("North Regional Warehouse المخزن الإقليمي الشمالي", "Mansoura المنصورة"),
    ("Southern Warehouse المستودع الجنوبي", "Asyut أسيوط"),
    ("Upper Egypt Center مركز الصعيد", "Sohag سوهاج"),
];

pub fn seed(conn: &Connection) -> Result<(), String> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for (name, location) in WAREHOUSES {
        conn.execute(
            "INSERT INTO warehouses (name, location, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![name, location, now, now],
        )
        .map_err(|e| format!("Failed to insert warehouse {}: {}", name, e))?;
    }

    log::info!("[seed:warehouses] Inserted {} warehouses", WAREHOUSES.len());
    Ok(())
}