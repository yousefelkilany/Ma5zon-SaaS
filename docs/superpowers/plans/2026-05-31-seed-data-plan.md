# Seed Data Extraction & Stock Movement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract seed data from command files into dedicated seed modules, implement coherent stock movement system where stock_levels is maintained via transactional operations that also create audit logs.

**Architecture:** Seed data stored as const arrays in `src-tauri/src/seed/` modules. Movement system uses transactional UPDATE/INSERT pattern to maintain both stock_levels (current state) and stock_movements (audit log). Same functions used for both seeding and live operations.

**Tech Stack:** Rust (rusqlite, async_trait), SQLite

---

## File Structure

```
src-tauri/src/
├── seed/
│   ├── mod.rs              (reexports + seeding orchestration)
│   ├── products.rs         (60+ pharmaceutical products)
│   ├── variants.rs         (4-5 variants per product)
│   ├── warehouses.rs       (5 Egyptian warehouses)
│   └── movements.rs        (purchase + transfer + sale + adjust movements)
├── commands/
│   ├── mod.rs              (add stock_movements reexport)
│   ├── stocks.rs           (REMOVE seed functions, keep queries)
│   └── stock_movements.rs  (NEW - movement commands)
```

---

## Task 1: Create seed/mod.rs

**Files:**

- Create: `src-tauri/src/seed/mod.rs`

- [ ] **Step 1: Write seed/mod.rs**

```rust
//! Seed data modules for database initialization.
//!
//! Seed data is extracted from command files into dedicated modules for better
//! organization and maintainability.

pub mod products;
pub mod variants;
pub mod warehouses;
pub mod movements;

use async_trait::async_trait;
use rusqlite::Connection;
use tauri::AppHandle;

use crate::commands::db_utils::get_conn;

#[async_trait]
pub trait Seedable: Send + Sync {
    fn seed(&self, conn: &Connection) -> Result<(), String>;
}

pub async fn seed_all(app: &AppHandle) -> Result<(), String> {
    let conn = get_conn(app)?;

    // Seed in dependency order: products → variants → warehouses → movements
    products::seed(&conn)?;
    variants::seed(&conn)?;
    warehouses::seed(&conn)?;
    movements::seed(&conn)?;

    log::info!("[seed] All seed data loaded successfully");
    Ok(())
}
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS (empty module with no errors)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/seed/mod.rs
git commit -m "feat: add seed module structure"
```

---

## Task 2: Extract Products Seed

**Files:**

- Create: `src-tauri/src/seed/products.rs`

- [ ] **Step 1: Write seed/products.rs with 60+ pharmaceutical products (bilingual names)**

