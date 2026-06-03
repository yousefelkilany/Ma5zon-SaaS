# Entity Forms Integration & Stock Transfer Design

**Date:** 2026-06-03
**Status:** Approved

---

## 1. Overview

Replace custom inline forms across entity modals with reusable form components from `src/components/entity-form/`, and add inline stock transfer functionality to `StockLevelsTable`.

---

## 2. Replace Custom Forms with Reusable Components

### 2.1 Create Modals → Reusable Forms

| File                       | Form Component    | Notes                                                    |
| -------------------------- | ----------------- | -------------------------------------------------------- |
| `ProductCreateModal.tsx`   | `<ProductForm>`   | Pass empty `initialValues`                               |
| `WarehouseCreateModal.tsx` | `<WarehouseForm>` | Pass empty `initialValues`                               |
| `VariantCreateModal.tsx`   | `<VariantForm>`   | Pass `productId` prop when creating from product context |

**Pattern:**

```tsx
<ProductForm
  onSubmit={handleSubmit}
  isLoading={isSubmitting}
  initialValues={{ company: '', name: '', category: '' }}
/>
```

### 2.2 Detail Modals → Reusable Forms with Initial Values

| File                       | Form Component    | Notes                                             |
| -------------------------- | ----------------- | ------------------------------------------------- |
| `ProductDetailModal.tsx`   | `<ProductForm>`   | Fetch product on mount, pass as `initialValues`   |
| `VariantDetailModal.tsx`   | `<VariantForm>`   | Fetch variant on mount, pass as `initialValues`   |
| `WarehouseDetailModal.tsx` | `<WarehouseForm>` | Fetch warehouse on mount, pass as `initialValues` |

**Pattern:**

```tsx
<ProductForm
  onSubmit={handleSubmit}
  isLoading={isSubmitting}
  initialValues={productData}
/>
```

---

## 3. Stock Transfer Inline UI

**Location:** `StockLevelsTable.tsx`

### 3.1 Views

Both `VariantStockView` and `ProductStockPivot` views have transfer controls.

#### VariantStockView (table)

- Each warehouse row has an arrow icon button
- Clicking expands inline transfer section below that row

#### ProductStockPivot (grid)

- Each cell (warehouse × variant) has a subtle arrow icon
- Clicking expands inline transfer for that warehouse/variant combo

### 3.2 Behavior

- `from_warehouse` is pre-filled with source warehouse and disabled
- `to_warehouse` dropdown shows all OTHER warehouses (excluding source)
- `quantity` field for transfer amount
- Only one transfer section open at a time across the entire table
- Warehouses fetched via `commands.getWarehouses()` → maps to `{ value: id, label: name }[]`

### 3.3 UI

Transfer section renders as an expanded row beneath the source row/cell, containing:

- Hidden/disabled `from_warehouse` field (pre-filled)
- `to_warehouse` select dropdown
- `quantity` number input
- Confirm and Cancel buttons

---

## 4. Unsaved Changes Handling

### 4.1 Scope

All detail modals: `ProductDetailModal`, `VariantDetailModal`, `WarehouseDetailModal`.

### 4.2 Behavior

- Track `isDirty` state (false on mount, true on any field change)
- When dirty, the X (close) button is disabled
- Footer always shows Cancel and Save buttons
- Cancel closes the modal (no confirmation needed — X disabled prevents accidental close)
- Save validates and submits; on success closes the modal

### 4.3 Implementation

```tsx
const [isDirty, setIsDirty] = useState(false)

// On any form field change:
setIsDirty(true)

// Close handler:
const handleClose = () => {
  if (isDirty) return // block close
  onOpenChange(false)
}
```

---

## 5. Files to Modify

| File                                             | Change                                                      |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `src/components/entity/ProductCreateModal.tsx`   | Replace custom form with `<ProductForm>`                    |
| `src/components/entity/WarehouseCreateModal.tsx` | Replace custom form with `<WarehouseForm>`                  |
| `src/components/entity/VariantCreateModal.tsx`   | Replace custom form with `<VariantForm>`                    |
| `src/components/entity/ProductDetailModal.tsx`   | Replace custom form with `<ProductForm>`, add dirty state   |
| `src/components/entity/VariantDetailModal.tsx`   | Replace custom form with `<VariantForm>`, add dirty state   |
| `src/components/entity/WarehouseDetailModal.tsx` | Replace custom form with `<WarehouseForm>`, add dirty state |
| `src/components/entity/StockLevelsTable.tsx`     | Add transfer button and inline transfer UI to both views    |
| `src/components/entity-form/ProductForm.tsx`     | May need `initialValues` support (already has it)           |
| `src/components/entity-form/VariantForm.tsx`     | May need `initialValues` support (already has it)           |
| `src/components/entity-form/WarehouseForm.tsx`   | May need `initialValues` support (already has it)           |

---

## 6. Testing Checklist

- [ ] Create Product modal submits correctly via form
- [ ] Create Warehouse modal submits correctly via form
- [ ] Create Variant modal (from product context) submits with productId
- [ ] Edit Product modal loads data and saves changes
- [ ] Edit Variant modal loads data and saves changes
- [ ] Edit Warehouse modal loads data and saves changes
- [ ] Detail modals block close when form is dirty (X disabled)
- [ ] Detail modal close works when form is clean
- [ ] Transfer button appears on each warehouse row in VariantStockView
- [ ] Transfer button appears on each cell in ProductStockPivot
- [ ] Transfer section shows correct from/to warehouse options
- [ ] Only one transfer section open at a time
- [ ] Transfer submit creates stock movement
