# Entity Validation Design

## Overview

Add Zod-based validation to Products, Variants, and Warehouses CRUD operations on both frontend and backend layers.

## Goals

- Improve UX with immediate inline validation feedback
- Add defense-in-depth with backend validation
- Keep validation rules consistent between layers

## File Structure

```
src/lib/validation/
├── schemas.ts      # Zod schemas (frontend)
├── types.ts        # Shared TypeScript types
src-tauri/src/validation/
├── rules.rs        # Rust validation functions
├── lib.rs          # Module exports
```

## Validation Rules

### Product

| Field | Rule |
|-------|------|
| company | required, 1-100 chars |
| name | required, 1-200 chars |
| category | required, 1-100 chars |

### Variant

| Field | Rule |
|-------|------|
| sku | required, 1-50 chars, alphanumeric + dashes |
| variant_name | required, 1-200 chars |
| uom_id | optional, max 50 chars |
| retail_price | optional, >= 0, max 2 decimal places |
| wholesale_price | optional, >= 0, max 2 decimal places |
| distribution_price | optional, >= 0, max 2 decimal places |

### Warehouse

| Field | Rule |
|-------|------|
| name | required, 1-100 chars |
| location | required, 1-200 chars |

## Implementation

### Frontend (Zod)

Create `src/lib/validation/schemas.ts` with Zod schemas for each entity's create and update forms. On submit, validate and display inline errors per field.

### Backend (Rust)

Create `src-tauri/src/validation/` with `rules.rs` containing `validate_*` functions returning `Result<(), String>`. Each CRUD command calls its validator before processing.

### Error Flow

1. User submits form → Zod validates → invalid fields show inline errors
2. If valid, command invokes Rust → backend validates again → error returns as `Result<T, String>` → frontend shows toast

## Components to Update

### Create Modals
- `ProductCreateModal.tsx`
- `VariantCreateModal.tsx`
- `WarehouseCreateModal.tsx`

### Detail Modals (Edit)
- `ProductDetailModal.tsx`
- `VariantDetailModal.tsx`
- `WarehouseDetailModal.tsx`

## Testing

- Unit tests for Rust validation functions
- Validation error display tests for each form