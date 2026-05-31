//! Variant seed data - 4-5 variants per product
//!
//! Strength/form templates for generating variants from base products.

use rusqlite::Connection;
use rand::Rng;

pub const VARIANT_TEMPLATES: &[(&str, &[&str], &str)] = &[
    ("Tablet أقراص", &["10mg 10 مجم", "25mg 25 مجم", "50mg 50 مجم", "100mg 100 مجم"], "mg مجم"),
    ("Capsule كبسولة", &["100mg 100 مجم", "200mg 200 مجم", "300mg 300 مجم", "500mg 500 مجم"], "mg مجم"),
    ("Syrup شراب", &["60ml 60 مل", "100ml 100 مل", "120ml 120 مل", "200ml 200 مل"], "ml مل"),
    ("Injection حقن", &["5ml 5 مل", "10ml 10 مل", "20ml 20 مل", "50ml 50 مل"], "ml مل"),
    ("Cream كريم", &["10g 10 جم", "20g 20 جم", "30g 30 جم", "50g 50 جم"], "g جم"),
    ("Ointment مرهم", &["10g 10 جم", "20g 20 جم", "40g 40 جم"], "g جم"),
    ("Spray بخاخ", &["50ml 50 مل", "100ml 100 مل", "200ml 200 مل"], "ml مل"),
    ("Drops قطرات", &["5ml 5 مل", "10ml 10 مل", "15ml 15 مل"], "ml مل"),
    ("Sachets أكياس", &["10s 10 شريطة", "20s 20 شريطة", "30s 30 شريطة", "50s 50 شريطة"], "s شريطة"),
    ("Solution محلول", &["50ml 50 مل", "100ml 100 مل", "250ml 250 مل"], "ml مل"),
];

pub const UOM_NAMES: &[&str] = &["pcs قطعة", "m متر", "kg كيلو", "L لتر", "box علبة", "roll بكرة", "set طقم"];

pub fn seed(conn: &Connection) -> Result<(), String> {
    let mut rng = rand::thread_rng();

    let mut stmt = conn
        .prepare("SELECT id FROM active_products ORDER BY id")
        .map_err(|e| format!("Failed to prepare: {e}"))?;
    let product_ids: Vec<i64> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {e}"))?;
    drop(stmt);

    let mut variant_count = 0;

    for (i, product_id) in product_ids.iter().enumerate() {
        let num_variants = rng.gen_range(2..=4);
        let template = &VARIANT_TEMPLATES[i % VARIANT_TEMPLATES.len()];
        let options = template.1;

        for v in 0..num_variants {
            let variant_name = format!("{} {} {}", template.0, options[v % options.len()], template.2);
            let sku = format!("SKU-{:04}-{:02}", product_id, v + 1);
            let uom_id = (rng.gen_range(0..UOM_NAMES.len()) + 1) as i64;

            let retail_price: f64 = ((rng.gen_range(10.0_f64..800.0_f64) * 100.0).round()) / 100.0;
            let wholesale_price: f64 = (retail_price * 0.75 * 100.0).round() / 100.0;
            let distribution_price: f64 = (retail_price * 0.6 * 100.0).round() / 100.0;

            conn.execute(
                "INSERT INTO product_variants (product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price],
            )
            .map_err(|e| format!("Failed to insert variant: {e}"))?;

            variant_count += 1;
        }
    }

    log::info!("[seed:variants] Inserted {} variants for {} products", variant_count, product_ids.len());
    Ok(())
}