# Product Variants with Expanded Row Design Specification

## 1. Overview

Implement CRUD commands for products, product_variants, and variant_prices tables using rusqlite. Integrate with the existing EntityWorkspace/DataTable architecture to display data from these tables with TanStack Table's expanded row feature showing variants beneath products.

## 2. Architecture

### 2.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                │
│ ┌─────────────────┐   ┌─────────────────┐   ┌────────────────┐ │
│ │EntityWorkspace  │──▶│  TanStack Query │──▶│   DataTable    │ │
│ │                 │   │  Fetches layout │   │  Renders rows  │ │
│ │                 │   │  + data + vars  │   │  + expansion   │ │
│ └─────────────────┘   └─────────────────┘   └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ BRIDGE (tauri-specta)                                           │
│    Type-safe commands auto-generated from Rust                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Rust + SQLite)                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Commands grouped by entity:                                 │ │
│ │   - products:: (get_all, get_by_id, create, update, delete)│ │
│ │   - variants:: (get_all, get_by_product, get_by_id, CRUD)  │ │
│ │   - prices:: (get_all, get_by_variant, CRUD)                │ │
│ │   - schema:: (get_table_layout)                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Expanded Row Flow

```
User clicks expand (chevron_right) on product row "ABC"
  → DataTable fires onRowToggleExpand(product_id)
  → If variants not cached, call commands.variants::get_by_product(product_id)
  → Store variants in local Map<product_id, Variant[]>
  → Render sub-table beneath product row
  → Columns: SKU | Variant Name | UOM | Price (for each price_list)
```

## 3. Database Schema

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    sku TEXT UNIQUE,
    variant_name TEXT,
    uom_id INTEGER,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE variant_prices (
    variant_id INTEGER,
    price_list_id INTEGER,
    price REAL NOT NULL,
    PRIMARY KEY (variant_id, price_list_id),
    FOREIGN KEY(variant_id) REFERENCES product_variants(id)
);

CREATE TABLE IF NOT EXISTS price_lists (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);
```

Note: `price_lists` table assumed to exist with id 1=retail, 2=wholesale, 3=distribution.

## 4. Rust Command Structure

### 4.1 File Organization

```
src-tauri/src/commands/
├── mod.rs              # Export all command modules
├── products.rs         # products:: namespace
├── variants.rs         # variants:: namespace
├── prices.rs           # prices:: namespace
├── schema.rs           # schema:: namespace
└── ...existing...
```

### 4.2 Module Structure

**`products.rs`**

```rust
#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<Product>, String>

#[tauri::command]
#[specta::specta]
pub async fn get_by_id(app: AppHandle, id: i64) -> Result<Option<Product>, String>

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, name: String) -> Result<Product, String>

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: i64, name: String) -> Result<Product, String>

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: i64) -> Result<(), String>
```

**`variants.rs`**

```rust
#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<Variant>, String>

#[tauri::command]
#[specta::specta]
pub async fn get_by_product(app: AppHandle, product_id: i64) -> Result<Vec<Variant>, String>

#[tauri::command]
#[specta::specta]
pub async fn get_by_id(app: AppHandle, id: i64) -> Result<Option<Variant>, String>

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, variant: NewVariant) -> Result<Variant, String>

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, id: i64, variant: UpdateVariant) -> Result<Variant, String>

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, id: i64) -> Result<(), String>
```

**`prices.rs`**

```rust
#[tauri::command]
#[specta::specta]
pub async fn get_all(app: AppHandle) -> Result<Vec<VariantPrice>, String>

#[tauri::command]
#[specta::specta]
pub async fn get_by_variant(app: AppHandle, variant_id: i64) -> Result<Vec<VariantPrice>, String>

#[tauri::command]
#[specta::specta]
pub async fn create(app: AppHandle, price: NewVariantPrice) -> Result<VariantPrice, String>

#[tauri::command]
#[specta::specta]
pub async fn update(app: AppHandle, variant_id: i64, price_list_id: i64, price: f64) -> Result<VariantPrice, String>