```rust
//! Product seed data - Egyptian pharmaceutical products
//!
//! ALL names use bilingual format: "{English_name} {Arabic_name}"
//! Categories: OTC Medicines, Prescription, Supplements, Medical Devices,
//! Cosmetics, Veterinary

use rusqlite::Connection;
use chrono::Local;

pub const PRODUCTS: &[(&str, &str, &str)] = &[
    // OTC Medicines
    ("Pharco فاركو", "Acetaminophen 500mg Tablets باراسيتامول 500 مجم أقراص", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Acetaminophen Syrup 120ml باراسيتامول شراب 120 مل", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Ibuprofen 400mg Tablets إيبوبروفين 400 مجم أقراص", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Ibuprofen Syrup 100ml إيبوبروفين شراب 100 مل", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Omeprazole 20mg Capsules أوميبرازول 20 مجم كبسولات", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Paracetamol 500mg Tablets باراسيتامول 500 مجم أقراص", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Vitamin C 500mg Tablets فيتامين سي 500 مجم أقراص", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Multivitamin Tablets أقراص فيتامينات متعددة", "OTC Medicines أدوية بدون روشتة"),
    // Prescription Medicines
    ("Amoun آمون", "Amoxicillin 500mg Capsules أموكسيسيلين 500 مجم كبسولات", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Amoxicillin Syrup 125mg أموكسيسيلين شراب 125 مجم", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Azithromycin 500mg Tablets أزيثرومايسين 500 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Ceftriaxone 1g Injection سيفترياكسون 1 جم حقن", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Metronidazole 500mg Tablets ميترونيدازول 500 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Omeprazole 20mg Capsules أوميبرازول 20 مجم كبسولات", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Lansoprazole 30mg Capsules لانسوبرازول 30 مجم كبسولات", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Metformin 500mg Tablets ميتفورمين 500 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Glimepiride 2mg Tablets غليمبيريد 2 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Enalapril 10mg Tablets إينالابريل 10 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    // Supplements
    ("Eva Pharm إيفا فارم", "Calcium 500mg + Vitamin D Tablets كالسيوم 500 مجم + فيتامين د أقراص", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Zinc 50mg Tablets زنك 50 مجم أقراص", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Magnesium 400mg Tablets مغنيسيوم 400 مجم أقراص", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Iron 60mg Tablets حديد 60 مجم أقراص", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Vitamin B-Complex Capsules فيتامين ب كومبلكس كبسولات", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Omega-3 1000mg Capsules أوميغا-3 1000 مجم كبسولات", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Collagen 5000mg Sachets كولاجين 5000 مجم أكياس", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Protein Powder 1kg بروتين بودرة 1 كجم", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Creatine 300g Creatine 300 جرام", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "BCAA Powder بي سي أي إيه بودرة", "Supplements مكملات غذائية"),
    // Medical Devices
    ("Siemens Healthineers سيمنس هيلثينيرز", "Glucometer Device جهاز قياس السكر", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Glucose Test Strips 50pcs شرائط قياس السكر 50 شريطة", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Digital Blood Pressure Monitor جهاز قياس الضغط الرقمي", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Digital Thermometer جهاز قياس الحرارة الرقمي", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Pulse Oximeter جهاز قياس الأكسجين", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "First Aid Kit طقم الإسعاف الأولي", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Medical Masks 50pcs أقنعة طبية 50 شريطة", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Alcohol Swabs 100pcs قطع كحول 100 شريطة", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Surgical Tape 5cm شريط جراحي 5 سم", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Bandages 100pcs bandages 100 شريطة", "Medical Devices أجهزة طبية"),
    // Cosmetics
    ("Nivea نيفيا", "Moisturizing Cream 200ml كريم مرطب 200 مل", "Cosmetics تجميل"),
    ("Nivea نيفيا", "Daily Face Wash 150ml غسول يومي للوجه 150 مل", "Cosmetics تجميل"),
    ("Nivea نيفيا", "Sun Protection SPF50 100ml واقي شمس SPF50 100 مل", "Cosmetics تجميل"),
    ("Nivea نيفيا", "Vitamin C Serum 30ml سيروم فيتامين سي 30 مل", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Anti-Aging Cream 50ml كريم مكافحة الشيخوخة 50 مل", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Hydrating Serum 30ml سيروم ترطيب 30 مل", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Hair Shampoo 400ml شامبو للشعر 400 مل", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Hair Conditioner 400ml بلسم للشعر 400 مل", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Face Mask Sheet 10pcs ماسك وجه 10 شريطة", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Lipstick أحمر شفاه", "Cosmetics تجميل"),
    // Veterinary
    ("Memphis Pharm ممفيس فارم", "Enrofloxacin 10% Solution إنروفلوكساسين 10% محلول", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Ivermectin Injection 1% إيفرميكتين حقن 1%", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Vitamin B Complex Injection فيتامين ب كومبلكس حقن", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Dewormer Tablets 10pcs أقراص طارد للديدان 10 شريطة", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Oxytetracycline 20% أوكسيتيتراسيكلين 20%", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Anti-Flea Spray بخاخ مضاد للبراغيث", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Pet Vitamin Syrup 100ml فيتامين حيوانات شراب 100 مل", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Electrolyte Solution 500ml محلول إلكتروليت 500 مل", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Wound Healing Spray بخاخ التئام الجروح", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Eye Drops for Animals قطرات عين للحيوانات", "Veterinary طب بيطري"),
    // Additional products
    ("Novartis نوفارتس", "Diclofenac 75mg Tablets ديكلوفيناك 75 مجم أقراص", "OTC Medicines أدوية بدون روشتة"),
    ("Novartis نوفارتس", "Diclofenac Gel 50g جل ديكلوفيناك 50 جم", "OTC Medicines أدوية بدون روشتة"),
    ("GSK جي إس كي", "Ranitidine 150mg Tablets رانيتيدين 150 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("GSK جي إس كي", "Ranitidine 300mg Tablets رانيتيدين 300 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Bayer باير", "Aspirin 100mg Tablets أسبرين 100 مجم أقراص", "OTC Medicines أدوية بدون روشتة"),
    ("Bayer باير", "Aspirin Protect 100mg أسبرين بروتكت 100 مجم", "Prescription Medicines أدوية روشتة"),
    ("Pfizer فايزر", "Sildenafil 50mg Tablets سيلدينافيل 50 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Pfizer فايزر", "Tamsulosin 0.4mg Capsules تامسولوسين 0.4 مجم كبسولات", "Prescription Medicines أدوية روشتة"),
    ("MERCK ميرك", "Ferrous Sulfate 325mg Tablets سلفات الحديد 325 مجم أقراص", "Supplements مكملات غذائية"),
    ("MERCK ميرك", "Ferrous Gluconate 300mg Tablets غلوكونات الحديد 300 مجم أقراص", "Supplements مكملات غذائية"),
    ("Hikma هشامة", "Omeprazole 20mg Capsules أوميبرازول 20 مجم كبسولات", "Prescription Medicines أدوية روشتة"),
    ("Hikma هشامة", "Metformin 850mg Tablets ميتفورمين 850 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Hikma هشامة", "Amlodipine 5mg Tablets أملوديبين 5 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Hikma هشامة", "Atorvastatin 20mg Tablets أتورفاستاتين 20 مجم أقراص", "Prescription Medicines أدوية روشتة"),
    ("Octoplus أوكتوبلس", "Vitamin D3 5000 IU Softgels فيتامين د3 5000 وحدة دولية كبسولات", "Supplements مكملات غذائية"),
    ("Octoplus أوكتوبلس", "Vitamin B12 1000mcg Tablets فيتامين ب12 1000 ميكروجرام أقراص", "Supplements مكملات غذائية"),
    ("Octoplus أوكتوبلس", "Folic Acid 5mg Tablets حمض الفوليك 5 مجم أقراص", "Supplements مكملات غذائية"),
    ("Octoplus أوكتوبلس", "Biotin 10000mcg Tablets بيوتين 10000 ميكروجرام أقراص", "Supplements مكملات غذائية"),
    ("Jamjoon جومجون", "Clotrimazole Cream 1% كلوتريمازول كريم 1%", "OTC Medicines أدوية بدون روشتة"),
    ("Jamjoon جومجون", "Clotrimazole Solution 1% كلوتريمازول محلول 1%", "OTC Medicines أدوية بدون روشتة"),
    ("Jamjoon جومجون", "Miconazole Cream 2% ميكونازول كريم 2%", "OTC Medicines أدوية بدون روشتة"),
    ("Jamjoon جومجون", "Ketoconazole Cream 2% كيتوكونازول كريم 2%", "OTC Medicines أدوية بدون روشتة"),
];

pub fn seed(conn: &Connection) -> Result<(), String> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for product in PRODUCTS {
        conn.execute(
            "INSERT INTO products (company, name, category, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            [product.0, product.1, product.2, &now, &now],
        )
        .map_err(|e| format!("Failed to insert product {}: {}", product.1, e))?;
    }

    log::info!("[seed:products] Inserted {} products", PRODUCTS.len());
    Ok(())
}
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/seed/products.rs
git commit -m "feat: add products seed with 60+ pharmaceutical items"
```

