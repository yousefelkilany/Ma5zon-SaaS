//! Stock movements seed - creates movements that build up consistent stock_levels
//!
//! Movement pattern:
//! - Purchases go to Cairo (primary warehouse)
//! - Transfers to other warehouses based on location
//! - Sales from warehouses that received transfers (qty limited to available)
//! - Adjustments for corrections

use rand::Rng;
use rusqlite::{params, Connection};

use crate::commands::stock_movements::execute_movement;

fn get_stock(conn: &Connection, variant_id: i64, warehouse_id: i64) -> i32 {
    conn.query_row(
        "SELECT COALESCE(quantity, 0) FROM stock_levels WHERE variant_id = ?1 AND warehouse_id = ?2",
        params![variant_id, warehouse_id],
        |row| row.get::<_, i32>(0),
    )
    .unwrap_or(0)
}

pub fn seed(conn: &Connection) -> Result<(), String> {
    let mut rng = rand::thread_rng();

    let mut stmt = conn
        .prepare("SELECT id, product_id FROM product_variants ORDER BY id")
        .map_err(|e| format!("Failed to prepare: {e}"))?;
    let variant_product_ids: Vec<(i64, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("Failed to query: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {e}"))?;
    drop(stmt);

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

    let cairo_wh = warehouse_ids[0];
    let alexandria_wh = warehouse_ids[1];
    let mansoura_wh = warehouse_ids[2];
    let asyut_wh = warehouse_ids[3];
    let sohag_wh = warehouse_ids[4];

    for (variant_id, product_id) in &variant_product_ids {
        let purchase_qty: i32 = rng.gen_range(50..=500);
        execute_movement(
            conn,
            *variant_id,
            *product_id,
            None,
            Some(cairo_wh),
            purchase_qty,
            "PURCHASE",
        )
        .map_err(|e| format!("Failed purchase: {}", e))?;

        let transfer_alex = (purchase_qty * 30) / 100;
        execute_movement(
            conn,
            *variant_id,
            *product_id,
            Some(cairo_wh),
            Some(alexandria_wh),
            transfer_alex,
            "TRANSFER",
        )
        .map_err(|e| format!("Failed transfer to Alexandria: {}", e))?;

        let transfer_mans = (purchase_qty * 20) / 100;
        execute_movement(
            conn,
            *variant_id,
            *product_id,
            Some(cairo_wh),
            Some(mansoura_wh),
            transfer_mans,
            "TRANSFER",
        )
        .map_err(|e| format!("Failed transfer to Mansoura: {}", e))?;

        let mut stock_available = vec![cairo_wh, alexandria_wh, mansoura_wh];

        if rng.gen_bool(0.5) {
            let transfer_asy = (purchase_qty * 15) / 100;
            execute_movement(
                conn,
                *variant_id,
                *product_id,
                Some(cairo_wh),
                Some(asyut_wh),
                transfer_asy,
                "TRANSFER",
            )
            .map_err(|e| format!("Failed transfer to Asyut: {}", e))?;
            stock_available.push(asyut_wh);
        }

        if rng.gen_bool(0.3) {
            let transfer_soh = (purchase_qty * 10) / 100;
            execute_movement(
                conn,
                *variant_id,
                *product_id,
                Some(cairo_wh),
                Some(sohag_wh),
                transfer_soh,
                "TRANSFER",
            )
            .map_err(|e| format!("Failed transfer to Sohag: {}", e))?;
            stock_available.push(sohag_wh);
        }

        let num_sales = rng.gen_range(2..=4);
        for _ in 0..num_sales {
            let from_wh = stock_available[rng.gen_range(0..stock_available.len())];
            let available = get_stock(conn, *variant_id, from_wh);
            if available == 0 {
                continue;
            }
            let sale_qty: i32 = rng.gen_range(1..=available.min(20));
            execute_movement(conn, *variant_id, *product_id, Some(from_wh), None, sale_qty, "SALE")
                .map_err(|e| format!("Failed sale: {}", e))?;
        }

        let num_adjustments = rng.gen_range(0..=2);
        for _ in 0..num_adjustments {
            let wh = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
            let adj_qty: i32 = rng.gen_range(1..=15);
            execute_movement(conn, *variant_id, *product_id, None, Some(wh), adj_qty, "ADJUST")
                .map_err(|e| format!("Failed positive adjustment: {}", e))?;
        }
    }

    log::info!(
        "[seed:movements] Seeded movements for {} variants",
        variant_product_ids.len()
    );
    Ok(())
}
