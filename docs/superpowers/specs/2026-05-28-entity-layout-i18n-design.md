# Entity Layout i18n Design

**Date:** 2026-05-28
**Status:** Approved

## Overview

Replace dynamic schema fetching (backend `getTableInfo`) with frontend-defined explicit column layouts stored in i18n files. This gives user-friendly translated column names and full control over which columns display, their order, types, and widths — without duplicating translations between backend and frontend.

## Goals

- User-friendly column labels (translated, not raw DB names like `product_name`)
- Full control over column order, visibility, type, and width
- No duplicate translation files between backend and frontend
- Backend returns all columns; frontend layout decides what to display
- Hidden columns (id, fk_, pk) available for edit operations but not shown

## Non-Goals

- Backend-driven layout config (avoids duplication risk)
- Runtime column customization beyond visibility/reorder (already implemented via `ColumnVisibilityDialog`)

---

## i18n Structure

### File: `locales/en.json` and `locales/ar.json`

Add `entity.layout` namespace:

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

### Column Type Mappings

| i18n type  | TanStack Column Type | Display |
|-------------|---------------------|---------|
| `text`      | `text`              | Plain string |
| `number`    | `number`            | Right-aligned tabular nums |
| `currency`  | `currency`          | Localized currency prefix (e.g., "EGP" / "جنيه مصري"), 2 decimal places |
| `status`    | `status`            | Colored badge |

**Currency prefix:** The `common.currency` i18n key is used for the currency symbol. In `DataTable`, the currency cell renderer looks up `t('common.currency')` at render time, so it automatically uses the correct localized prefix.

---

### Modified: `src/components/entity/DataTable.tsx`

Update the `DataCell` component to use i18n for currency prefix:

```typescript
// DataTable.tsx - DataCell component (around line 36)
function DataCell({ column, value }: { column: ColumnDef; value: unknown }) {
  const { t } = useTranslation()

  if (column.type === 'currency') {
    const currencySymbol = t('common.currency') // "EGP" or "جنيه مصري"
    return (
      <span className="font-data-tabular tabular-nums">
        {currencySymbol}{' '}
        {(Number(value) || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}
      </span>
    )
  }
  // ... rest unchanged
}
```

Note: `useTranslation` is already imported in DataTable.tsx.

---

## Type Changes

### File: `src/lib/types/entity.ts`

No changes to `ColumnDef` interface — existing fields sufficient:

```typescript
interface ColumnDef {
  id: string
  label: string
  type: 'text' | 'number' | 'currency' | 'status'
  width: number
  sortable: boolean
  filterable: boolean
  visible: boolean
  order: number
  isNameColumn?: boolean
}
```

Labels come from i18n at render time via `getEntityLayout()`.

---

## Layout Resolver

### New File: `src/lib/entity-layout.ts`

```typescript
import type { ColumnDef } from './types/entity'
import type { TFunction } from 'i18next'

const SKIP_COLUMNS = ['id', '_id', 'pk', 'fk_']

export function getEntityLayout(
  entityType: string,
  t: TFunction
): ColumnDef[] {
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

---

## Integration

### Modified: `src/components/entity/EntityWorkspace.tsx`

Remove `getTableInfo` query and `convertTableLayout`, replace with `getEntityLayout`:

```typescript
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { getEntityLayout } from '@/lib/entity-layout'
import type { EntityWorkspaceProps, ColumnDef, VariantRow } from '@/lib/types/entity'
import { DataTableShell } from './DataTableShell'

export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  const { t } = useTranslation()

  // Products data — fetch function determined by entityType
  // Note: Only products fetch is implemented. Other entities (warehouses,
  // invoices, customers, bills, vendors) return empty arrays until their
  // fetch commands are added.
  const { data: entityData, isLoading } = useQuery({
    queryKey: ['entity', entityType],
    queryFn: async () => {
      switch (entityType) {
        case 'products':
          return commands.products.getAll()
        // Other entity fetch commands to be added as they're implemented
        default:
          return Promise.resolve([])
      }
    },
  })

  // Column layout from i18n (replaces getTableInfo query)
  const columns: ColumnDef[] = useMemo(
    () => getEntityLayout(entityType, t),
    [entityType, t]
  )

  // ... rest unchanged
}
```

### Remove: `convertTableLayout` function

Delete the function at `EntityWorkspace.tsx:93-120`. It's no longer needed.

### Keep: `getTableInfo` command

Keep the Rust command and TypeScript binding — it may be useful for admin/debug tools that need raw schema info.

---

## Migration Path

1. **Add i18n layouts** for all entity types (`products`, `warehouses`, `invoices`, `customers`, `bills`, `vendors`)
2. **Add `getEntityLayout`** to `src/lib/entity-layout.ts`
3. **Update EntityWorkspace** to use `getEntityLayout` instead of `useQuery(['tableLayout'])` and `convertTableLayout`
4. **Remove** the `tableLayout` query and `convertTableLayout` function
5. **Verify** DataTable renders correct labels and types

---

## Error Handling

- If no layout found for entity type, `getEntityLayout` logs warning and returns empty array
- DataTable handles empty columns array gracefully (shows headers only)
- Backend column names (e.g., `customer_name`) map to layout keys by exact match

---

## Scope

This spec covers only the entity table layout system. It does not include:
- Editing individual entity rows (detail modal)
- Filtering or sorting logic (server-side, unchanged)
- Pagination (unchanged)
- CSV export column headers (may need separate handling)