---

## Task 3: Extract Variants Seed

**Files:**

- Create: `src-tauri/src/seed/variants.rs`

- [ ] **Step 1: Write seed/variants.rs (bilingual variant names)**

```rust
//! Variant seed data - 4-5 variants per product
//!
//! ALL names use bilingual format: "{English_name} {Arabic_name}"
//! Realistic pharmaceutical variant types: strength, volume, packaging

use rusqlite::Connection;
use rand::Rng;

pub struct VariantTemplate<'a> {
    pub options: Vec<&'a str>,
    pub unit: &'a str,
}

pub const VARIANT_TEMPLATES: &[(&str, Vec<&str>, &str)] = &[
    ("Tablet أقراص", vec!["10mg 10 مجم", "25mg 25 مجم", "50mg 50 مجم", "100mg 100 مجم"], "mg مجم"),
    ("Capsule كبسولة", vec!["100mg 100 مجم", "200mg 200 مجم", "300mg 300 مجم", "500mg 500 مجم"], "mg مجم"),
    ("Syrup شراب", vec!["60ml 60 مل", "100ml 100 مل", "120ml 120 مل", "200ml 200 مل"], "ml مل"),
    ("Injection حقن", vec!["5ml 5 مل", "10ml 10 مل", "20ml 20 مل", "50ml 50 مل"], "ml مل"),
    ("Cream كريم", vec!["10g 10 جم", "20g 20 جم", "30g 30 جم", "50g 50 جم"], "g جم"),
    ("Ointment مرهم", vec!["10g 10 جم", "20g 20 جم", "40g 40 جم"], "g جم"),
    ("Spray بخاخ", vec!["50ml 50 مل", "100ml 100 مل", "200ml 200 مل"], "ml مل"),
    ("Drops قطرات", vec!["5ml 5 مل", "10ml 10 مل", "15ml 15 مل"], "ml مل"),
    (" Sachets أكياس", vec!["10s 10 شريطة", "20s 20 شريطة", "30s 30 شريطة", "50s 50 شريطة"], "s شريطة"),
    ("Solution محلول", vec!["50ml 50 مل", "100ml 100 مل", "250ml 250 مل"], "ml مل"),
];

pub const UOM_NAMES: &[&str] = &["pcs قطعة", "m متر", "kg كيلو", "L لتر", "box علبة", "roll بكرة", "set طقم"];

pub fn seed(conn: &Connection) -> Result<(), String> {
    let mut rng = rand::thread_rng();

    // Get all product IDs
    let product_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM active_products ORDER BY id")
            .map_err(|e| format!("Failed to prepare: {e}"))?;
        stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect: {e}"))?
    };

    let mut variant_count = 0;

    for (i, product_id) in product_ids.iter().enumerate() {
        let num_variants = rng.gen_range(2..=4);
        let template = &VARIANT_TEMPLATES[i % VARIANT_TEMPLATES.len()];
        let options = &template.1;

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
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/seed/variants.rs
git commit -m "feat: add variants seed with 4-5 per product"
```

