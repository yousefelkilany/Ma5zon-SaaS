# Warehouse Inventory System Design

## Overview

Add warehouse inventory management tables (warehouses, stock_levels, stock_movements) with Arabic/Egyptian seed data. Also regenerate existing products and variants seed data in Arabic.

## Module Structure

### New Files

- `src-tauri/src/commands/warehouses.rs` — warehouses table + CRUD commands + seeder
- `src-tauri/src/commands/stock.rs` — stock_levels + stock_movements tables + CRUD commands + seeders

### Modified Files

- `src-tauri/src/commands/products.rs` — update seed data to Arabic
- `src-tauri/src/commands/variants.rs` — update variant options to Arabic
- `src-tauri/src/commands/mod.rs` — register new initializers

## Types

```rust
struct Warehouse {
    id: String,
    name: String,
    location: String,
}

struct StockLevel {
    variant_id: String,
    warehouse_id: String,
    quantity: f64,
}

struct StockMovement {
    id: String,
    variant_id: String,
    from_warehouse_id: Option<String>,
    to_warehouse_id: Option<String>,
    quantity: f64,
    movement_type: String, // TRANSFER, PURCHASE, SALE, ADJUST
    created_at: String,
}
```

## Database Tables

### warehouses

```sql
CREATE TABLE warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT
);
```

### stock_levels

```sql
CREATE TABLE stock_levels (
    variant_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (variant_id, warehouse_id),
    FOREIGN KEY(variant_id) REFERENCES product_variants(id),
    FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
);
```

### stock_movements

```sql
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    from_warehouse_id INTEGER,
    to_warehouse_id INTEGER,
    quantity REAL NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Seed Data (Arabic/Egyptian)

### Warehouses (5)

| Name                    | Location   |
| ----------------------- | ---------- |
| مركز التوزيع المركزي    | القاهرة    |
| منشأة الساحل الشمالي    | الإسكندرية |
| المخزن الإقليمي الشمالي | المنصورة   |
| المستودع الجنوبي        | أسيوط      |
| مركز الصعيد             | سوهاج      |

### Products (40 items)

```rust
let products = vec![
    "محرك كهربائي صناعي", "وحدة تحكم إلكترونية", "وحدة هيدروليكية",
    "طقم bearings دقيق", "طقم براغي ستانلس ستيل", "لوحة عرض LED",
    "لوح عزل حراري", "حامل ألياف كربون", "حزمة أسلاك نحاسية",
    "ملف ألومنيوم", "ختم مطاطي", "غطاء بلاستيكي",
    "عدسة زجاجية", "موصل نحاسي", "لوحة تيتانيوم",
    "مصفوفة مكثفات سيراميك", "حساس encoder مغناطيسي", "أسطوانة هوائية",
    "صندوق تقاطع ألواح شمسية", "طقم تروس مركب", "موجّه موجات صوتي",
    "حزمة ألياف بصرية", "محول تردد عالي", "بطارية طوارئ",
    "متحكم محرك سيرفو", "سكة توجيه خطية", "صمام تخفيف ضغط",
    "ثرموستات معدن ثنائي", "حامل مضاد للاهتزاز", "وحدة هوائي تردد الراديو",
    "أنبوب ستانلس 316L", "هيكل بولي كربونات", "مبدد حراري جرافيت",
    "طقم مغناطيس نيوديميوم", "محمل بطانة PTFE", "مركب راتنج إيبوكسي",
    "طقم حلقة سيليكون", "أنبوب زجاجي بوريوسيليكات", "صفائح فولاذ ملفوفة",
    "طقم موصلات كهربائية", "صمام كروي", "جهاز استشعار درجة الحرارة",
];
```

### Variants Options

```rust
let variants_data = vec![
    (vec!["درجة أولى", "درجة صناعية", "درجة اقتصادية", "درجة ممتازة"], "درجة"),
    (vec!["10 وات", "25 وات", "50 وات", "100 وات"], "قدرة"),
    (vec!["120 فولت", "240 فولت", "480 فولت", "جهد مزدوج"], "جهد"),
    (vec!["ذكر", "أنثى", "بارب", "ضغط"], "موصل"),
    (vec!["1 م", "2 م", "5 م", "10 م"], "طول"),
    (vec!["ستانلس ستيل 304", "ستانلس ستيل 316", "ستانلس ستيل 430", "مجلفن"], "مادة"),
    (vec!["شفاف", "ملون", "مرآوي", "مضاد للتوهج"], "تشطيب"),
    (vec!["M3", "M4", "M5", "M6", "M8"], "مقاس"),
    (vec!["صغير", "وسط", "كبير", "كبير جداً"], "حجم"),
    (vec!["2 أمبير", "5 أمبير", "10 أمبير", "20 أمبير"], "أمبير"),
];
```

### Stock Levels

- Each variant gets stock in 2-5 random warehouses
- Quantity: random 50-2000 units per (variant_id, warehouse_id) pair

### Stock Movements (30-35 total)

- 25% each type: TRANSFER (تحويل), PURCHASE (شراء), SALE (بيع), ADJUST (تعديل) — approximately 8-9 each
- Dates spanning last 90 days from 2026-05-28
- Transfer: both from_warehouse_id and to_warehouse_id set
- Purchase: only to_warehouse_id set
- Sale: only from_warehouse_id set
- Adjust: positive quantity = add, negative = remove (stored as positive with type indicating direction)

## Commands

### warehouses.rs

- `warehouses_get_all` — list all warehouses
- `warehouses_get_by_id` — single warehouse by ID
- `warehouses_create` — create new warehouse (name, location)
- `warehouses_update` — update warehouse
- `warehouses_delete` — delete warehouse

### stock.rs

- `stock_levels_get_all` — all stock levels
- `stock_levels_get_by_variant` — stock for a variant across warehouses
- `stock_levels_get_by_warehouse` — all stock in a warehouse
- `stock_movements_get_all` — all movements
- `stock_movements_get_by_variant` — movement history for variant
- `stock_movements_create` — record a movement

## Initialization Order

1. UserInitializer (existing)
2. ProductsInitializer (updated seed)
3. VariantsInitializer (updated seed)
4. WarehousesInitializer (new)
5. StockInitializer (new)

StockInitializer must run after WarehousesInitializer since stock_levels foreign key references warehouses.

## Implementation Notes

- Follow existing `DatabaseInitializable` pattern for initializers
- Use `rand::Rng` for random distributions in seeders
- Movement types stored as TEXT strings matching the schema
- Stock movement creation does NOT auto-update stock_levels (manual reconciliation later if needed, or handled by separate adjustment command)
