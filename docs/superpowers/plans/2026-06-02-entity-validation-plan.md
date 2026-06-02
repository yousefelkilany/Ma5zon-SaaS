# Entity Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Zod validation on frontend and Rust validation on backend for Products, Variants, and Warehouses CRUD operations.

**Architecture:** Shared validation layer - Zod schemas in `src/lib/validation/` for frontend, Rust functions in `src-tauri/src/validation/` for backend. Each command will validate before processing.

**Tech Stack:** Zod (already in package.json), Rust validation functions, React hooks for form validation.

---

## File Structure

```
src/lib/validation/
├── schemas.ts      # Zod schemas for all entities
├── types.ts        # Validation result types
src-tauri/src/validation/
├── rules.rs        # Rust validation functions
├── lib.rs          # Module exports
```

---

## Task 1: Create Frontend Validation Schemas

**Files:**
- Create: `src/lib/validation/types.ts`
- Create: `src/lib/validation/schemas.ts`

- [ ] **Step 1: Write failing test for validation types**

```typescript
// src/lib/validation/validation.test.ts
import { describe, it, expect } from 'vitest';
import { createProductSchema, createVariantSchema, createWarehouseSchema } from './schemas';

describe('Product validation', () => {
  it('accepts valid product data', () => {
    const result = createProductSchema.safeParse({
      company: 'Acme Corp',
      name: 'Widget',
      category: 'Electronics',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty company', () => {
    const result = createProductSchema.safeParse({
      company: '',
      name: 'Widget',
      category: 'Electronics',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/validation/validation.test.ts`
Expected: FAIL - file doesn't exist

- [ ] **Step 3: Create validation types**

```typescript
// src/lib/validation/types.ts
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
}
```

- [ ] **Step 4: Create Zod schemas**

```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod';

const NONEMPTY_MSG = 'This field is required';
const MAX_CHARS_MSG = (max: number) => `Must be ${max} characters or less`;

export const createProductSchema = z.object({
  company: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
  name: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
  category: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  sku: z.string().min(1, NONEMPTY_MSG).max(50, MAX_CHARS_MSG(50)).regex(/^[a-zA-Z0-9-]+$/, 'Must be alphanumeric with dashes only'),
  variant_name: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
  uom_id: z.string().max(50, MAX_CHARS_MSG(50)).optional(),
  retail_price: z.number().min(0, 'Must be 0 or greater').max(999999999, 'Too large').optional(),
  wholesale_price: z.number().min(0, 'Must be 0 or greater').max(999999999, 'Too large').optional(),
  distribution_price: z.number().min(0, 'Must be 0 or greater').max(999999999, 'Too large').optional(),
});

export const updateVariantSchema = createVariantSchema.partial();

export const createWarehouseSchema = z.object({
  name: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
  location: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/lib/validation/validation.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation/
git commit -m "feat: add frontend validation schemas and types"
```

---

## Task 2: Create Rust Validation Rules

**Files:**
- Create: `src-tauri/src/validation/rules.rs`
- Create: `src-tauri/src/validation/lib.rs`
- Modify: `src-tauri/src/lib.rs` - add validation module

- [ ] **Step 1: Write failing test for Rust validation**

```rust
// src-tauri/src/validation/rules_test.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_product_valid() {
        let result = validate_product("Acme Corp", "Widget", "Electronics");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_product_empty_company() {
        let result = validate_product("", "Widget", "Electronics");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "company: required");
    }

    #[test]
    fn test_validate_product_company_too_long() {
        let result = validate_product(&"x".repeat(101), "Widget", "Electronics");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "company: must be 100 characters or less");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test validation -- --nocapture`
Expected: FAIL - module doesn't exist

- [ ] **Step 3: Create validation rules**

```rust
// src-tauri/src/validation/rules.rs
pub fn validate_product(company: &str, name: &str, category: &str) -> Result<(), String> {
    if company.trim().is_empty() {
        return Err("company: required".to_string());
    }
    if company.len() > 100 {
        return Err("company: must be 100 characters or less".to_string());
    }
    if name.trim().is_empty() {
        return Err("name: required".to_string());
    }
    if name.len() > 200 {
        return Err("name: must be 200 characters or less".to_string());
    }
    if category.trim().is_empty() {
        return Err("category: required".to_string());
    }
    if category.len() > 100 {
        return Err("category: must be 100 characters or less".to_string());
    }
    Ok(())
}

pub fn validate_variant(
    sku: &str,
    variant_name: &str,
    uom_id: Option<&str>,
    retail_price: f64,
    wholesale_price: f64,
    distribution_price: f64,
) -> Result<(), String> {
    if sku.trim().is_empty() {
        return Err("sku: required".to_string());
    }
    if sku.len() > 50 {
        return Err("sku: must be 50 characters or less".to_string());
    }
    if !sku.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("sku: must be alphanumeric with dashes only".to_string());
    }
    if variant_name.trim().is_empty() {
        return Err("variant_name: required".to_string());
    }
    if variant_name.len() > 200 {
        return Err("variant_name: must be 200 characters or less".to_string());
    }
    if let Some(uom) = uom_id {
        if uom.len() > 50 {
            return Err("uom_id: must be 50 characters or less".to_string());
        }
    }
    if retail_price < 0.0 {
        return Err("retail_price: must be 0 or greater".to_string());
    }
    if wholesale_price < 0.0 {
        return Err("wholesale_price: must be 0 or greater".to_string());
    }
    if distribution_price < 0.0 {
        return Err("distribution_price: must be 0 or greater".to_string());
    }
    Ok(())
}

pub fn validate_warehouse(name: &str, location: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("name: required".to_string());
    }
    if name.len() > 100 {
        return Err("name: must be 100 characters or less".to_string());
    }
    if location.trim().is_empty() {
        return Err("location: required".to_string());
    }
    if location.len() > 200 {
        return Err("location: must be 200 characters or less".to_string());
    }
    Ok(())
}
```