---

## Task 4: Extract Warehouses Seed

**Files:**

- Create: `src-tauri/src/seed/warehouses.rs`

- [ ] **Step 1: Write seed/warehouses.rs (bilingual names)**

```rust
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
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/seed/warehouses.rs
git commit -m "feat: add warehouses seed with 5 Egyptian locations"
```

---

## Task 5: Create Movement Core Functions

**Files:**

- Create: `src-tauri/src/commands/stock_movements.rs`

- [ ] **Step 1: Write stock_movements.rs with core movement functions**

```rust
//! Stock movement commands - maintains both stock_levels and stock_movements
//!
//! Uses transactional pattern to ensure consistency between current state
//! and audit log.

use rusqlite::{params, Connection};
use tauri::AppHandle;
use chrono::Local;

use crate::commands::db_utils::get_conn;

pub fn execute_movement(
    conn: &Connection,
    variant_id: i64,
    from_warehouse_id: Option<i64>,
    to_warehouse_id: Option<i64>,
    quantity: f64,
    movement_type: &str,
) -> Result<(), String> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Failed to begin transaction: {e}"))?;

    match movement_type {
        "PURCHASE" => {
            let to_warehouse = to_warehouse_id.ok_or("PURCHASE requires to_warehouse")?;
            upsert_stock_level(conn, variant_id, to_warehouse, quantity)?;
        }
        "SALE" => {
            let from_warehouse = from_warehouse_id.ok_or("SALE requires from_warehouse")?;
            update_stock_level(conn, variant_id, from_warehouse, -quantity)?;
        }
        "TRANSFER" => {
            let from_warehouse = from_warehouse_id.ok_or("TRANSFER requires from_warehouse")?;
            let to_warehouse = to_warehouse_id.ok_or("TRANSFER requires to_warehouse")?;
            update_stock_level(conn, variant_id, from_warehouse, -quantity)?;
            upsert_stock_level(conn, variant_id, to_warehouse, quantity)?;
        }
        "ADJUST" => {
            if let Some(to_warehouse) = to_warehouse_id {
                upsert_stock_level(conn, variant_id, to_warehouse, quantity)?;
            } else if let Some(from_warehouse) = from_warehouse_id {
                update_stock_level(conn, variant_id, from_warehouse, -quantity)?;
            } else {
                return Err("ADJUST requires either to_warehouse or from_warehouse".to_string());
            }
        }
        _ => return Err(format!("Unknown movement type: {}", movement_type)),
    }

    conn.execute(
        "INSERT INTO stock_movements (variant_id, from_warehouse_id, to_warehouse_id, quantity, type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![variant_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, now],
    )
    .map_err(|e| format!("Failed to insert movement: {e}"))?;

    conn.execute("COMMIT", [])
        .map_err(|e| format!("Failed to commit transaction: {e}"))?;

    Ok(())
}

fn update_stock_level(conn: &Connection, variant_id: i64, warehouse_id: i64, delta: f64) -> Result<(), String> {
    let affected = conn.execute(
        "UPDATE stock_levels SET quantity = quantity + ?1 WHERE variant_id = ?2 AND warehouse_id = ?3",
        params![delta, variant_id, warehouse_id],
    )
    .map_err(|e| format!("Failed to update stock level: {e}"))?;

    if affected == 0 {
        return Err(format!("No stock level found for variant {} at warehouse {}", variant_id, warehouse_id));
    }

    Ok(())
}

fn upsert_stock_level(conn: &Connection, variant_id: i64, warehouse_id: i64, delta: f64) -> Result<(), String> {
    let affected = conn.execute(
        "UPDATE stock_levels SET quantity = quantity + ?1 WHERE variant_id = ?2 AND warehouse_id = ?3",
        params![delta, variant_id, warehouse_id],
    )
    .map_err(|e| format!("Failed to update stock level: {e}"))?;

    if affected == 0 {
        conn.execute(
            "INSERT INTO stock_levels (variant_id, warehouse_id, quantity) VALUES (?1, ?2, ?3)",
            params![variant_id, warehouse_id, delta],
        )
        .map_err(|e| format!("Failed to insert stock level: {e}"))?;
    }

    Ok(())
}

// Movement commands

#[tauri::command]
#[specta::specta]
pub async fn create_transfer(
    app: AppHandle,
    variant_id: String,
    from_warehouse: String,
    to_warehouse: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let from_wh_i64: i64 = from_warehouse.parse().map_err(|e| format!("Invalid from_warehouse: {e}"))?;
    let to_wh_i64: i64 = to_warehouse.parse().map_err(|e| format!("Invalid to_warehouse: {e}"))?;

    execute_movement(&conn, variant_id_i64, Some(from_wh_i64), Some(to_wh_i64), quantity, "TRANSFER")?;
    log::info!("[create_transfer] Transferred {} of variant {} from {} to {}", quantity, variant_id, from_warehouse, to_warehouse);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn create_purchase(
    app: AppHandle,
    variant_id: String,
    to_warehouse: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let to_wh_i64: i64 = to_warehouse.parse().map_err(|e| format!("Invalid to_warehouse: {e}"))?;

    execute_movement(&conn, variant_id_i64, None, Some(to_wh_i64), quantity, "PURCHASE")?;
    log::info!("[create_purchase] Purchased {} of variant {} to warehouse {}", quantity, variant_id, to_warehouse);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn create_sale(
    app: AppHandle,
    variant_id: String,
    from_warehouse: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let from_wh_i64: i64 = from_warehouse.parse().map_err(|e| format!("Invalid from_warehouse: {e}"))?;

    execute_movement(&conn, variant_id_i64, Some(from_wh_i64), None, quantity, "SALE")?;
    log::info!("[create_sale] Sold {} of variant {} from warehouse {}", quantity, variant_id, from_warehouse);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn create_adjustment(
    app: AppHandle,
    variant_id: String,
    warehouse_id: String,
    quantity: f64,
) -> Result<(), String> {
    let conn = get_conn(&app)?;
    let variant_id_i64: i64 = variant_id.parse().map_err(|e| format!("Invalid variant_id: {e}"))?;
    let wh_i64: i64 = warehouse_id.parse().map_err(|e| format!("Invalid warehouse_id: {e}"))?;

    if quantity >= 0.0 {
        execute_movement(&conn, variant_id_i64, None, Some(wh_i64), quantity, "ADJUST")?;
    } else {
        execute_movement(&conn, variant_id_i64, Some(wh_i64), None, quantity.abs(), "ADJUST")?;
    }
    log::info!("[create_adjustment] Adjusted {} of variant {} at warehouse {}", quantity, variant_id, warehouse_id);
    Ok(())
}
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/stock_movements.rs
git commit -m "feat: add stock_movements commands with transactional pattern"
```

