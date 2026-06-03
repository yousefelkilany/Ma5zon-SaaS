# Entity Form System Design

**Date:** 2026-06-03
**Status:** Approved

## Overview

Greenfield replacement of entity create/edit forms using TanStack Form and Zod schemas. Replaces fragmented existing modals with a unified, reusable field component system.

## Architecture

### Directory Structure

```
src/components/entity-form/
├── fields/
│   ├── TextField.tsx       # Text input wrapper
│   ├── NumberField.tsx     # Numeric input with constraints
│   └── SelectField.tsx     # Dropdown selection
├── ProductForm.tsx          # Create/edit product form
├── VariantForm.tsx          # Create/edit variant form
├── WarehouseForm.tsx       # Create/edit warehouse form
└── StockMovementForm.tsx   # Stock movement form (create only)
```

### Core Principles

1. **Field components are self-contained** — use `useFormContext()` internally, ready to use in any TanStack Form without children or render props
2. **Entity forms are standalone** — no children, render fields internally
3. **FormProvider wraps each entity form** — provides context for child fields
4. **Zod validation fires on submit** — field-level errors display inline on blur
5. **Schema-driven dual-use** — forms accept `schema` prop for create vs update mode

## Field Components

### TextField

Text input with label and inline error display.

**Props:**
- `name: string` — field name for form registration
- `label: string` — display label (i18n key)
- `placeholder?: string`
- `disabled?: boolean`

**Behavior:**
- Uses `useFormContext()` to connect to nearest `FormProvider`
- Shows first error from `field.state.meta.errors[0]`
- No children, no render props

### NumberField

Numeric input with constraint support.

**Props:**
- `name: string`
- `label: string`
- `placeholder?: string`
- `disabled?: boolean`
- `min?: number` — default: 0
- `max?: number`
- `step?: number` — default: 1
- `precision?: number` — decimal places (e.g., 2 for currency)

**Behavior:**
- All numeric constraints are optional with sensible defaults
- `aria-invalid` set when field has errors

### SelectField

Dropdown selection.

**Props:**
- `name: string`
- `label: string`
- `options: { value: string; label: string }[]`
- `placeholder?: string`
- `disabled?: boolean`

## Entity Forms

### ProductForm

**Handles:** `company`, `name`, `category`

**Props:**
- `onSubmit: (values: { company: string; name: string; category: string }) => void`
- `isLoading?: boolean`
- `initialValues?: { company: string; name: string; category: string }`
- `schema?: ZodSchema` — default: `createProductSchema`

**Layout:** 2-column grid

### VariantForm

**Handles:** `sku`, `variant_name`, `uom_id`, `retail_price`, `wholesale_price`, `distribution_price`

**Props:**
- `productId?: string` — required for create, omitted for update
- `onSubmit: (values: VariantValues) => void`
- `isLoading?: boolean`
- `initialValues?: VariantValues`
- `schema?: ZodSchema` — default: `createVariantSchema`

**Layout:**
- Row 1: `sku`, `variant_name`
- Row 2: `uom_id`
- Row 3: `retail_price`, `wholesale_price`, `distribution_price`

### WarehouseForm

**Handles:** `name`, `location`

**Props:**
- `onSubmit: (values: { name: string; location: string }) => void`
- `isLoading?: boolean`
- `initialValues?: { name: string; location: string }`
- `schema?: ZodSchema` — default: `createWarehouseSchema`

**Layout:** 2-column grid

### StockMovementForm

**Handles:** `variant_id`, `from_warehouse_id`, `to_warehouse_id`, `quantity`, `movement_type`

**Props:**
- `onSubmit: (values: StockMovementValues) => void`
- `isLoading?: boolean`

**Behavior:**
- Create only — no update form
- Movement type toggle (Transfer, Adjustment, etc.) conditionally shows from/to fields
- Uses `stockMovementSchema` for submit validation

## Validation Pattern

1. Zod schema provided to form's `validators.onSubmit`
2. Field-level errors: TanStack Form tracks touched state, errors display on blur
3. Submit blocked until all fields valid
4. Server errors handled by parent via `onSubmit` result

## Dual-Use Pattern

```tsx
// Create mode
<ProductForm onSubmit={handleCreate} />

// Update mode
<ProductForm
  onSubmit={handleUpdate}
  initialValues={{ company: 'Acme', name: 'Widget', category: 'Goods' }}
  schema={updateProductSchema}
/>
```

## Extending with New Entity Types

To add a new entity form:

1. Create Zod schema in `src/lib/validation/schemas.ts` (if not exists)
2. Create new `EntityForm.tsx` in `src/components/entity-form/`
3. Import and use existing field components
4. Follow dual-use pattern with `schema` and `initialValues` props
5. Add tests for form submission and validation

## Migration Plan

1. Build field components (TextField, NumberField, SelectField)
2. Build ProductForm, VariantForm, WarehouseForm
3. Build StockMovementForm
4. Build modal wrappers for each form
5. Replace existing modals incrementally
6. Add tests

## Files to Create/Modify

**New files:**
- `src/components/entity-form/fields/TextField.tsx`
- `src/components/entity-form/fields/NumberField.tsx`
- `src/components/entity-form/fields/SelectField.tsx`
- `src/components/entity-form/ProductForm.tsx`
- `src/components/entity-form/VariantForm.tsx`
- `src/components/entity-form/WarehouseForm.tsx`
- `src/components/entity-form/StockMovementForm.tsx`

**Schemas (already exist):**
- `createProductSchema`, `updateProductSchema`
- `createVariantSchema`, `updateVariantSchema`
- `createWarehouseSchema`, `updateWarehouseSchema`
- `stockMovementSchema`
