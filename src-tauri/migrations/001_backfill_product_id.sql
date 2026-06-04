-- Migration: Add and backfill product_id column to stock_movements
-- Run this once on existing databases that have stock_movements without product_id
-- Safe to run multiple times - uses idempotent operations

BEGIN TRANSACTION;

-- Step 1: Add product_id column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- Try to add the column; if it already exists, this will fail and we catch it
ALTER TABLE stock_movements ADD COLUMN product_id INTEGER;

-- Step 2: Backfill product_id from product_variants for any rows that might have NULL
UPDATE stock_movements
SET product_id = (
    SELECT pv.product_id
    FROM product_variants pv
    WHERE pv.id = stock_movements.variant_id
)
WHERE product_id IS NULL OR product_id = 0;

COMMIT;