---

## Task 6: Create Movements Seed

**Files:**

- Create: `src-tauri/src/seed/movements.rs`

- [ ] **Step 1: Write seed/movements.rs**

```rust
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

    // Get all variant IDs and warehouse IDs
    let variant_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM product_variants ORDER BY id")
            .map_err(|e| format!("Failed to prepare: {e}"))?;
        stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect: {e}"))?
    };

    let warehouse_ids: Vec<i64> = {
        let mut stmt = conn
            .prepare("SELECT id FROM active_warehouses ORDER BY id")
            .map_err(|e| format!("Failed to prepare: {e}"))?;
        stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to query: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect: {e}"))?
    };

    if warehouse_ids.len() < 5 {
        return Err("Expected at least 5 warehouses for seed data".to_string());
    }

    // Cairo is primary (index 0), others receive transfers
    let cairo_wh = warehouse_ids[0];
    let alexandria_wh = warehouse_ids[1];
    let mansoura_wh = warehouse_ids[2];
    let asyut_wh = warehouse_ids[3];
    let sohag_wh = warehouse_ids[4];

    let base_date = chrono::NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
    let days_span = 60;

    for variant_id in variant_ids {
        // 1. Purchase to Cairo
        let purchase_qty: f64 = ((rng.gen_range(50.0_f64..500.0_f64) * 100.0).round()) / 100.0;
        execute_movement(conn, variant_id, None, Some(cairo_wh), purchase_qty, "PURCHASE")
            .map_err(|e| format!("Failed purchase: {}", e))?;

        // 2. Transfer to Alexandria (30% of purchase)
        let transfer_qty = (purchase_qty * 0.3 * 100.0).round() / 100.0;
        execute_movement(conn, variant_id, Some(cairo_wh), Some(alexandria_wh), transfer_qty, "TRANSFER")
            .map_err(|e| format!("Failed transfer to Alexandria: {}", e))?;

        // 3. Transfer to Mansoura (20% of purchase)
        let transfer_qty = (purchase_qty * 0.2 * 100.0).round() / 100.0;
        execute_movement(conn, variant_id, Some(cairo_wh), Some(mansoura_wh), transfer_qty, "TRANSFER")
            .map_err(|e| format!("Failed transfer to Mansoura: {}", e))?;

        // 4. Occasional transfer to Asyut (50% probability, 15% of purchase)
        if rng.gen_bool(0.5) {
            let transfer_qty = (purchase_qty * 0.15 * 100.0).round() / 100.0;
            execute_movement(conn, variant_id, Some(cairo_wh), Some(asyut_wh), transfer_qty, "TRANSFER")
                .map_err(|e| format!("Failed transfer to Asyut: {}", e))?;
        }

        // 5. Occasional transfer to Sohag (30% probability, 10% of purchase)
        if rng.gen_bool(0.3) {
            let transfer_qty = (purchase_qty * 0.1 * 100.0).round() / 100.0;
            execute_movement(conn, variant_id, Some(cairo_wh), Some(sohag_wh), transfer_qty, "TRANSFER")
                .map_err(|e| format!("Failed transfer to Sohag: {}", e))?;
        }

        // 6. Sales from various warehouses (2-4 per variant)
        let num_sales = rng.gen_range(2..=4);
        for _ in 0..num_sales {
            let from_wh = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
            let sale_qty = ((rng.gen_range(1.0_f64..50.0_f64) * 100.0).round()) / 100.0;
            execute_movement(conn, variant_id, Some(from_wh), None, sale_qty, "SALE")
                .map_err(|e| format!("Failed sale: {}", e))?;
        }

        // 7. Adjustments (0-2 per variant)
        let num_adjustments = rng.gen_range(0..=2);
        for _ in 0..num_adjustments {
            let wh = warehouse_ids[rng.gen_range(0..warehouse_ids.len())];
            let is_positive = rng.gen_bool(0.5);
            let adj_qty = ((rng.gen_range(1.0_f64..30.0_f64) * 100.0).round()) / 100.0;
            if is_positive {
                execute_movement(conn, variant_id, None, Some(wh), adj_qty, "ADJUST")
                    .map_err(|e| format!("Failed positive adjustment: {}", e))?;
            } else {
                execute_movement(conn, variant_id, Some(wh), None, adj_qty, "ADJUST")
                    .map_err(|e| format!("Failed negative adjustment: {}", e))?;
            }
        }
    }

    log::info!("[seed:movements] Seeded movements for {} variants", variant_ids.len());
    Ok(())
}
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/seed/movements.rs
git commit -m "feat: add movements seed with purchase/transfer/sale/adjust pattern"
```

