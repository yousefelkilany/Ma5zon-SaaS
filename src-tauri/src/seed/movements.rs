//! Stock movements seed - creates movements that build up consistent stock_levels
//!
//! Movement pattern:
//! - Purchases go to Cairo (primary warehouse)
//! - Transfers to other warehouses based on location
//! - Sales from various warehouses
//! - Adjustments for corrections

use rand::Rng;
use rusqlite::Connection;

use crate::commands::stock_movements::execute_movement;

pub fn seed(conn: &Connection) -> Result<(), String> {
    let mut rng = rand::thread_rng();

    // Get all variant IDs
    let mut stmt = conn
        .prepare("SELECT id FROM product_variants ORDER BY id")
        .map_err(|e| format!("Failed to prepare: {e}"))?;
    let variant_ids: Vec<i64> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {e}"))?;
    drop(stmt);

    // Get all warehouse IDs
    let mut stmt = conn
        .prepare("SELECT id FROM active_warehouses ORDER BY id")
        .map_err(|e| format!("Failed to prepare: {e}"))?;
    let warehouse_ids: Vec<i64> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {e}"))?;
    drop(stmt);

    if warehouse_ids.len() < 5 {
        return Err("Expected at least 5 warehouses for seed data".to_string());
    }

    // Cairo is primary (index 0), others receive transfers
    let cairo_wh = warehouse_ids[0];
    let alexandria_wh = warehouse_ids[1];
    let mansoura_wh = warehouse_ids[2];
    let asyut_wh = warehouse_ids[3];
    let sohag_wh = warehouse_ids[4];

    for variant_id in &variant_ids {
        // 1. Purchase to Cairo
        let purchase_qty: f64 = ((rng.gen_range(50.0_f64..500.0_f64) * 100.0).round()) / 100.0;
        execute_movement(conn, *variant_id, None, Some(cairo_wh), purchase_qty, "PURCHASE")
            .map_err(|e| format!("Failed purchase: {}", e))?;

        // 2. Transfer to Alexandria (30% of purchase)
        let transfer_qty = (purchase_qty * 0.3 * 100.0).round() / 100.0;
        execute_movement(conn, *variant_id, Some(cairo_wh), Some(alexandria_wh), transfer_qty, "TRANSFER")
            .map_err(|e| format!("Failed transfer to Alexandria: {}", e))?;

        // 3. Transfer to Mansoura (20% of purchase)
        let transfer_qty = (purchase_qty * 0.2 * 100.0).round() / 100.0;
        execute_movement(conn, *variant_id, Some(cairo_wh), Some(mansoura_wh), transfer_qty, "TRANSFER")
            .map_err(|e| format!("Failed transfer to Mansoura: {}", e))?;

        // 4. Occasional transfer to Asyut (50% probability, 15% of purchase)
        if rng.gen_bool(0.5) {
            let transfer_qty = (purchase_qty * 0.15 * 100.0).round() / 100.0;
            execute_movement(conn, *variant_id, Some(cairo_wh), Some(asyut_wh), transfer_qty, "TRANSFER")
                .map_err(|e| format!("Failed transfer to Asyut: {}", e))?;
        }

        // 5. Occasional transfer to Sohag (30% probability, 10% of purchase)
        if rng.gen_bool(0.3) {
            let transfer_qty = (purchase_qty * 0.1 * 100.0).round() / 100.0;
            execute_movement(conn, *variant_id, Some(cairo_wh), Some(sohag_wh), transfer_qty, "TRANSFER")
                .map_err(|e| format!("Failed transfer to Sohag: {}", e))?;
        }

        // 6. Sales from Cairo warehouse only (where stock is accumulated)
        let num_sales = rng.gen_range(2..=4);
        for _ in 0..num_sales {
            let sale_qty = ((rng.gen_range(1.0_f64..50.0_f64) * 100.0).round()) / 100.0;
            execute_movement(conn, *variant_id, Some(cairo_wh), None, sale_qty, "SALE")
                .map_err(|e| format!("Failed sale: {}", e))?;
        }

        // 7. Positive adjustments only during seeding (upsert creates stock if missing)
        let num_adjustments = rng.gen_range(0..=2);
        for _ in 0..num_adjustments {
            let wh = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
            let adj_qty = ((rng.gen_range(1.0_f64..30.0_f64) * 100.0).round()) / 100.0;
            execute_movement(conn, *variant_id, None, Some(wh), adj_qty, "ADJUST")
                .map_err(|e| format!("Failed positive adjustment: {}", e))?;
        }
    }

    log::info!("[seed:movements] Seeded movements for {} variants", variant_ids.len());
    Ok(())
}