#[tauri::command]
#[specta::specta]
pub async fn delete(app: AppHandle, variant_id: i64, price_list_id: i64) -> Result<(), String>
```

**`schema.rs`**

```rust
#[tauri::command]
#[specta::specta]
pub async fn get_table_layout(app: AppHandle, table: &str) -> Result<TableLayout, String>

#[tauri::command]
#[specta::specta]
pub async fn init_product_tables(app: AppHandle) -> Result<(), String>
```

### 4.3 Data Types

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Product {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Variant {
    pub id: i64,
    pub product_id: i64,
    pub sku: String,
    pub variant_name: String,
    pub uom_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct VariantPrice {
    pub variant_id: i64,
    pub price_list_id: i64,
    pub price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TableLayout {
    pub table_name: String,
    pub columns: Vec<ColumnDef>,
}
```

### 4.4 Database Initialization

`init_product_tables` creates tables if not exist:

```rust
conn.execute("CREATE TABLE IF NOT EXISTS products (...)", [])?;
conn.execute("CREATE TABLE IF NOT EXISTS product_variants (...)", [])?;
conn.execute("CREATE TABLE IF NOT EXISTS variant_prices (...)", [])?;
conn.execute("CREATE TABLE IF NOT EXISTS price_lists (id INTEGER PRIMARY KEY, name TEXT NOT NULL)", [])?;
// Seed default price lists if empty
```

## 5. Frontend Changes

### 5.1 Types (`src/lib/types/entity.ts`)

Add interfaces for products/variants:

```typescript
export interface ProductRow {
  id: string
  name: string
  [key: string]: unknown
}

export interface VariantRow {
  id: string
  product_id: string
  sku: string
  variant_name: string
  uom_id: number
  [key: string]: unknown
}

export interface VariantPriceRow {
  variant_id: string
  price_list_id: number
  price: number
}

export interface TableLayout {
  table_name: string
  columns: ColumnDef[]
}
```

### 5.2 EntityWorkspace Changes

```typescript
export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  // Fetch table layout
  const { data: layout } = useQuery({
    queryKey: ['schema', entityType, 'layout'],
    queryFn: () => commands.getTableLayout(entityType),
    staleTime: Infinity,
  })

  // Fetch entity data
  const { data: rows, isLoading } = useQuery({
    queryKey: ['entity', entityType, 'data'],
    queryFn: () => commands.getAll(entityType),
  })

  // Expanded row state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [variantsCache, setVariantsCache] = useState<Map<string, VariantRow[]>>(new Map())

  const handleRowToggleExpand = useCallback(async (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
      // Fetch variants if not cached
      if (!variantsCache.has(id)) {
        const variants = await commands.variants::getByProduct(id)
        setVariantsCache(prev => new Map(prev).set(id, variants))
      }
    }
    setExpandedIds(newExpanded)
  }, [expandedIds, variantsCache])

  const columns = layout?.columns ?? getDefaultColumns(entityType)

  return (
    <DataTableShell
      columns={columns}
      data={rows ?? []}
      expandedRowIds={expandedIds}
      variantsCache={variantsCache}
      onRowToggleExpand={handleRowToggleExpand}
      // ... other props
    />
  )
}
```

### 5.3 DataTable Changes

Add expanded row rendering using TanStack Table's `renderDetailPanel`:

```typescript
const table = useReactTable({
  data,
  columns: tableColumns,
  getCoreRowModel: getCoreRowModel(),
  getRowCanExpand: () => true,  // Enable expansion
  // ... other config
})

// In JSX:
{table.getRowModel().rows.map(row => (
  <>
    <tr key={row.id}>{row.getVisibleCells().map(...)}</tr>
    {row.getIsExpanded() && (
      <tr>
        <td colSpan={columns.length}>
          <VariantsSubTable
            variants={variantsCache.get(row.original.id) ?? []}
            isLoading={isLoadingVariants(row.original.id)}
          />
        </td>
      </tr>
    )}
  </>
))}
```

### 5.4 DataTableShell Changes

Add props for expanded rows:

```typescript
interface DataTableShellProps {
  // ... existing
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  onRowToggleExpand?: (id: string) => void
}
```

### 5.5 VariantsSubTable Component