- [ ] **Step 4: Create module file**

```rust
// src-tauri/src/validation/lib.rs
pub mod rules;

pub use rules::*;
```

- [ ] **Step 5: Add validation module to lib.rs**

Add after existing module declarations in `src-tauri/src/lib.rs`:
```rust
pub mod validation;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd src-tauri && cargo test validation -- --nocapture`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/validation/
git add src-tauri/src/lib.rs
git commit -m "feat: add Rust validation rules for entities"
```

---

## Task 3: Integrate Frontend Validation into Create Modals

**Files:**
- Modify: `src/components/entity/ProductCreateModal.tsx`
- Modify: `src/components/entity/VariantCreateModal.tsx`
- Modify: `src/components/entity/WarehouseCreateModal.tsx`

- [ ] **Step 1: Add validation to ProductCreateModal**

Add import for schema and use safeParse in handleSubmit:
```typescript
import { createProductSchema } from '@/lib/validation/schemas'

// In handleSubmit, replace simple check with:
const result = createProductSchema.safeParse({ company, name, category })
if (!result.success) {
  const errors = result.error.flatten().fieldErrors
  // Set error states per field
  return
}
```

- [ ] **Step 2: Add validation to VariantCreateModal**

Add import for schema and validate all fields including prices.

- [ ] **Step 3: Add validation to WarehouseCreateModal**

Add import for schema and validate name and location.

- [ ] **Step 4: Run typecheck and tests**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/ProductCreateModal.tsx
git add src/components/entity/VariantCreateModal.tsx
git add src/components/entity/WarehouseCreateModal.tsx
git commit -m "feat: add Zod validation to create modals"
```

---

## Task 4: Integrate Backend Validation into Rust Commands

**Files:**
- Modify: `src-tauri/src/commands/products.rs`
- Modify: `src-tauri/src/commands/variants.rs`
- Modify: `src-tauri/src/commands/warehouses.rs`

- [ ] **Step 1: Add validation to products create command**

Add at start of create function:
```rust
validate_product(&company, &name, &category)?;
```

- [ ] **Step 2: Add validation to products update command**

Add at start of update function:
```rust
validate_product(&company, &name, &category)?;
```

- [ ] **Step 3: Add validation to variants commands**

Add to variants_create and variants_update:
```rust
validate_variant(
    &variant.sku,
    &variant.variant_name,
    Some(&variant.uom_id),
    variant.retail_price,
    variant.wholesale_price,
    variant.distribution_price,
)?;
```

- [ ] **Step 4: Add validation to warehouse commands**

Add to warehouses_create and warehouses_update:
```rust
validate_warehouse(&name, &location)?;
```

- [ ] **Step 5: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/products.rs
git add src-tauri/src/commands/variants.rs
git add src-tauri/src/commands/warehouses.rs
git commit -m "feat: add backend validation to entity commands"
```

---

## Task 5: Integrate Validation into Detail Modals (Edit Mode)

**Files:**
- Modify: `src/components/entity/ProductDetailModal.tsx`
- Modify: `src/components/entity/VariantDetailModal.tsx`
- Modify: `src/components/entity/WarehouseDetailModal.tsx`

- [ ] **Step 1: Add update schema validation to ProductDetailModal**

Import updateProductSchema and validate before calling handleSave.

- [ ] **Step 2: Add update schema validation to VariantDetailModal**

Import updateVariantSchema and validate all fields.

- [ ] **Step 3: Add update schema validation to WarehouseDetailModal**

Import updateWarehouseSchema and validate before calling handleSave.

- [ ] **Step 4: Run typecheck and tests**

Run: `pnpm run typecheck && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/ProductDetailModal.tsx
git add src/components/entity/VariantDetailModal.tsx
git add src/components/entity/WarehouseDetailModal.tsx
git commit -m "feat: add validation to detail modal edit functions"
```

---

## Task 6: Run Full Quality Gates

- [ ] **Step 1: Run check:all**

Run: `pnpm run check:all`
Expected: All checks pass

- [ ] **Step 2: Fix any issues**

Fix as needed and repeat step 1

- [ ] **Step 3: Final commit if needed**

---

## Validation Rules Reference

| Entity | Field | Rule |
|--------|-------|------|
| Product | company | required, 1-100 chars |
| Product | name | required, 1-200 chars |
| Product | category | required, 1-100 chars |
| Variant | sku | required, 1-50 chars, alphanumeric + dashes |
| Variant | variant_name | required, 1-200 chars |
| Variant | uom_id | optional, max 50 chars |
| Variant | prices | optional, >= 0 |
| Warehouse | name | required, 1-100 chars |
| Warehouse | location | required, 1-200 chars |