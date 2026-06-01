# Seed Data Extraction & Stock Movement System Design

**Date:** 2026-05-31
**Status:** Approved

---

## 1. Overview

Extract seed data from command files into dedicated seed modules, and implement a coherent stock movement system where `stock_levels` is maintained via transactional operations that also create audit logs in `stock_movements`.

---

## 2. File Structure

```
src-tauri/src/seed/
├── mod.rs              (reexports + seeding orchestration)
├── products.rs         (60+ pharmaceutical products as const arrays)
├── variants.rs         (4-5 variants per product)
├── warehouses.rs       (5 Egyptian warehouses)
└── movements.rs        (purchase + transfer + sale + adjust movements)

src-tauri/src/commands/stock_movements.rs   (NEW - movement commands)
```

---

## 3. Seeding Order

Seed functions execute in dependency order:

1. **products.rs** → `INSERT INTO products`
2. **variants.rs** → `INSERT INTO product_variants`
3. **warehouses.rs** → `INSERT INTO warehouses`
4. **movements.rs** → `UPDATE/INSERT stock_levels` + `INSERT stock_movements`

---

## 4. Product Seed Data

### Categories

- **OTC Medicines**: Pain relievers, cold/flu, antacids, vitamins
- **Prescription**: Antibiotics, diabetes medications, cardiovascular
- **Supplements**: Proteins, minerals, herbal products
- **Medical Devices**: Glucometers, blood pressure monitors, thermometers
- **Cosmetics**: Skincare, haircare, beauty products
- **Veterinary**: Animal medications, pet supplements

### Companies (Egyptian/Regional)

Pharco ( فاركو ), Eva Pharm ( إيفا فارم ), Amoun ( آمون ), Memphis Pharm ( ممفيس فارم ), Octoplus ( أوكتوبلس ), Siemens Healthineers ( سيمنس هيلثينيرز ), 3M ( ثري إم ), Bayer ( باير ), Novartis ( نوفارتس ), GSK ( جي إس كي ), Pfizer ( فايزر ), MERCK ( ميرك ), Hikma ( هشامة ), Jamjoon ( جموjoon ), plus international manufacturers

### Naming Convention

ALL generated text (products, companies, categories, variants) uses bilingual format:
`{English_name} {Arabic_name}`

Examples:

- Product: "Acetaminophen 500mg Tablets باراسيتامول 500 مجم أقراص"
- Company: "Pharco فاركو"
- Category: "OTC Medicines أدوية بدون روشتة"
- Variant: "500mg 500 مجم"

### Quantity

60+ products with 4-5 variants each

---

## 5. Variant Seed Data

### Attributes per variant

- **SKU**: Format `SKU-{product_id:04}-{variant_index:02}`
- **Variant name**: Realistic pharmaceutical names (e.g., "25mg tablets", "50ml suspension")
- **UOM ID**: 1-7 mapping to (pcs, m, kg, L, box, roll, set)
- **Prices**: retail, wholesale (75% of retail), distribution (60% of retail)

### Variant types per category

- **Tablets/Capsules**: strength (100mg, 200mg, 500mg)
- **Syrups/Suspensions**: volume (60ml, 100ml, 200ml)
- **Injectables**: volume (5ml, 10ml, 20ml)
- **Topicals**: size (10g, 20g, 50g)
- **Devices**: model variants

---

## 6. Warehouse Seed Data

5 Egyptian warehouses:

| Name                    | Location   | Role                         |
| ----------------------- | ---------- | ---------------------------- |
| مركز التوزيع المركزي    | القاهرة    | Primary - receives purchases |
| منشأة الساحل الشمالي    | الإسكندرية | Transfer only                |
| المخزن الإقليمي الشمالي | المنصورة   | Transfer only                |
| المستودع الجنوبي        | أسيوط      | Mixed                        |
| مركز الصعيد             | سوهاج      | Transfer only                |

---

## 7. Movement System Design

### Transaction Pattern

Every movement executes as a transaction:

```sql
BEGIN TRANSACTION;

-- UPDATE stock_levels based on movement type
-- INSERT INTO stock_movements for audit

COMMIT;
```

### Movement Types

| Type     | from_warehouse      | to_warehouse   | Stock Effect          |
| -------- | ------------------- | -------------- | --------------------- |
| PURCHASE | NULL                | destination    | +quantity             |
| TRANSFER | source              | destination    | -source, +destination |
| SALE     | source              | NULL           | -quantity             |
| ADJUST   | destination OR NULL | source OR NULL | +/-quantity           |

### Core Functions

```rust
// Execute a movement with transaction
pub fn execute_movement(
    conn: &Connection,
    variant_id: i64,
    from_warehouse_id: Option<i64>,
    to_warehouse_id: Option<i64>,
    quantity: f64,
    movement_type: &str,
) -> Result<(), String>

// Update existing stock level
fn update_stock_level(conn: &Connection, variant_id: i64, warehouse_id: i64, delta: f64) -> Result<(), String>

// Insert or update stock level
fn upsert_stock_level(conn: &Connection, variant_id: i64, warehouse_id: i64, delta: f64) -> Result<(), String>
```

### Seeding Movements

For each variant:

1. **Purchase** to Cairo warehouse (50-500 units)
2. **Transfers** to other warehouses based on location:
   - Cairo → Alexandria (30% of purchase)
   - Cairo → Mansoura (20% of purchase)
   - Cairo → Asyut (15% of purchase, 50% probability)
3. **Sales** from various warehouses (2-5 per variant)
4. **Adjustments** for corrections (0-2 per variant)

---

## 8. Commands

### New Commands (stock_movements.rs)

```rust
#[tauri::command]
pub async fn create_transfer(
    app: AppHandle,
    variant_id: String,
    from_warehouse: String,
    to_warehouse: String,
    quantity: f64,
) -> Result<(), String>

#[tauri::command]
pub async fn create_purchase(
    app: AppHandle,
    variant_id: String,
    to_warehouse: String,
    quantity: f64,
) -> Result<(), String>

#[tauri::command]
pub async fn create_sale(
    app: AppHandle,
    variant_id: String,
    from_warehouse: String,
    quantity: f64,
) -> Result<(), String>

#[tauri::command]
pub async fn create_adjustment(
    app: AppHandle,
    variant_id: String,
    warehouse_id: String,
    quantity: f64, // positive or negative
) -> Result<(), String>
```

---

## 9. Implementation Notes

- Seeding guarded by count check (only seeds if table is empty)
- All movement operations use transactions for consistency
- stock_movements is INSERT-only (audit log)
- stock_levels is UPDATE/INSERT (current state)
- Movements use same functions for both seeding and live operations
