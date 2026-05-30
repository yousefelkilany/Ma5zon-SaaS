# Entity Layout i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dynamic schema fetching with frontend-defined i18n-backed column layouts.

**Architecture:** Column layouts defined in i18n files (`locales/en.json`, `locales/ar.json`) under `entity.layout.<entityType>.columns`. A `getEntityLayout()` resolver maps these to `ColumnDef[]`. DataTable updated to use i18n for localized currency symbols.

**Tech Stack:** React 19, TanStack Query, react-i18next, TypeScript

---

## File Structure

- **Modify:** `locales/en.json` — add `entity.layout` namespace with all entity column configs
- **Modify:** `locales/ar.json` — add Arabic translations for entity layouts
- **Create:** `src/lib/entity-layout.ts` — `getEntityLayout()` resolver
- **Modify:** `src/components/entity/DataTable.tsx` — use i18n for currency prefix in `DataCell`
- **Modify:** `src/components/entity/EntityWorkspace.tsx` — replace `getTableInfo` query with `getEntityLayout()`

---

## Tasks

### Task 1: Add i18n Layouts (English)

**Files:**

- Modify: `locales/en.json`

- [ ] **Step 1: Add `entity.layout` namespace to en.json**

Add the following under the `entity` key in `locales/en.json`. Merge with existing structure — do not replace.

```json
{
  "entity": {
    "layout": {
      "products": {
        "label": "Products",
        "columns": {
          "name": {
            "label": "Product Name",
            "type": "text",
            "width": 200
          },
          "category": {
            "label": "Category",
            "type": "text",
            "width": 120
          },
          "unit_price": {
            "label": "Unit Price",
            "type": "currency",
            "width": 120
          },
          "qty_in_stock": {
            "label": "Qty in Stock",
            "type": "number",
            "width": 100
          }
        }
      },
      "warehouses": {
        "label": "Warehouses",
        "columns": {
          "name": {
            "label": "Warehouse Name",
            "type": "text",
            "width": 200
          },
          "location": {
            "label": "Location",
            "type": "text",
            "width": 150
          }
        }
      },
      "invoices": {
        "label": "Invoices",
        "columns": {
          "invoice_number": {
            "label": "Invoice #",
            "type": "text",
            "width": 120
          },
          "customer_name": {
            "label": "Customer",
            "type": "text",
            "width": 180
          },
          "total_amount": {
            "label": "Total",
            "type": "currency",
            "width": 120
          },
          "status": {
            "label": "Status",
            "type": "status",
            "width": 100
          },
          "created_at": {
            "label": "Date",
            "type": "text",
            "width": 100
          }
        }
      },
      "customers": {
        "label": "Customers",
        "columns": {
          "name": {
            "label": "Customer Name",
            "type": "text",
            "width": 200
          },
          "email": {
            "label": "Email",
            "type": "text",
            "width": 200
          }
        }
      },
      "bills": {
        "label": "Bills",
        "columns": {
          "bill_number": {
            "label": "Bill #",
            "type": "text",
            "width": 120
          },
          "vendor_name": {
            "label": "Vendor",
            "type": "text",
            "width": 180
          },
          "total_amount": {
            "label": "Total",
            "type": "currency",
            "width": 120
          },
          "status": {
            "label": "Status",
            "type": "status",
            "width": 100
          }
        }
      },
      "vendors": {
        "label": "Vendors",
        "columns": {
          "name": {
            "label": "Vendor Name",
            "type": "text",
            "width": 200
          },
          "email": {
            "label": "Email",
            "type": "text",
            "width": 200
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add locales/en.json
git commit -m "feat(i18n): add entity layout definitions for all entity types"
```

---

### Task 2: Add i18n Layouts (Arabic)

**Files:**

- Modify: `locales/ar.json`

- [ ] **Step 1: Add Arabic translations for entity layouts**

Add the same structure to `locales/ar.json` with Arabic labels:

```json
{
  "entity": {
    "layout": {
      "products": {
        "label": "المنتجات",
        "columns": {
          "name": {
            "label": "اسم المنتج",
            "type": "text",
            "width": 200
          },
          "category": {
            "label": "الفئة",
            "type": "text",
            "width": 120
          },
          "unit_price": {
            "label": "سعر الوحدة",
            "type": "currency",
            "width": 120
          },
          "qty_in_stock": {
            "label": "الكمية في المخزون",
            "type": "number",
            "width": 100
          }
        }
      },
      "warehouses": {
        "label": "المستودعات",
        "columns": {
          "name": {
            "label": "اسم المستودع",
            "type": "text",
            "width": 200
          },
          "location": {
            "label": "الموقع",
            "type": "text",
            "width": 150
          }
        }
      },
      "invoices": {
        "label": "الفواتير",
        "columns": {
          "invoice_number": {
            "label": "رقم الفاتورة",
            "type": "text",
            "width": 120
          },
          "customer_name": {
            "label": "العميل",
            "type": "text",
            "width": 180
          },
          "total_amount": {
            "label": "المجموع",
            "type": "currency",
            "width": 120
          },
          "status": {
            "label": "الحالة",
            "type": "status",
            "width": 100
          },
          "created_at": {
            "label": "التاريخ",
            "type": "text",
            "width": 100
          }
        }
      },
      "customers": {
        "label": "العملاء",
        "columns": {
          "name": {
            "label": "اسم العميل",
            "type": "text",
            "width": 200
          },
          "email": {
            "label": "البريد الإلكتروني",
            "type": "text",
            "width": 200
          }
        }
      },
      "bills": {
        "label": "فواتير الشراء",
        "columns": {
          "bill_number": {
            "label": "رقم الفاتورة",
            "type": "text",
            "width": 120
          },
          "vendor_name": {
            "label": "المورد",
            "type": "text",
            "width": 180
          },
          "total_amount": {
            "label": "المجموع",
            "type": "currency",
            "width": 120
          },
          "status": {
            "label": "الحالة",
            "type": "status",
            "width": 100
          }
        }
      },
      "vendors": {
        "label": "الموردون",
        "columns": {
          "name": {
            "label": "اسم المورد",
            "type": "text",
            "width": 200
          },
          "email": {
            "label": "البريد الإلكتروني",
            "type": "text",
            "width": 200
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add locales/ar.json
git commit -m "feat(i18n): add Arabic translations for entity layouts"
```

---

### Task 3: Create entity-layout.ts Resolver

**Files:**

- Create: `src/lib/entity-layout.ts`
- Test: `src/lib/entity-layout.test.ts`

- [ ] **Step 1: Write tests for getEntityLayout**

```typescript
// src/lib/entity-layout.test.ts
import { describe, it, expect } from 'vitest'
import { getEntityLayout } from './entity-layout'

// Mock i18next TFunction
const mockT = (key: string, opts?: { returnObjects?: boolean }) => {
  const layouts: Record<string, unknown> = {
    'entity.layout.products': {
      label: 'Products',
      columns: {
        name: { label: 'Product Name', type: 'text', width: 200 },
        unit_price: { label: 'Unit Price', type: 'currency', width: 120 },
        id: { label: 'ID', type: 'text', width: 80 }, // should be filtered
      },
    },
    'entity.layout.warehouses': {
      label: 'Warehouses',
      columns: {
        name: { label: 'Warehouse Name', type: 'text', width: 200 },
        location: { label: 'Location', type: 'text', width: 150 },
      },
    },
    'entity.layout.empty': {
      label: 'Empty Entity',
      columns: {},
    },
    'entity.layout.nonexistent': 'not-an-object',
  }

  const result = layouts[key]
  if (!result) return undefined
  if (opts?.returnObjects) return result
  return typeof result === 'object' ? JSON.stringify(result) : result
}

describe('getEntityLayout', () => {
  it('returns ColumnDef array for valid entity', () => {
    const result = getEntityLayout('products', mockT as never)
    expect(result).toHaveLength(2) // id filtered out
    expect(result[0]).toMatchObject({
      id: 'name',
      label: 'Product Name',
      type: 'text',
      width: 200,
      sortable: true,
      filterable: true,
      visible: true,
      order: 1,
      isNameColumn: true,
    })
  })

  it('filters out id, _id, pk, fk_ columns', () => {
    const result = getEntityLayout('products', mockT as never)
    const ids = result.map(c => c.id)
    expect(ids).not.toContain('id')
  })

  it('returns empty array for nonexistent entity', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockReturnValue()
    const result = getEntityLayout('nonexistent', mockT as never)
    expect(result).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith(
      '[entity-layout] No layout found for entity: nonexistent'
    )
    consoleSpy.mockRestore()
  })

  it('returns empty array for invalid layout format', () => {
    const result = getEntityLayout('empty', mockT as never)
    expect(result).toEqual([])
  })

  it('maps currency type correctly', () => {
    const result = getEntityLayout('products', mockT as never)
    const priceCol = result.find(c => c.id === 'unit_price')
    expect(priceCol?.type).toBe('currency')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/entity-layout.test.ts`