```typescript
function VariantsSubTable({ variants, isLoading }: VariantsSubTableProps) {
  if (isLoading) return <Skeleton className="h-20 w-full" />

  const variantColumns = [
    { id: 'sku', label: 'SKU', type: 'text' as const, width: 120, sortable: true, filterable: true, visible: true, order: 1 },
    { id: 'variant_name', label: 'Variant Name', type: 'text' as const, width: 180, sortable: true, filterable: true, visible: true, order: 2 },
    { id: 'uom_id', label: 'UOM', type: 'text' as const, width: 80, sortable: false, filterable: false, visible: true, order: 3 },
    { id: 'retail_price', label: 'Retail', type: 'currency' as const, width: 100, sortable: false, filterable: false, visible: true, order: 4 },
    { id: 'wholesale_price', label: 'Wholesale', type: 'currency' as const, width: 100, sortable: false, filterable: false, visible: true, order: 5 },
    { id: 'dist_price', label: 'Distribution', type: 'currency' as const, width: 100, sortable: false, filterable: false, visible: true, order: 6 },
  ]

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr>
            {variantColumns.map(col => (
              <th key={col.id} className="px-3 py-1 text-left text-on-surface-variant font-label-caps">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map(v => (
            <tr key={v.id} className="border-t border-outline-variant/30">
              <td className="px-3 py-1">{v.sku}</td>
              <td className="px-3 py-1">{v.variant_name}</td>
              <td className="px-3 py-1">{v.uom_id}</td>
              <td className="px-3 py-1">{formatPrice(v.prices?.retail)}</td>
              <td className="px-3 py-1">{formatPrice(v.prices?.wholesale)}</td>
              <td className="px-3 py-1">{formatPrice(v.prices?.dist)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## 6. File Manifest

### New Files

| File                                         | Purpose                               |
| -------------------------------------------- | ------------------------------------- |
| `src-tauri/src/commands/products.rs`         | Product CRUD commands                 |
| `src-tauri/src/commands/variants.rs`         | Variant CRUD + get_by_product         |
| `src-tauri/src/commands/prices.rs`           | Price CRUD + get_by_variant           |
| `src-tauri/src/commands/schema.rs`           | Table layout + init tables            |
| `src/components/entity/VariantsSubTable.tsx` | Nested variants table in expanded row |

### Modified Files

| File                                        | Change                                                              |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `src-tauri/src/commands/mod.rs`             | Export new command modules                                          |
| `src-tauri/src/bindings.rs`                 | Add new commands to specta builder                                  |
| `src-tauri/src/types.rs`                    | Add Product, Variant, VariantPrice, TableLayout types               |
| `src/lib/types/entity.ts`                   | Add ProductRow, VariantRow, VariantPriceRow, TableLayout interfaces |
| `src/components/entity/DataTable.tsx`       | Add expanded row rendering                                          |
| `src/components/entity/DataTableShell.tsx`  | Add expanded row state management                                   |
| `src/components/entity/EntityWorkspace.tsx` | Connect to TanStack Query, fetch data, handle expansion             |

## 7. Implementation Phases

### Phase 1: Rust Commands

- [ ] Create `products.rs` with full CRUD
- [ ] Create `variants.rs` with CRUD + `get_by_product`
- [ ] Create `prices.rs` with CRUD + `get_by_variant`
- [ ] Create `schema.rs` with `get_table_layout` + `init_product_tables`
- [ ] Update `mod.rs` exports
- [ ] Update `bindings.rs` with new commands
- [ ] Test commands with Tauri dev console

### Phase 2: Frontend Integration

- [ ] Update types in `entity.ts`
- [ ] Wire `EntityWorkspace` to use queries instead of mock data
- [ ] Add expanded row state to `DataTableShell`
- [ ] Implement `VariantsSubTable` component
- [ ] Add expansion toggle to `DataTable`

### Phase 3: Polish

- [ ] Loading states for expanded rows
- [ ] Error handling for failed variant fetches
- [ ] Cache invalidation on create/update/delete

## 8. Reference

- TanStack Table expansion: https://tanstack.com/table/latest/docs/framework/react/examples/expanding
- Existing rusql pattern: `src-tauri/src/commands/user.rs`
- tauri-specta: `src-tauri/src/bindings.rs`