---

## Task 7: Update commands/mod.rs

**Files:**

- Modify: `src-tauri/src/commands/mod.rs:1-20`

- [ ] **Step 1: Add stock_movements reexport**

Add to mod.rs after line with `pub mod stocks`:

```rust
pub mod stock_movements;
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/mod.rs
git commit -m "feat: add stock_movements module export"
```

---

## Task 8: Remove Seed Functions from stocks.rs

**Files:**

- Modify: `src-tauri/src/commands/stocks.rs` (remove seed_stock_levels and seed_stock_movements functions)

- [ ] **Step 1: Remove seed functions from stocks.rs**

Remove:

- `StockInitializer` struct and implementation
- `seed_stock_levels` function
- `seed_stock_movements` function

Keep only:

- `StockLevel`, `StockMovement`, `StockLevelWithVariant`, `ProductWithStock`, `VariantWithStock` structs
- All `#[tauri::command]` functions (stock_levels_get_all, etc.)

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/stocks.rs
git commit -m "refactor: remove seed functions from stocks.rs (moved to seed module)"
```

---

## Task 9: Update TABLE_INITIALIZERS

**Files:**

- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Remove StockInitializer from TABLE_INITIALIZERS**

```rust
pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
    &WarehousesInitializer,
    // StockInitializer removed - stock levels are seeded via movements
];
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/mod.rs
git commit -m "refactor: remove StockInitializer from TABLE_INITIALIZERS"
```

And add a new function to trigger seed:

```rust
pub async fn seed_database(app: &AppHandle) -> Result<(), String> {
    crate::seed::seed_all(app).await
}
```

Actually wait — looking at the original code, the seeding is handled by the `init_and_seed` methods on the initializers. Let me re-check how this works.

Looking at the original code:

- `stocks.rs` has `StockInitializer` with `init_and_seed` that calls `seed_stock_levels` and `seed_stock_movements`
- `mod.rs` has `TABLE_INITIALIZERS` array that references all initializers

The new design moves seeds to `seed/` module. I need to:

1. Remove `StockInitializer` from the initializers array (since stock levels are now seeded via movements)
2. Make sure the seeding order is correct

Actually, the seed order in the new system is:

- products → variants → warehouses → movements

The movements seeding internally will create stock_levels. So we don't need StockInitializer in the TABLE_INITIALIZERS anymore.

Let me adjust this task:

- [ ] **Step 1: Update TABLE_INITIALIZERS to remove StockInitializer**

```rust
// In mod.rs, remove StockInitializer from TABLE_INITIALIZERS
pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
    &WarehousesInitializer,
    // StockInitializer removed - stock levels are now seeded via movements
];
```

And add a separate seed trigger:

```rust
pub async fn seed_all_data(app: &AppHandle) -> Result<(), String> {
    // Seed in dependency order
    let conn = get_conn(app)?;

    // Run each initializer in order
    UserInitializer.init_and_seed(app).await?;
    ProductsInitializer.init_and_seed(app).await?;
    VariantsInitializer.init_and_seed(app).await?;
    WarehousesInitializer.init_and_seed(app).await?;

    // For stock, we seed via movements after variants and warehouses exist
    // This is handled by the seed module
    crate::seed::products::seed(&conn)?;
    crate::seed::variants::seed(&conn)?;
    crate::seed::warehouses::seed(&conn)?;
    crate::seed::movements::seed(&conn)?;

    Ok(())
}
```

Actually, looking at the code more carefully, the initializers already do the seeding internally via `init_and_seed`. The pattern is:

1. Each initializer's `init_and_seed` creates the table and seeds data if empty
2. The order in `TABLE_INITIALIZERS` matters for foreign key dependencies

So the proper fix is:

- Keep `StockInitializer` but simplify it to only create tables (not seed) OR
- Remove `StockInitializer` from `TABLE_INITIALIZERS` and handle stock seeding in the `seed` module

The cleanest approach is to remove StockInitializer from TABLE_INITIALIZERS since:

1. We already removed seed functions from stocks.rs
2. The seed module's movements.rs will create stock_levels via transactions

- [ ] **Step 1: Update TABLE_INITIALIZERS**

```rust
pub const TABLE_INITIALIZERS: &[&dyn DatabaseInitializable] = &[
    &UserInitializer,
    &ProductsInitializer,
    &VariantsInitializer,
    &WarehousesInitializer,
    // StockInitializer removed - stock levels are seeded via movements
];
```

- [ ] **Step 2: Run to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/mod.rs
git commit -m "refactor: remove StockInitializer from TABLE_INITIALIZERS"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full cargo check**

Run: `cd src-tauri && cargo check`
Expected: PASS with no warnings

- [ ] **Step 2: Commit final changes**

```bash
git add -A && git commit -m "feat: complete seed data extraction and stock movement system"
```

---

## Summary

| Task | Description                                         |
| ---- | --------------------------------------------------- |
| 1    | Create seed/mod.rs                                  |
| 2    | Create seed/products.rs (60+ products)              |
| 3    | Create seed/variants.rs (4-5 per product)           |
| 4    | Create seed/warehouses.rs (5 warehouses)            |
| 5    | Create commands/stock_movements.rs (core functions) |
| 6    | Create seed/movements.rs (movement seeding)         |
| 7    | Update commands/mod.rs (add stock_movements)        |
| 8    | Remove seed functions from stocks.rs                |
| 9    | Update TABLE_INITIALIZERS                           |
| 10   | Final verification                                  |