Expected: FAIL with "getEntityLayout is not a function"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/entity-layout.ts
import type { ColumnDef } from './types/entity'
import type { TFunction } from 'i18next'

const SKIP_COLUMNS = ['id', '_id', 'pk', 'fk_']

export function getEntityLayout(entityType: string, t: TFunction): ColumnDef[] {
  const layout = t(`entity.layout.${entityType}`, { returnObjects: true })

  if (!layout || typeof layout !== 'object') {
    console.warn(`[entity-layout] No layout found for entity: ${entityType}`)
    return []
  }

  const columns = layout.columns as Record<
    string,
    { label: string; type: string; width: number }
  >

  return Object.entries(columns)
    .filter(([key]) => {
      const lower = key.toLowerCase()
      return !SKIP_COLUMNS.some(skip => lower === skip || lower.endsWith(skip))
    })
    .map(([key, config], index) => ({
      id: key,
      label: config.label,
      type: config.type as ColumnDef['type'],
      width: config.width,
      sortable: true,
      filterable: true,
      visible: true,
      order: index + 1,
      isNameColumn: index === 0,
    }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/entity-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/entity-layout.ts src/lib/entity-layout.test.ts
git commit -m "feat(entity): add getEntityLayout resolver for i18n-backed column configs"
```

---

### Task 4: Update DataTable for Localized Currency

**Files:**

- Modify: `src/components/entity/DataTable.tsx`

- [ ] **Step 1: Update DataCell to use i18n for currency prefix**

Read lines 36-58 of `src/components/entity/DataTable.tsx`. The `DataCell` function currently has:

```typescript
function DataCell({ column, value }: { column: ColumnDef; value: unknown }) {
  if (column.type === 'status') {
    return <StatusBadge status={String(value)} />
  }
  if (column.type === 'currency') {
    return (
      <span className="font-data-tabular tabular-nums">
        ${' '}
        {(Number(value) || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}
      </span>
    )
  }
  // ... rest
}
```

Replace the entire `DataCell` function with:

```typescript
function DataCell({ column, value }: { column: ColumnDef; value: unknown }) {
  const { t } = useTranslation()

  if (column.type === 'status') {
    return <StatusBadge status={String(value)} />
  }
  if (column.type === 'currency') {
    const currencySymbol = t('common.currency')
    return (
      <span className="font-data-tabular tabular-nums">
        {currencySymbol}{' '}
        {(Number(value) || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}
      </span>
    )
  }
  if (column.type === 'number') {
    return (
      <span className="font-data-tabular tabular-nums text-right">
        {Number(value).toLocaleString()}
      </span>
    )
  }
  return <span>{String(value)}</span>
}
```

Note: `useTranslation` is already imported at the top of DataTable.tsx, so no new import needed.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck` (or `npx tsc --noEmit`)
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/DataTable.tsx
git commit -m "feat(entity): use i18n for localized currency prefix in DataCell"
```

---

### Task 5: Update EntityWorkspace to Use getEntityLayout

**Files:**

- Modify: `src/components/entity/EntityWorkspace.tsx`

**Prerequisites:** Ensure `warehouses_get_all` command is exported in Rust and bindings are regenerated (`npm run rust:bindings`). If `commands.warehousesGetAll()` doesn't exist in `src/lib/bindings.ts`, run `npm run rust:bindings` first.

- [ ] **Step 1: Read current EntityWorkspace implementation**

Read the full file at `src/components/entity/EntityWorkspace.tsx`. You need to:

1. Add `useMemo` to the React import
2. Import `getEntityLayout` from `@/lib/entity-layout`
3. Remove the `getTableInfo` query and `convertTableLayout` function
4. Replace with `getEntityLayout` call
5. Add `warehouses` to the entity switch statement

- [ ] **Step 2: Update imports**

Change the import from:

```typescript
import { useState, useCallback } from 'react'
```

To:

```typescript
import { useState, useCallback, useMemo } from 'react'
```

Add the `getEntityLayout` import:

```typescript
import { getEntityLayout } from '@/lib/entity-layout'
```

- [ ] **Step 3: Replace the tableLayout query and convertTableLayout with getEntityLayout**

Remove the `convertTableLayout` function (lines 93-120).

Replace the `tableLayout` query (around lines 178-186):

```typescript
const { data: tableLayout } = useQuery({
  queryKey: ['tableLayout', entityType],
  queryFn: async () => {
    console.log(`[EntityWorkspace] Fetching table layout for: ${entityType}`)
    const result = await commands.getTableInfo(entityType)
    console.log(`[EntityWorkspace] getTableInfo result:`, result)
    return unwrapResult(result)
  },
})

console.log(`[EntityWorkspace] tableLayout state:`, tableLayout)

const productColumns: ColumnDef[] = tableLayout
  ? convertTableLayout(tableLayout)
  : []
```

With:

```typescript
// Column layout from i18n (replaces getTableInfo query)
const columns: ColumnDef[] = useMemo(
  () => getEntityLayout(entityType, t),
  [entityType, t]
)
```

- [ ] **Step 4: Add warehouses case to entity fetch switch**

Update the switch statement in the queryFn to include warehouses:

```typescript
const { data: entityData, isLoading } = useQuery({
  queryKey: ['entity', entityType],
  queryFn: async () => {
    switch (entityType) {
      case 'products':
        return commands.getAll()
      case 'warehouses':
        return commands.warehousesGetAll()
      default:
        return Promise.resolve([])
    }
  },
})
```

Note: `commands.warehousesGetAll()` assumes the tauri-specta bindings will be regenerated after adding `warehouses` module exports. If the command name differs, adjust accordingly.

- [ ] **Step 5: Update references from `products` to `columns`/`entityData`**

Replace `products ?? []` with `entityData ?? []` in the DataTableShell props.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: No errors (may need to regenerate bindings first if warehousesGetAll is not found)

- [ ] **Step 7: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "feat(entity): replace getTableInfo with getEntityLayout for i18n-backed columns"
```

---

## Verification

After all tasks:

1. **Run all tests:** `npm test`
2. **Run typecheck:** `npm run typecheck`
3. **Run linter:** `npm run lint`
4. **Start dev server:** Ask user to run `npm run dev` and verify:
   - Products table shows "Product Name", "Category", "Unit Price" (not raw DB names)
   - Warehouses table shows "Warehouse Name", "Location"
   - Currency displays "EGP" in English, "جنيه مصري" in Arabic
   - Switching language updates column headers and currency symbol

---

## Spec Coverage Check

| Spec Requirement            | Task              |
| --------------------------- | ----------------- |
| i18n column layouts         | Task 1, Task 2    |
| getEntityLayout resolver    | Task 3            |
| DataTable i18n currency     | Task 4            |
| EntityWorkspace integration | Task 5            |
| Remove convertTableLayout   | Task 5            |
| Keep getTableInfo command   | N/A (not removed) |
